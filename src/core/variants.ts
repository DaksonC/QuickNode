import fs from 'node:fs/promises';
import path from 'node:path';
import type { PackageManager } from '../spec.js';
import type { TemplateName } from './paths.js';
import type { PackageJson, TestRunner } from './project.js';
import { adaptTestFile } from './source-format.js';

/** Files of a generated project that mention package manager commands. */
const PM_FILES = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  '.husky/pre-commit',
  '.husky/commit-msg',
  '.husky/install.mjs',
  'package.json'
];

/** Rewrites npm commands in a text for another package manager. */
export function rewriteForPackageManager(text: string, pm: PackageManager): string {
  if (pm === 'npm') return text;
  return text
    .replace(/\bnpx --no-install /g, pm === 'pnpm' ? 'pnpm exec ' : 'yarn ')
    .replace(/\bnpm (run|test|install)\b/g, `${pm} $1`);
}

/** Command line that installs the dependencies with `pm`. */
export const installCommand = (pm: PackageManager) => `${pm} install`;

/** Command line that runs a package.json script with `pm`. */
export const runScript = (pm: PackageManager, script: string) => (script === 'test' ? `${pm} test` : `${pm} run ${script}`);

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Adapts the scripts, docs and git hooks of a staged project to `pm`. */
export async function applyPackageManager(projectDir: string, pm: PackageManager): Promise<void> {
  if (pm === 'npm') return;
  for (const file of PM_FILES) {
    const full = path.join(projectDir, file);
    const content = await readIfExists(full);
    if (content !== undefined) await fs.writeFile(full, rewriteForPackageManager(content, pm));
  }
}

const JEST_PACKAGES = ['jest', 'ts-jest', '@types/jest', 'jest-extended'];

/** package.json scripts for the built-in node:test runner. */
export function nodeTestScripts(language: TemplateName): Record<string, string> {
  const run = language === 'typescript' ? 'node --import tsx --test' : 'node --test';
  const files = language === 'typescript' ? '"src/**/*.test.ts"' : '"src/**/*.test.js"';
  return {
    test: `${run} ${files}`,
    'test:watch': `${run} --watch ${files}`,
    'test:coverage': `${run} --experimental-test-coverage ${files}`
  };
}

async function listTestFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listTestFiles(full)));
    else if (/\.test\.[jt]s$/.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * Switches a staged project from Jest to node:test: scripts, dev
 * dependencies, jest.config.js and the imports of the test files.
 */
export async function applyTestRunner(projectDir: string, language: TemplateName, runner: TestRunner): Promise<void> {
  if (runner === 'jest') return;
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as PackageJson;
  packageJson.scripts = { ...packageJson.scripts, ...nodeTestScripts(language) };
  for (const name of JEST_PACKAGES) delete packageJson.devDependencies?.[name];
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  await fs.rm(path.join(projectDir, 'jest.config.js'), { force: true });

  for (const file of await listTestFiles(path.join(projectDir, 'src'))) {
    await fs.writeFile(file, adaptTestFile(await fs.readFile(file, 'utf8'), 'node', language));
  }
}
