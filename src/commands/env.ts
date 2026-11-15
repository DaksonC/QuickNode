import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangePlan } from '../core/changes.js';
import {
  compareEnv,
  completeEnv,
  ENV_EXAMPLE_FILE,
  ENV_FILE,
  ENV_FILE_MODE,
  fillSecrets,
  isSecretKey,
  parseEnv
} from '../core/env.js';
import { QnError } from '../core/errors.js';
import { readIfExists } from '../core/fs.js';
import { detectProject, NotQuickNodeProjectError } from '../core/project.js';
import { UsageError } from '../spec.js';

export interface EnvInput {
  generateSecrets: boolean;
  dryRun: boolean;
  /** With generateSecrets: also replace secrets that already have a value. */
  force: boolean;
}

/**
 * Outcome of `qn env`. Only variable names, never values: the output is safe
 * to show to a person, an agent or a CI log.
 */
export interface EnvResult {
  ok: boolean;
  dryRun: boolean;
  root: string;
  /** Whether .env exists (after the command, unless it is a dry run). */
  envExists: boolean;
  missing: string[];
  extra: string[];
  placeholders: string[];
  /** Variables that got (or would get) a random value. */
  generated: string[];
  /** Variables added (or that would be) with the value of .env.example. */
  added: string[];
  /** .env was created or changed (false on dry runs). */
  written: boolean;
}

export function envInputFromFlags(positionals: string[], values: Record<string, boolean | string | undefined>): EnvInput {
  if (positionals.length > 0) throw new UsageError('qn env takes no arguments.', 'env');
  const generateSecrets = Boolean(values['generate-secrets']);
  if (!generateSecrets && (values['dry-run'] || values.force)) {
    throw new UsageError('--dry-run and --force only apply to --generate-secrets (qn env alone never writes).', 'env');
  }
  return { generateSecrets, dryRun: Boolean(values['dry-run']), force: Boolean(values.force) };
}

/** The project root, or the folder itself when it is not a QuickNode project (any .env.example works). */
function rootOf(cwd: string): string {
  try {
    return detectProject(cwd).root;
  } catch (error) {
    if (error instanceof NotQuickNodeProjectError) return path.resolve(cwd);
    throw error;
  }
}

/**
 * Compares .env with .env.example and, with generateSecrets, completes .env:
 * missing variables are added and secrets get random values (crypto.randomBytes).
 */
export async function envCommand(input: EnvInput, cwd: string): Promise<EnvResult> {
  const root = rootOf(cwd);
  const example = await readIfExists(path.join(root, ENV_EXAMPLE_FILE));
  if (example === undefined) {
    throw new QnError(
      'E_ENV_EXAMPLE_MISSING',
      `No ${ENV_EXAMPLE_FILE} in ${root}: it documents the variables .env must have.`,
      `create ${ENV_EXAMPLE_FILE} with one NAME=example-value line per variable (secrets as NAME=change-me)`
    );
  }
  const env = await readIfExists(path.join(root, ENV_FILE));
  let generated: string[] = [];
  let added: string[] = [];
  let after = env;

  if (input.generateSecrets) {
    if (env === undefined) {
      after = fillSecrets(example);
      const values = [...parseEnv(example).keys()];
      generated = values.filter(isSecretKey);
      added = values.filter((key) => !isSecretKey(key));
    } else {
      ({ content: after, generated, added } = completeEnv(env, example, input.force));
    }
  }

  const written = input.generateSecrets && !input.dryRun && after !== env;
  if (written && after !== undefined) {
    // .env is the user's file: overwriting it is the point of --generate-secrets, and it is never shown as a diff.
    const plan = new ChangePlan(root);
    await plan.write(ENV_FILE, after, { mode: ENV_FILE_MODE, overwrite: true });
    await plan.apply();
    // An existing .env keeps its mode on write: secrets were added, so make it owner-only.
    await fs.chmod(path.join(root, ENV_FILE), ENV_FILE_MODE);
  }

  // The state the result describes: after the command, or as it is now on a dry run.
  const state = input.dryRun ? env : after;
  const comparison = state === undefined ? undefined : compareEnv(state, example);
  // Like the other commands, a dry run succeeds when the real run would leave .env complete.
  const outcome = after === undefined ? undefined : compareEnv(after, example);
  return {
    ok: outcome !== undefined && outcome.missing.length === 0 && outcome.placeholders.length === 0,
    dryRun: input.dryRun,
    root,
    envExists: state !== undefined,
    missing: comparison ? comparison.missing : [...parseEnv(example).keys()],
    extra: comparison?.extra ?? [],
    placeholders: comparison?.placeholders ?? [],
    generated,
    added,
    written
  };
}
