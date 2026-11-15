import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PackageManager } from '../spec.js';
import type { TemplateName } from './paths.js';

export type TestRunner = 'jest' | 'node';

/** A project created by `qn create`, found from any folder inside it. */
export interface QuickNodeProject {
  root: string;
  language: TemplateName;
  /** Source file extension: "ts" or "js". */
  ext: 'ts' | 'js';
  testRunner: TestRunner;
  packageManager: PackageManager;
  packageJson: PackageJson;
}

export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  [key: string]: unknown;
}

export class NotQuickNodeProjectError extends Error {
  readonly code = 'NOT_QUICKNODE_PROJECT';

  constructor(readonly cwd: string) {
    super(
      `No QuickNode project found in ${cwd} or its parent folders (expected package.json, src/domain and src/infrastructure). Create one with "qn create".`
    );
    this.name = 'NotQuickNodeProjectError';
  }
}

/**
 * The lockfile tells the package manager; before the first install, the
 * scripts written by `qn create --pm` do.
 */
function detectPackageManager(dir: string, packageJson: PackageJson): PackageManager {
  if (existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  const scripts = Object.values(packageJson.scripts ?? {}).join('\n');
  if (/\bpnpm run\b/.test(scripts)) return 'pnpm';
  if (/\byarn run\b/.test(scripts)) return 'yarn';
  return 'npm';
}

const isDirectory = (dir: string) => existsSync(dir) && statSync(dir).isDirectory();

function isQuickNodeRoot(dir: string): boolean {
  return (
    existsSync(path.join(dir, 'package.json')) &&
    isDirectory(path.join(dir, 'src', 'domain')) &&
    isDirectory(path.join(dir, 'src', 'infrastructure'))
  );
}

/**
 * Finds the QuickNode project that contains `cwd` by its layout. The layout is
 * the contract until quicknode.json exists (ADR-001, phase 5).
 */
export function detectProject(cwd: string): QuickNodeProject {
  let dir = path.resolve(cwd);
  while (!isQuickNodeRoot(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new NotQuickNodeProjectError(cwd);
    dir = parent;
  }

  const packageJson = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as PackageJson;
  const language: TemplateName = existsSync(path.join(dir, 'tsconfig.json')) ? 'typescript' : 'javascript';
  const testScript = packageJson.scripts?.test ?? '';
  return {
    root: dir,
    language,
    ext: language === 'typescript' ? 'ts' : 'js',
    testRunner: /\bjest\b/.test(testScript) || !/--test\b/.test(testScript) ? 'jest' : 'node',
    packageManager: detectPackageManager(dir, packageJson),
    packageJson
  };
}
