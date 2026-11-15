import type { AddResult } from '../commands/add.js';
import type { CheckResult } from '../commands/check.js';
import type { CreateResult } from '../commands/create.js';
import type { DoctorResult } from '../commands/doctor.js';
import type { EnvResult } from '../commands/env.js';
import type { GenerateResult } from '../commands/generate.js';
import type { UpgradeAction, UpgradeResult } from '../commands/upgrade.js';
import type { ChangeAction } from '../core/changes.js';
import { installCommand, runScript } from '../core/variants.js';
import type { Style } from './style.js';

/** Human-readable output of each command (the --json output is the result object itself). */

const TEMPLATE_LABEL = { typescript: 'TypeScript', javascript: 'JavaScript' } as const;
const DATABASE_LABEL = { postgres: 'PostgreSQL', sqlite: 'SQLite', none: 'no database' } as const;

export function renderCreate(result: CreateResult, style: Style, docsUrl: string): string {
  const label = `${result.packageName} (${TEMPLATE_LABEL[result.template]}, ${DATABASE_LABEL[result.db]})`;
  const overwritten = new Set(result.overwritten);
  const lines: string[] = [];

  if (result.dryRun) {
    lines.push(style.accent('Dry run: nothing was written.'));
    lines.push(`Would create ${style.bold(label)} in ${result.targetDir} (${result.files.length} files):`);
    for (const file of result.files) {
      lines.push(overwritten.has(file) ? style.accent(`  ~ ${file} (overwrite)`) : `  + ${file}`);
    }
    if (result.env === 'kept') lines.push(style.muted('  = .env (existing file kept)'));
    if (result.steps.length > 0) lines.push(`Then would run: ${result.steps.join(', ')}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(style.success(`✔ Created ${style.bold(label)} in ${result.targetDir}`));
  if (result.overwritten.length > 0) {
    lines.push(style.accent(`  Overwrote ${result.overwritten.length} existing file(s): ${result.overwritten.join(', ')}`));
  }
  if (result.env === 'generated') lines.push(style.muted('  .env generated with random secrets (git-ignored)'));
  if (result.env === 'kept') lines.push(style.accent('  Existing .env kept: compare it with .env.example'));
  for (const [step, outcome] of [
    ['git init', result.git],
    [installCommand(result.pm), result.install]
  ] as const) {
    if (!outcome) continue;
    lines.push(outcome.ok ? style.success(`✔ ${step}`) : style.error(`✖ ${step} failed: ${outcome.error}`));
  }

  lines.push('', style.accent('Next steps:'));
  if (!result.inCurrentDir) lines.push(`  cd ${result.name}`);
  if (!result.install?.ok) lines.push(`  ${installCommand(result.pm)}`);
  if (result.db === 'postgres') lines.push(`  ${runScript(result.pm, 'docker:up')}   # start PostgreSQL`);
  lines.push(
    `  ${runScript(result.pm, 'dev')}`,
    '  qn generate crud product   # add a feature, already wired'
  );
  lines.push('', style.muted(`Guide: ${docsUrl}`));
  return `${lines.join('\n')}\n`;
}

const SYMBOL: Record<ChangeAction, string> = { create: '+', update: '~', unchanged: '=', conflict: '!' };

function renderFiles(files: { path: string; action: ChangeAction; diff?: string }[], style: Style): string[] {
  const lines = files.map(({ path, action }) => {
    const line = `  ${SYMBOL[action]} ${path}`;
    if (action === 'conflict') return style.error(`${line} (exists with other content: use --force to overwrite)`);
    if (action === 'unchanged') return style.muted(`${line} (unchanged)`);
    return action === 'update' ? style.accent(line) : line;
  });
  const diffs = files.filter((file) => file.diff).map((file) => file.diff as string);
  if (diffs.length > 0) lines.push('', ...diffs.map((diff) => style.muted(diff.trimEnd())));
  return lines;
}

function renderNotes(notes: string[], style: Style): string[] {
  if (notes.length === 0) return [];
  return ['', style.accent('Next:'), ...notes.map((note) => `  > ${note.replace(/\n/g, '\n    ')}`)];
}

export function renderGenerate(result: GenerateResult, style: Style): string {
  const what = `${result.type} ${result.names.name}`;
  const conflicts = result.files.some((file) => file.action === 'conflict');
  const lines = [
    result.dryRun
      ? style.accent(`Dry run: nothing was written. qn generate ${what} would change:`)
      : style.success(`✔ Generated ${style.bold(what)} (${result.parts.join(', ')})`),
    ...renderFiles(result.files, style)
  ];
  if (result.dryRun && conflicts) lines.push('', style.error('Some files exist with other content: run again with --force to overwrite them.'));
  if (!result.dryRun) lines.push('', style.muted('Run your tests and "qn check" to confirm everything fits.'));
  lines.push(...renderNotes(result.notes, style));
  return `${lines.join('\n')}\n`;
}

export function renderCheck(result: CheckResult, style: Style): string {
  if (result.ok) {
    return `${style.success(`✔ Dependency rule respected: ${result.filesChecked} domain files checked.`)}\n`;
  }
  const lines = [style.error(`✖ ${result.violations.length} dependency rule violation(s) in src/domain:`)];
  for (const violation of result.violations) {
    lines.push(`  ${violation.file}:${violation.line}  imports "${violation.specifier}"`);
    lines.push(style.muted(`    ${violation.message} [${violation.rule}]`));
  }
  lines.push(
    '',
    style.muted('Domain code may import only other domain files and Node.js built-ins. Move framework,'),
    style.muted('database and HTTP code to src/infrastructure and depend on interfaces from the domain.')
  );
  return `${lines.join('\n')}\n`;
}

export function renderAdd(result: AddResult, style: Style): string {
  const lines = [
    result.dryRun ? style.accent('Dry run: nothing was written.') : '',
    ...result.recipes.map(({ recipe, status }) =>
      status === 'already-applied'
        ? style.muted(`= ${recipe}: already in place, nothing to do`)
        : result.dryRun
          ? style.accent(`~ ${recipe}: would be applied`)
          : style.success(`✔ ${recipe}`)
    )
  ].filter((line) => line !== '');
  const touched = result.files.filter((file) => file.action !== 'unchanged');
  if (touched.length > 0) lines.push('', ...renderFiles(touched, style));
  const notes = [...result.recipes.flatMap((recipe) => recipe.notes), ...result.notes];
  lines.push(...renderNotes(notes, style));
  return `${lines.join('\n')}\n`;
}

const STATUS = { ok: '✔', warn: '!', fail: '✖', skip: '-' } as const;

export function renderDoctor(result: DoctorResult, style: Style): string {
  const paint = { ok: style.success, warn: style.accent, fail: style.error, skip: style.muted } as const;
  const width = Math.max(...result.checks.map((check) => check.name.length));
  const lines = result.checks.map(
    (check) => `${paint[check.status](`${STATUS[check.status]} ${check.name.padEnd(width)}`)}  ${check.message}`
  );
  lines.push(
    '',
    result.ok ? style.success('No blocking problems found.') : style.error('Fix the items marked ✖ and run "qn doctor" again.')
  );
  return `${lines.join('\n')}\n`;
}

export function renderEnv(result: EnvResult, style: Style): string {
  const list = (names: string[]) => names.join(', ');
  const lines: string[] = [];
  if (result.dryRun) lines.push(style.accent('Dry run: nothing was written.'));
  const [generate, add] = result.dryRun ? ['Would generate', 'Would add'] : ['✔ Generated', '✔ Added'];
  if (result.generated.length > 0) lines.push(style.success(`${generate} random values: ${list(result.generated)}`));
  if (result.added.length > 0) lines.push(style.success(`${add} from .env.example: ${list(result.added)}`));
  if (!result.envExists) lines.push(style.error('✖ .env is missing'));
  if (result.missing.length > 0) lines.push(style.error(`✖ Missing in .env: ${list(result.missing)}`));
  if (result.placeholders.length > 0) lines.push(style.error(`✖ Placeholder values in .env: ${list(result.placeholders)}`));
  if (result.extra.length > 0) lines.push(style.accent(`! Not in .env.example: ${list(result.extra)}`));
  if (result.ok && result.extra.length === 0) lines.push(style.success('✔ .env has every variable of .env.example'));
  if (!result.ok && !result.dryRun) lines.push('', style.muted('Fix: qn env --generate-secrets (values are never printed)'));
  return `${lines.join('\n')}\n`;
}

const UPGRADE_SYMBOL: Record<UpgradeAction, string> = {
  create: '+',
  update: '~',
  unchanged: '=',
  modified: '!',
  deleted: '-',
  obsolete: '?'
};

/** `asPlan` renders the plan shown before asking to apply it. */
export function renderUpgrade(result: UpgradeResult, style: Style, asPlan = false): string {
  const changed = result.files.filter((file) => file.action !== 'unchanged');
  const header = asPlan
    ? style.accent(`qn upgrade would change (template ${result.from} -> ${result.to}; --dry-run shows every diff):`)
    : result.dryRun
    ? style.accent(`Dry run: nothing was written. Template ${result.from} -> ${result.to}:`)
    : result.applied
      ? style.success(`✔ Upgraded the template ${result.from} -> ${result.to}`)
      : style.muted(`Template ${result.from} -> ${result.to}: nothing was written.`);
  const lines = [header];
  if (changed.length === 0) lines.push(style.success('  Every template file is up to date.'));
  for (const file of changed) {
    const line = `  ${UPGRADE_SYMBOL[file.action]} ${file.path}`;
    switch (file.action) {
      case 'modified':
        lines.push(
          file.overwritten
            ? style.accent(`${line} (you changed it; overwritten with --force)`)
            : style.error(`${line} (you changed it; new version in ${file.newFile})`)
        );
        break;
      case 'deleted':
        lines.push(style.muted(`${line} (you deleted it; left deleted)`));
        break;
      case 'obsolete':
        lines.push(style.muted(`${line} (no longer in the template; kept)`));
        break;
      default:
        lines.push(file.action === 'update' ? style.accent(line) : line);
    }
  }
  const diffs = changed.filter((file) => file.diff).map((file) => file.diff as string);
  if (diffs.length > 0) lines.push('', ...diffs.map((diff) => style.muted(diff.trimEnd())));
  lines.push(...renderNotes(result.notes, style));
  return `${lines.join('\n')}\n`;
}
