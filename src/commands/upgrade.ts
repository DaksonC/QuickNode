import path from 'node:path';
import { ChangePlan } from '../core/changes.js';
import { compareVersions, CONFIG_FILE, CONFIG_SCHEMA_VERSION, serializeConfig, type QuickNodeConfig } from '../core/config.js';
import { unifiedDiff } from '../core/diff.js';
import { QnError } from '../core/errors.js';
import { readIfExists } from '../core/fs.js';
import { cliVersion } from '../core/paths.js';
import { assertDefaultLayers, detectProject, type PackageJson } from '../core/project.js';
import { hashContent, projectOptions, renderFor } from '../core/render.js';
import { UsageError } from '../spec.js';

export interface UpgradeInput {
  dryRun: boolean;
  /** Apply without asking. */
  yes: boolean;
  /** Also overwrite the files the user changed. */
  force: boolean;
}

/**
 * What upgrading does to one template file:
 * - create: new in the template (or never generated in this project);
 * - update: the user did not change it, so it takes the new content;
 * - unchanged: it already has the new content, or the template did not change it since the
 *   project was generated (the user's own edits are kept);
 * - modified: the user changed it; the new version is saved next to it as <file>.qn-new
 *   (with --force, it is overwritten instead);
 * - deleted: the user removed a generated file; it stays removed;
 * - obsolete: the new template no longer has it; it is kept (never deleted).
 */
export type UpgradeAction = 'create' | 'update' | 'unchanged' | 'modified' | 'deleted' | 'obsolete';

export interface UpgradeFile {
  path: string;
  action: UpgradeAction;
  /** From the project's content to the template's (modified files always, others on dry runs). */
  diff?: string;
  /** Where the new version of a modified file is (or would be) saved. */
  newFile?: string;
  /** With --force, a modified file is overwritten. */
  overwritten?: boolean;
}

export interface UpgradeResult {
  ok: boolean;
  dryRun: boolean;
  /** Files were written (false on dry runs, when cancelled or when there is nothing to do). */
  applied: boolean;
  root: string;
  /** Template version recorded in quicknode.json ("unknown" without one). */
  from: string;
  to: string;
  files: UpgradeFile[];
  notes: string[];
}

export interface UpgradeContext {
  cwd: string;
  /** Asks the person to apply the plan (interactive sessions only). */
  confirm?: (plan: UpgradeResult) => Promise<boolean>;
  /** Version of the CLI (tests replace it). */
  version?: string;
}

/** Suffix of the new version of a file the user changed. */
export const NEW_FILE_SUFFIX = '.qn-new';

export function upgradeInputFromFlags(positionals: string[], values: Record<string, boolean | string | undefined>): UpgradeInput {
  if (positionals.length > 0) throw new UsageError('qn upgrade takes no arguments.', 'upgrade');
  return { dryRun: Boolean(values['dry-run']), yes: Boolean(values.yes), force: Boolean(values.force) };
}

/** Lowest version a range such as "^8.11.3" accepts; undefined when it is not a plain semver range. */
function rangeFloor(range: string): string | undefined {
  return /^[\^~]?(\d+\.\d+\.\d+)$/.exec(range.trim())?.[1];
}

/**
 * Raises the versions of the dependencies the project already has to those of
 * the template. Nothing is added or removed, scripts are left alone and a
 * version is never lowered.
 */
export function upgradeVersions(current: PackageJson, template: PackageJson): { packageJson: PackageJson; raised: string[] } {
  const raised: string[] = [];
  const next: PackageJson = { ...current };
  for (const field of ['dependencies', 'devDependencies'] as const) {
    const mine = current[field];
    const theirs = template[field];
    if (!mine || !theirs) continue;
    const updated = { ...mine };
    for (const [name, wanted] of Object.entries(theirs)) {
      const have = mine[name];
      if (have === undefined || have === wanted) continue;
      const [from, to] = [rangeFloor(have), rangeFloor(wanted)];
      if (from && to && compareVersions(to, from) > 0) {
        updated[name] = wanted;
        raised.push(`${name} ${have} -> ${wanted}`);
      }
    }
    next[field] = updated;
  }
  return { packageJson: next, raised };
}

/**
 * Plans (and, once confirmed, applies) the template of this CLI version on the
 * project that contains `ctx.cwd`. quicknode.json and the hash of each
 * generated file tell the files the user changed from those they did not.
 */
export async function upgrade(input: UpgradeInput, ctx: UpgradeContext): Promise<UpgradeResult> {
  const project = detectProject(ctx.cwd);
  assertDefaultLayers(project, 'upgrade');
  const to = ctx.version ?? cliVersion();
  const from = project.config?.templateVersion ?? 'unknown';
  if (from !== 'unknown' && compareVersions(from, to) > 0) {
    throw new QnError(
      'E_CLI_OUTDATED',
      `The project template is ${from}, newer than this CLI (${to}).`,
      'npx @10565/quicknode-cli@latest upgrade --dry-run'
    );
  }

  const template = await renderFor(project);
  // Projects without quicknode.json (v2) have no hashes: every file that differs counts as changed by the user.
  const recorded = project.config?.files ?? {};
  const plan = new ChangePlan(project.root);
  const files: UpgradeFile[] = [];
  const notes: string[] = [];
  const hashes: Record<string, string> = {};
  const read = (file: string) => readIfExists(path.join(project.root, ...file.split('/')));

  for (const [file, { content, executable }] of template) {
    const current = await read(file);
    const generated = recorded[file];
    const pristine = current !== undefined && generated !== undefined && hashContent(current) === generated;
    // Same hash as when the project was generated: this template version did not change the file.
    const templateUnchanged = generated !== undefined && hashContent(content) === generated;

    if (current === undefined) {
      if (generated !== undefined) {
        files.push({ path: file, action: 'deleted' });
        hashes[file] = generated;
        continue;
      }
      await plan.write(file, content, { mode: executable ? 0o755 : 0o644 });
      files.push({ path: file, action: 'create', ...(input.dryRun ? { diff: unifiedDiff(file, undefined, content) } : {}) });
      hashes[file] = hashContent(content);
    } else if (current === content || templateUnchanged) {
      // Nothing new from the template; the person's own changes (if any) stay as they are.
      files.push({ path: file, action: 'unchanged' });
      hashes[file] = hashContent(content);
    } else if (pristine) {
      await plan.write(file, content, { overwrite: true });
      files.push({ path: file, action: 'update', ...(input.dryRun ? { diff: unifiedDiff(file, current, content) } : {}) });
      hashes[file] = hashContent(content);
    } else if (file === 'package.json') {
      const { packageJson, raised } = upgradeVersions(JSON.parse(current) as PackageJson, JSON.parse(content) as PackageJson);
      const merged = `${JSON.stringify(packageJson, null, 2)}\n`;
      if (raised.length === 0) {
        files.push({ path: file, action: 'unchanged' });
      } else {
        await plan.write(file, merged, { overwrite: true });
        files.push({ path: file, action: 'update', ...(input.dryRun ? { diff: unifiedDiff(file, current, merged) } : {}) });
        notes.push(`package.json: raised ${raised.join(', ')}; run "${project.packageManager} install".`);
      }
      // Still the user's own package.json: the next upgrade merges versions again.
      if (generated !== undefined) hashes[file] = merged === content ? hashContent(content) : generated;
    } else {
      const diff = unifiedDiff(file, current, content);
      if (input.force) {
        await plan.write(file, content, { overwrite: true });
        files.push({ path: file, action: 'modified', diff, overwritten: true });
        hashes[file] = hashContent(content);
      } else {
        const newFile = `${file}${NEW_FILE_SUFFIX}`;
        await plan.write(newFile, content, { overwrite: true });
        files.push({ path: file, action: 'modified', diff, newFile });
        // Keeps the hash of what was generated, so the file still counts as changed by the user.
        if (generated !== undefined) hashes[file] = generated;
      }
    }
  }

  for (const file of Object.keys(recorded)) {
    if (template.has(file) || (await read(file)) === undefined) continue;
    files.push({ path: file, action: 'obsolete' });
    notes.push(`${file} is no longer part of the template; it was kept (delete it if nothing uses it).`);
  }

  const config: QuickNodeConfig = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    templateVersion: to,
    ...projectOptions(project),
    layers: project.layers,
    files: hashes
  };
  await plan.write(CONFIG_FILE, serializeConfig(config), { overwrite: true });

  if (files.some((file) => file.action === 'modified' && !file.overwritten)) {
    notes.push(`Review each ${NEW_FILE_SUFFIX} file, merge what you want into your version and delete it.`);
  }
  if (!project.config) notes.push(`${CONFIG_FILE} is created: commit it, so the next upgrade knows which files you changed.`);

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const pending = plan.list().filter((change) => change.action === 'create' || change.action === 'update');
  const result: UpgradeResult = { ok: true, dryRun: input.dryRun, applied: false, root: project.root, from, to, files, notes };
  if (input.dryRun || pending.length === 0) return result;

  if (!input.yes) {
    if (!ctx.confirm) {
      throw new QnError('E_CONFIRM_REQUIRED', 'qn upgrade changes files: confirm with --yes (review the plan with --dry-run first).');
    }
    if (!(await ctx.confirm(result))) return { ...result, ok: false, notes: [...notes, 'Cancelled: nothing was written.'] };
  }
  await plan.apply();
  return { ...result, applied: true };
}
