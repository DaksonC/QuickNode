import path from 'node:path';
import { ENV_EXAMPLE_FILE, ENV_FILE } from '../core/env.js';
import { readIfExists } from '../core/fs.js';
import { detectProject, type QuickNodeProject } from '../core/project.js';
import { capture, npmCommand, type CaptureResult } from '../core/run.js';
import { checkProject } from './check.js';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

export interface DoctorCheck {
  name: 'node' | 'env' | 'docker' | 'audit' | 'check';
  status: CheckStatus;
  message: string;
}

export interface DoctorResult {
  /** False when any check failed (warnings do not fail). */
  ok: boolean;
  root: string;
  checks: DoctorCheck[];
}

export interface DoctorContext {
  cwd: string;
  offline?: boolean;
  nodeVersion?: string;
  /** Runs a program and captures stdout (tests replace it). */
  capture?: typeof capture;
}

const parseVersion = (version: string) => version.replace(/^v/, '').split('.').map(Number);

/** Compares a Node version with a ">=x.y.z" engines range; undefined for other ranges. */
export function satisfiesMinimum(version: string, range: string): boolean | undefined {
  const match = /^>=\s*v?(\d+(?:\.\d+){0,2})$/.exec(range.trim());
  if (!match) return undefined;
  const have = parseVersion(version);
  const need = parseVersion(match[1]);
  for (let index = 0; index < 3; index++) {
    const difference = (have[index] ?? 0) - (need[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function checkNode(project: QuickNodeProject, version: string): DoctorCheck {
  const range = project.packageJson.engines?.node;
  if (!range) return { name: 'node', status: 'ok', message: `Node.js ${version} (no "engines.node" in package.json)` };
  const satisfied = satisfiesMinimum(version, range);
  if (satisfied === undefined) return { name: 'node', status: 'warn', message: `Node.js ${version}; could not evaluate engines "${range}"` };
  return satisfied
    ? { name: 'node', status: 'ok', message: `Node.js ${version} (requires ${range})` }
    : { name: 'node', status: 'fail', message: `Node.js ${version} does not satisfy ${range}: install a newer Node.js` };
}

/** KEY=value pairs of a dotenv file (comments and blank lines ignored). */
function parseEnv(content: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (match) entries.set(match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2'));
  }
  return entries;
}


/** Compares .env with .env.example by variable names; values are never shown. */
async function checkEnv(root: string): Promise<DoctorCheck> {
  const env = await readIfExists(path.join(root, ENV_FILE));
  const example = await readIfExists(path.join(root, ENV_EXAMPLE_FILE));
  if (env === undefined) {
    return {
      name: 'env',
      status: 'fail',
      message: `${ENV_FILE} is missing: copy ${ENV_EXAMPLE_FILE} to ${ENV_FILE} and replace every "change-me"`
    };
  }
  const values = parseEnv(env);
  const placeholders = [...values].filter(([, value]) => value === 'change-me').map(([key]) => key);
  if (placeholders.length > 0) {
    return { name: 'env', status: 'fail', message: `${ENV_FILE} still has placeholder values: ${placeholders.join(', ')}` };
  }
  const missing = example === undefined ? [] : [...parseEnv(example).keys()].filter((key) => !values.has(key));
  return missing.length > 0
    ? { name: 'env', status: 'warn', message: `${ENV_FILE} lacks variables from ${ENV_EXAMPLE_FILE}: ${missing.join(', ')}` }
    : { name: 'env', status: 'ok', message: `${ENV_FILE} has every variable of ${ENV_EXAMPLE_FILE}` };
}

async function checkDocker(run: typeof capture, root: string): Promise<DoctorCheck> {
  const docker = await run('docker', ['--version'], root, 15_000);
  if (docker.code !== 0) {
    return { name: 'docker', status: 'warn', message: 'Docker not found: it runs the database (npm run docker:up)' };
  }
  const compose = await run('docker', ['compose', 'version'], root, 15_000);
  const version = docker.stdout.trim();
  return compose.code === 0
    ? { name: 'docker', status: 'ok', message: version }
    : { name: 'docker', status: 'warn', message: `${version}, but "docker compose" is not available` };
}

const LOCKFILES = { npm: 'package-lock.json', pnpm: 'pnpm-lock.yaml', yarn: 'yarn.lock' } as const;

async function checkAudit(project: QuickNodeProject, run: typeof capture, offline: boolean): Promise<DoctorCheck> {
  if (offline) return { name: 'audit', status: 'skip', message: 'Skipped (--offline)' };
  const pm = project.packageManager;
  if ((await readIfExists(path.join(project.root, LOCKFILES[pm]))) === undefined) {
    return { name: 'audit', status: 'warn', message: `No ${LOCKFILES[pm]} yet: run "${pm} install" first` };
  }
  let result: CaptureResult;
  if (pm === 'npm') {
    const npm = npmCommand(['audit', '--json']);
    if (!npm) return { name: 'audit', status: 'warn', message: 'npm was not found' };
    result = await run(npm[0], npm[1], project.root);
  } else if (pm === 'pnpm') {
    result = await run('pnpm', ['audit', '--json'], project.root);
  } else {
    return { name: 'audit', status: 'warn', message: 'Run "yarn npm audit" to check vulnerabilities' };
  }

  let counts: Record<string, number> | undefined;
  try {
    counts = JSON.parse(result.stdout).metadata?.vulnerabilities;
  } catch {
    counts = undefined;
  }
  if (!counts) return { name: 'audit', status: 'warn', message: `Could not run ${pm} audit (offline?)` };
  const serious = (counts.high ?? 0) + (counts.critical ?? 0);
  const total = Object.entries(counts)
    .filter(([level]) => level !== 'total')
    .reduce((sum, [, count]) => sum + count, 0);
  if (serious > 0) {
    return {
      name: 'audit',
      status: 'fail',
      message: `${serious} high or critical vulnerabilities: run "${pm} audit" for details`
    };
  }
  return total > 0
    ? { name: 'audit', status: 'warn', message: `${total} low or moderate vulnerabilities` }
    : { name: 'audit', status: 'ok', message: 'No known vulnerabilities' };
}

async function checkDependencyRule(root: string): Promise<DoctorCheck> {
  const result = await checkProject(root);
  return result.ok
    ? { name: 'check', status: 'ok', message: `Dependency rule respected (${result.filesChecked} domain files)` }
    : { name: 'check', status: 'fail', message: `${result.violations.length} dependency rule violations: run "qn check"` };
}

/** Diagnoses the QuickNode project that contains `ctx.cwd`. */
export async function doctor(ctx: DoctorContext): Promise<DoctorResult> {
  const project = detectProject(ctx.cwd);
  const run = ctx.capture ?? capture;
  const checks = [
    checkNode(project, ctx.nodeVersion ?? process.versions.node),
    await checkEnv(project.root),
    await checkDocker(run, project.root),
    await checkAudit(project, run, Boolean(ctx.offline)),
    await checkDependencyRule(project.root)
  ];
  return { ok: checks.every((check) => check.status !== 'fail'), root: project.root, checks };
}
