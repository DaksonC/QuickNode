import type { PackageManager } from '../spec.js';
import type { TemplateName } from './paths.js';
import type { PackageJson, TestRunner } from './project.js';
import type { RenderedProject } from './render.js';
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

/** Adapts the scripts, docs and git hooks of a rendered project to `pm`. */
export function applyPackageManager(files: RenderedProject, pm: PackageManager): void {
  if (pm === 'npm') return;
  for (const file of PM_FILES) {
    const entry = files.get(file);
    if (entry) entry.content = rewriteForPackageManager(entry.content, pm);
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

/**
 * Switches a rendered project from Jest to node:test: scripts, dev
 * dependencies, jest.config.js and the imports of the test files.
 */
export function applyTestRunner(files: RenderedProject, language: TemplateName, runner: TestRunner): void {
  if (runner === 'jest') return;
  const manifest = files.get('package.json');
  if (manifest) {
    const packageJson = JSON.parse(manifest.content) as PackageJson;
    packageJson.scripts = { ...packageJson.scripts, ...nodeTestScripts(language) };
    for (const name of JEST_PACKAGES) delete packageJson.devDependencies?.[name];
    manifest.content = `${JSON.stringify(packageJson, null, 2)}\n`;
  }
  files.delete('jest.config.js');
  for (const [file, entry] of files) {
    if (file.startsWith('src/') && /\.test\.[jt]s$/.test(file)) entry.content = adaptTestFile(entry.content, 'node', language);
  }
}
