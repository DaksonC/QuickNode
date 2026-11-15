import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Database, PackageManager } from '../spec.js';
import { readIfExists } from './fs.js';
import { packageRoot, type TemplateName } from './paths.js';
import type { PackageJson, QuickNodeProject, TestRunner } from './project.js';
import { listTemplateFiles } from './scaffold.js';
import { applyPackageManager, applyTestRunner } from './variants.js';

/** The choices of `qn create` that shape the generated files (recorded in quicknode.json). */
export interface ProjectOptions {
  template: TemplateName;
  db: Database;
  pm: PackageManager;
  test: TestRunner;
  /** Keep the "Generated with QuickNode" line in the README. */
  credits: boolean;
}

export interface RenderedFile {
  content: string;
  executable: boolean;
}

/** Files of a project, by path relative to its root ("/" separators), in code-unit order. */
export type RenderedProject = Map<string, RenderedFile>;

/** Metadata of a template layer: text for the {{qn:key}} tokens and files it removes. */
interface LayerMeta {
  text?: Record<string, string | Partial<Record<TemplateName, string>>>;
  remove?: string[];
}

const LAYER_META = 'qn-layer.json';
/** npm never publishes `.gitignore`, so templates store it without the dot. */
const RENAMED: Record<string, string> = { gitignore: '.gitignore' };
const ENV_EXAMPLE = '.env.example';
const TOKEN = /\{\{qn:([A-Za-z]+)\}\}/g;
const CREDITS_BLOCK = /\n*<!-- quicknode:credits -->[\s\S]*?<!-- \/quicknode:credits -->\n?/;

const toPosix = (file: string) => file.split(path.sep).join('/');
const templatesRoot = () => path.join(packageRoot(), 'templates');

/**
 * Template layers in the order they apply; a later layer replaces files of an
 * earlier one, except package.json and .env.example of a database layer,
 * which add to the base ones.
 */
function layersOf({ template, db }: Pick<ProjectOptions, 'template' | 'db'>) {
  const root = templatesRoot();
  return [
    { dir: path.join(root, 'common'), meta: undefined, db: false },
    { dir: path.join(root, template), meta: path.join(root, template, LAYER_META), db: false },
    { dir: path.join(root, 'db', db, 'common'), meta: path.join(root, 'db', db, LAYER_META), db: true },
    { dir: path.join(root, 'db', db, template), meta: undefined, db: true }
  ];
}

/** Adds the fields of a package.json fragment (versions and scripts of a layer). */
function mergePackageJson(base: PackageJson, fragment: PackageJson): PackageJson {
  const sorted = (entries: Record<string, string>) =>
    Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : 1)));
  const merged: PackageJson = { ...base, scripts: { ...base.scripts, ...fragment.scripts } };
  for (const field of ['dependencies', 'devDependencies'] as const) {
    if (fragment[field]) merged[field] = sorted({ ...base[field], ...fragment[field] });
  }
  return merged;
}

/** Replaces {{qn:key}} tokens; a line holding only an empty token disappears. */
function fillTokens(text: string, values: Record<string, string>, file: string): string {
  return text
    .replace(/^\{\{qn:([A-Za-z]+)\}\}\n/gm, (line, key: string) => (values[key] === '' ? '' : line))
    .replace(TOKEN, (_, key: string) => {
      if (values[key] === undefined) throw new Error(`Template token {{qn:${key}}} in ${file} has no value.`);
      return values[key];
    });
}

/**
 * Produces every file of a new project in memory, without touching the disk:
 * `qn create` writes the result and `qn upgrade` compares it with a project.
 * The same options always give the same files.
 */
export async function renderProject(options: ProjectOptions & { packageName: string }): Promise<RenderedProject> {
  const files = new Map<string, RenderedFile>();
  const text: Record<string, string> = {};
  const remove: string[] = [];
  let packageJson: PackageJson | undefined;
  let envFragment = '';

  for (const layer of layersOf(options)) {
    if (layer.meta) {
      const meta = JSON.parse((await readIfExists(layer.meta)) ?? '{}') as LayerMeta;
      for (const [key, value] of Object.entries(meta.text ?? {})) {
        text[key] = typeof value === 'string' ? value : (value[options.template] ?? '');
      }
      remove.push(...(meta.remove ?? []));
    }
    if (!existsSync(layer.dir)) continue;
    for (const source of await listTemplateFiles(layer.dir)) {
      const name = path.basename(source);
      if (name === LAYER_META) continue;
      const destination = toPosix(RENAMED[name] ? path.join(path.dirname(source), RENAMED[name]) : source);
      const full = path.join(layer.dir, source);
      const content = await fs.readFile(full, 'utf8');
      if (layer.db && destination === 'package.json') {
        if (!packageJson) throw new Error('A database layer has a package.json but the base template has none.');
        packageJson = mergePackageJson(packageJson, JSON.parse(content) as PackageJson);
        continue;
      }
      if (layer.db && destination === ENV_EXAMPLE) {
        envFragment += content;
        continue;
      }
      if (destination === 'package.json') packageJson = JSON.parse(content) as PackageJson;
      const executable = ((await fs.stat(full)).mode & 0o100) !== 0;
      files.set(destination, { content, executable });
    }
  }

  for (const file of remove) files.delete(file);
  if (packageJson) {
    packageJson.name = options.packageName;
    files.set('package.json', { content: `${JSON.stringify(packageJson, null, 2)}\n`, executable: false });
  }
  const env = files.get(ENV_EXAMPLE);
  if (env && envFragment) env.content = `${envFragment.replace(/\n*$/, '\n')}\n${env.content}`;

  for (const [file, entry] of files) entry.content = fillTokens(entry.content, text, file);

  const readme = files.get('README.md');
  if (readme && !options.credits) readme.content = readme.content.replace(CREDITS_BLOCK, '\n');
  // AI assistants read AGENTS.md (Copilot, Codex, Cursor) or CLAUDE.md (Claude Code).
  const agents = files.get('AGENTS.md');
  if (agents) files.set('CLAUDE.md', { ...agents });

  applyPackageManager(files, options.pm);
  applyTestRunner(files, options.template, options.test);

  return new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The options a project was created with: from quicknode.json, or detected. */
export function projectOptions(project: QuickNodeProject): ProjectOptions {
  return {
    template: project.language,
    db: project.db,
    pm: project.packageManager,
    test: project.testRunner,
    credits: project.config?.credits ?? true
  };
}

/** The template as it would be generated today for an existing project. */
export function renderFor(project: QuickNodeProject): Promise<RenderedProject> {
  return renderProject({ ...projectOptions(project), packageName: project.packageJson.name ?? 'app' });
}

/** Writes rendered files under `dir` (which must not hold them yet). */
export async function writeRendered(dir: string, files: RenderedProject): Promise<void> {
  for (const [file, { content, executable }] of files) {
    const destination = path.join(dir, ...file.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, { flag: 'wx', mode: executable ? 0o755 : 0o644 });
  }
}

/** Content hash recorded in quicknode.json, to tell files the user changed from generated ones. */
export function hashContent(content: string): string {
  return `sha256-${createHash('sha256').update(content).digest('base64')}`;
}

/** Hash of every rendered file, by path. */
export function hashFiles(files: RenderedProject): Record<string, string> {
  return Object.fromEntries([...files].map(([file, { content }]) => [file, hashContent(content)]));
}
