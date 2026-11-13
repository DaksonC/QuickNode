import fs from 'node:fs/promises';
import path from 'node:path';
import { createEnvFile, ENV_FILE, generatesEnvFile } from '../core/env.js';
import { templateDir, type TemplateName } from '../core/paths.js';
import { projectNameError, resolveProject } from '../core/project-name.js';
import { npmCommand, run, type RunResult } from '../core/run.js';
import { assertWritable, planScaffold, writeScaffold } from '../core/scaffold.js';
import { UsageError } from '../spec.js';
import type { Prompter } from '../ui/prompt.js';

export const DEFAULT_PROJECT_NAME = 'my-quicknode-app';
export const DEFAULT_TEMPLATE: TemplateName = 'typescript';

export interface CreateInput {
  name?: string;
  template?: TemplateName;
  force?: boolean;
  /** Use defaults for anything not given instead of prompting. */
  yes?: boolean;
  dryRun?: boolean;
  install?: boolean;
  git?: boolean;
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

export type Step = 'git init' | 'npm install';

/** Converts parsed flags into a CreateInput, rejecting contradictions early. */
export function createInputFromFlags(
  positionals: string[],
  values: Record<string, boolean | string | undefined>
): CreateInput {
  if (positionals.length > 1) throw new UsageError('Only one project name can be given.', 'create');
  if (values.typescript && values.javascript) {
    throw new UsageError('Choose only one template: --typescript or --javascript.', 'create');
  }
  return {
    name: positionals[0],
    template: values.typescript ? 'typescript' : values.javascript ? 'javascript' : undefined,
    force: Boolean(values.force),
    yes: Boolean(values.yes),
    dryRun: Boolean(values['dry-run']),
    install: Boolean(values.install),
    git: Boolean(values.git)
  };
}

async function resolveName(input: CreateInput, prompter?: Prompter): Promise<string> {
  if (input.name !== undefined) return input.name;
  if (input.yes) return DEFAULT_PROJECT_NAME;
  if (!prompter) throw new UsageError('A project name is required (or pass --yes to use the default).', 'create');
  return prompter.text('Project name (use "." for the current directory)', DEFAULT_PROJECT_NAME, (value) =>
    value === '.' ? undefined : projectNameError(value)
  );
}

async function resolveTemplate(input: CreateInput, prompter?: Prompter): Promise<TemplateName> {
  if (input.template) return input.template;
  if (input.yes) return DEFAULT_TEMPLATE;
  if (!prompter) throw new UsageError('Choose a template with --typescript or --javascript (or pass --yes).', 'create');
  return prompter.choose<TemplateName>('Template', [
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JavaScript', value: 'javascript' }
  ]);
}

async function setPackageName(projectDir: string, name: string): Promise<void> {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  packageJson.name = name;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

/**
 * Creates (or, with dryRun, only plans) a project. Never prints: progress goes
 * through `ctx.progress` and the outcome is returned for the caller to render.
 */
export async function createProject(input: CreateInput, ctx: CreateContext): Promise<CreateResult> {
  const name = await resolveName(input, ctx.prompter);
  const project = resolveProject(name, ctx.cwd);
  const template = await resolveTemplate(input, ctx.prompter);

  const plan = await planScaffold({
    templateDir: templateDir(template),
    targetDir: project.targetDir,
    preserve: [ENV_FILE]
  });
  assertWritable(plan, input.force);

  const env: EnvStatus = plan.preserved.includes(ENV_FILE)
    ? 'kept'
    : generatesEnvFile(plan.files)
      ? 'generated'
      : 'none';

  const result: CreateResult = {
    dryRun: Boolean(input.dryRun),
    name,
    packageName: project.packageName,
    targetDir: project.targetDir,
    inCurrentDir: project.inCurrentDir,
    template,
    files: env === 'generated' ? [...plan.files, ENV_FILE] : plan.files,
    overwritten: plan.conflicts,
    env,
    steps: [...(input.git ? (['git init'] as const) : []), ...(input.install ? (['npm install'] as const) : [])]
  };
  if (input.dryRun) return result;

  ctx.progress?.(`Creating ${project.targetDir}`);
  await writeScaffold(plan, {
    transform: async (stagingDir) => {
      await setPackageName(stagingDir, project.packageName);
      await createEnvFile(stagingDir);
    }
  });

  if (input.git) {
    ctx.progress?.('Initializing git repository');
    result.git = await run('git', ['init', '--quiet'], project.targetDir);
  }
  if (input.install) {
    ctx.progress?.('Installing dependencies (npm install)');
    const npm = npmCommand(['install']);
    result.install = npm
      ? await run(npm[0], npm[1], project.targetDir)
      : { ok: false, error: 'npm was not found; run "npm install" manually' };
  }

  return result;
}
