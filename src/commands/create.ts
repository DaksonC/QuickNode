import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE, CONFIG_SCHEMA_VERSION, DEFAULT_LAYERS, serializeConfig } from '../core/config.js';
import { createEnvFile, ENV_FILE, generatesEnvFile } from '../core/env.js';
import { shellQuote } from '../core/errors.js';
import { cliVersion, type TemplateName } from '../core/paths.js';
import { loadPreset } from '../core/presets.js';
import { projectNameError, resolveProject } from '../core/project-name.js';
import type { TestRunner } from '../core/project.js';
import { hashFiles, renderProject, writeRendered, type ProjectOptions } from '../core/render.js';
import { npmCommand, run, type RunResult } from '../core/run.js';
import { assertWritable, planScaffold, writeScaffold } from '../core/scaffold.js';
import { installCommand } from '../core/variants.js';
import { UsageError, type Database, type PackageManager } from '../spec.js';
import type { Prompter } from '../ui/prompt.js';

export const DEFAULT_PROJECT_NAME = 'my-quicknode-app';
export const DEFAULT_TEMPLATE: TemplateName = 'typescript';
export const DEFAULT_DATABASE: Database = 'postgres';

/** Choices of `qn create`; undefined means "not given" (then: preset, prompt or default). */
export interface CreateInput {
  name?: string;
  template?: TemplateName;
  force?: boolean;
  /** Use defaults for anything not given instead of prompting. */
  yes?: boolean;
  dryRun?: boolean;
  install?: boolean;
  git?: boolean;
  /** Leave the "Generated with QuickNode" line out of the README. */
  noCredits?: boolean;
  /** Package manager written into scripts and docs, and used by --install. */
  pm?: PackageManager;
  testRunner?: TestRunner;
  db?: Database;
  /** Built-in preset name or path of a local JSON preset. */
  preset?: string;
}

export interface CreateContext {
  cwd: string;
  /** Present only in interactive sessions. */
  prompter?: Prompter;
  /** Progress messages (stderr). */
  progress?: (message: string) => void;
}

export type EnvStatus = 'generated' | 'kept' | 'none';

export interface CreateResult {
  dryRun: boolean;
  name: string;
  packageName: string;
  targetDir: string;
  inCurrentDir: boolean;
  template: TemplateName;
  db: Database;
  pm: PackageManager;
  testRunner: TestRunner;
  /** Preset the choices started from, if any. */
  preset?: string;
  /** Files of the project, relative to targetDir. */
  files: string[];
  /** Existing files that are (or would be) overwritten. */
  overwritten: string[];
  env: EnvStatus;
  /** Steps requested after generation, in order (also listed on dry runs). */
  steps: Step[];
  git?: RunResult;
  install?: RunResult;
}

export type Step = 'git init' | `${PackageManager} install`;

/** Converts parsed flags into a CreateInput, rejecting contradictions early. */
export function createInputFromFlags(
  positionals: string[],
  values: Record<string, boolean | string | undefined>
): CreateInput {
  if (positionals.length > 1) throw new UsageError('Only one project name can be given.', 'create');
  if (values.typescript && values.javascript) {
    throw new UsageError('Choose only one template: --typescript or --javascript.', 'create');
  }
  // Boolean flags are "given" only when present, so a preset can still set them.
  const given = (name: string) => (values[name] ? true : undefined);
  return {
    name: positionals[0],
    template: values.typescript ? 'typescript' : values.javascript ? 'javascript' : undefined,
    force: Boolean(values.force),
    yes: Boolean(values.yes),
    dryRun: Boolean(values['dry-run']),
    install: given('install'),
    git: given('git'),
    noCredits: given('no-credits'),
    pm: values.pm as PackageManager | undefined,
    testRunner: values.test as TestRunner | undefined,
    db: values.db as Database | undefined,
    preset: values.preset as string | undefined
  };
}

async function resolveName(input: CreateInput, prompter?: Prompter): Promise<string> {
  if (input.name !== undefined) return input.name;
  if (input.yes) return DEFAULT_PROJECT_NAME;
  if (!prompter) {
    throw new UsageError(
      'A project name is required (or pass --yes to use the default).',
      'create',
      `qn create my-api ${input.template ? `--${input.template}` : '--typescript'}`
    );
  }
  return prompter.text('Project name (use "." for the current directory)', DEFAULT_PROJECT_NAME, (value) =>
    value === '.' ? undefined : projectNameError(value)
  );
}

/** A preset counts as an answer: what it leaves out takes the default instead of a prompt. */
async function resolveTemplate(input: CreateInput, usePrompts: boolean, prompter?: Prompter): Promise<TemplateName> {
  if (input.template) return input.template;
  if (!usePrompts) return DEFAULT_TEMPLATE;
  if (!prompter) {
    throw new UsageError(
      'Choose a template with --typescript or --javascript (or pass --yes).',
      'create',
      `qn create ${shellQuote(input.name ?? 'my-api')} --typescript`
    );
  }
  return prompter.choose<TemplateName>('Template', [
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JavaScript', value: 'javascript' }
  ]);
}

async function resolveDatabase(input: CreateInput, usePrompts: boolean, prompter?: Prompter): Promise<Database> {
  if (input.db) return input.db;
  if (!usePrompts || !prompter) return DEFAULT_DATABASE;
  return prompter.choose<Database>('Database', [
    { label: 'PostgreSQL (Docker)', value: 'postgres' },
    { label: 'SQLite (node:sqlite, nothing to install)', value: 'sqlite' },
    { label: 'None (in-memory repositories)', value: 'none' }
  ]);
}

/** Flags first, then the preset: a flag given on the command line always wins. */
async function withPreset(input: CreateInput, cwd: string): Promise<CreateInput> {
  if (input.preset === undefined) return input;
  const { values } = await loadPreset(input.preset, cwd);
  return {
    ...input,
    template: input.template ?? values.template,
    db: input.db ?? values.db,
    pm: input.pm ?? values.pm,
    testRunner: input.testRunner ?? values.test,
    git: input.git ?? values.git,
    install: input.install ?? values.install,
    noCredits: input.noCredits ?? (values.credits === undefined ? undefined : !values.credits)
  };
}

/**
 * Creates (or, with dryRun, only plans) a project. Never prints: progress goes
 * through `ctx.progress` and the outcome is returned for the caller to render.
 */
export async function createProject(rawInput: CreateInput, ctx: CreateContext): Promise<CreateResult> {
  // The preset is validated before any prompt or file.
  const input = await withPreset(rawInput, ctx.cwd);
  const name = await resolveName(input, ctx.prompter);
  const project = resolveProject(name, ctx.cwd);
  const usePrompts = !input.yes && input.preset === undefined;
  const template = await resolveTemplate(input, usePrompts, ctx.prompter);
  const db = await resolveDatabase(input, usePrompts, ctx.prompter);

  const options: ProjectOptions = {
    template,
    db,
    pm: input.pm ?? 'npm',
    test: input.testRunner ?? 'jest',
    credits: !input.noCredits
  };
  const rendered = await renderProject({ ...options, packageName: project.packageName });
  const plan = await planScaffold({
    files: [...rendered.keys(), CONFIG_FILE],
    targetDir: project.targetDir,
    preserve: [ENV_FILE]
  });
  assertWritable(plan, input.force);

  const env: EnvStatus = plan.preserved.includes(ENV_FILE) ? 'kept' : generatesEnvFile([...rendered.keys()]) ? 'generated' : 'none';
  const files = [...rendered.keys(), CONFIG_FILE, ...(env === 'generated' ? [ENV_FILE] : [])].sort();

  const result: CreateResult = {
    dryRun: Boolean(input.dryRun),
    name,
    packageName: project.packageName,
    targetDir: project.targetDir,
    inCurrentDir: project.inCurrentDir,
    template,
    db,
    pm: options.pm,
    testRunner: options.test,
    ...(input.preset === undefined ? {} : { preset: input.preset }),
    files,
    overwritten: plan.conflicts.map((file) => file.split(path.sep).join('/')),
    env,
    steps: [...(input.git ? (['git init'] as const) : []), ...(input.install ? [installCommand(options.pm) as Step] : [])]
  };
  if (input.dryRun) return result;

  ctx.progress?.(`Creating ${project.targetDir}`);
  const config = serializeConfig({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    templateVersion: cliVersion(),
    ...options,
    layers: DEFAULT_LAYERS,
    files: hashFiles(rendered)
  });
  await writeScaffold(plan, {
    populate: async (stagingDir) => {
      await writeRendered(stagingDir, rendered);
      await fs.writeFile(path.join(stagingDir, CONFIG_FILE), config);
      await createEnvFile(stagingDir);
    }
  });

  if (input.git) {
    ctx.progress?.('Initializing git repository');
    result.git = await run('git', ['init', '--quiet'], project.targetDir);
  }
  if (input.install) {
    ctx.progress?.(`Installing dependencies (${installCommand(options.pm)})`);
    result.install = await installDependencies(options.pm, project.targetDir);
  }

  return result;
}

/** Runs `<pm> install` without a shell. */
async function installDependencies(pm: PackageManager, cwd: string): Promise<RunResult> {
  if (pm === 'npm') {
    const npm = npmCommand(['install']);
    return npm ? run(npm[0], npm[1], cwd) : { ok: false, error: 'npm was not found; run "npm install" manually' };
  }
  // pnpm and yarn are found on PATH; Windows ships them as .cmd shims that
  // cannot be spawned without a shell, so there the user runs them.
  if (process.platform === 'win32') return { ok: false, error: `run "${installCommand(pm)}" manually` };
  const result = await run(pm, ['install'], cwd);
  return result.ok ? result : { ...result, error: `${result.error}; run "${installCommand(pm)}" manually` };
}
