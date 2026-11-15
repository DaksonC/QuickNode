/**
 * End-to-end check of the generated projects (ADR-001, D3/D5/D6). The CLI is packed with
 * `npm pack` and run from the extracted tarball, so the templates come from exactly what
 * npm would publish (the `files` field and npm's own exclusions included). Each template
 * is generated, grown with `qn generate crud` (short and long names) and every `qn add`
 * recipe, then npm install, npm audit (high/critical fail), lint, test, qn check and, for
 * TypeScript, build run: generated code must pass the project's own tools.
 *
 * Variants: `typescript`, `javascript`, and `typescript-node`/`javascript-node` for
 * projects created with `--test node`.
 *
 * Needs network and takes minutes, so it only runs when asked:
 *   QN_E2E_TEMPLATES=all npm run test:templates          # every variant
 *   QN_E2E_TEMPLATES=typescript npm run test:templates   # one variant (CI matrix)
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RECIPES } from '../dist/spec.js';
import { exists, makeTmp, read } from './helpers.js';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const npmCli = process.env.npm_execpath;

const TEMPLATES = ['typescript', 'javascript', 'typescript-node', 'javascript-node'];
const requested = process.env.QN_E2E_TEMPLATES ?? '';
const selected = requested === 'all' ? TEMPLATES : requested.split(',').filter(Boolean);
const unknown = selected.filter((name) => !TEMPLATES.includes(name));
if (unknown.length) {
  throw new Error(
    `QN_E2E_TEMPLATES: unknown template(s) ${unknown.join(', ')}; use all, ${TEMPLATES.join(', ')}`
  );
}

/** Runs npm without a shell; output is printed only when a step fails. */
async function npm(cwd, ...args) {
  // npm_execpath points to npm-cli.js when run through an npm script; fall back to PATH.
  const [file, argv] = npmCli?.endsWith('.js')
    ? [process.execPath, [npmCli, ...args]]
    : ['npm', args];
  try {
    return await execFileAsync(file, argv, {
      cwd,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CI: '1' },
    });
  } catch (error) {
    error.message = `npm ${args.join(' ')} failed in ${cwd}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    throw error;
  }
}

describe(
  'generated projects (e2e)',
  { skip: selected.length ? false : 'set QN_E2E_TEMPLATES to run' },
  () => {
    let packDir;
    let cli;

    before(async () => {
      packDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-pack-'));
      const { stdout } = await npm(
        root,
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        packDir
      );
      const [{ filename }] = JSON.parse(stdout);
      await execFileAsync('tar', ['-xzf', path.join(packDir, filename), '-C', packDir]);
      cli = path.join(packDir, 'package', 'dist', 'cli.js');
    });

    after(() => packDir && fs.rm(packDir, { recursive: true, force: true }));

    for (const variant of selected) {
      const [template, runner = 'jest'] = variant.split('-');
      it(
        `${variant}: generate, add, install, audit, lint, test, check${template === 'typescript' ? ', build' : ''}`,
        { timeout: 15 * 60_000 },
        async (t) => {
          const cwd = await makeTmp(t, `qn-tpl-${template}-`);
          const project = path.join(cwd, 'e2e-app');

          const qn = (dir, ...args) =>
            execFileAsync(process.execPath, [cli, ...args], { cwd: dir, env: { ...process.env, NO_COLOR: '1' } });
          await qn(cwd, 'create', 'e2e-app', `--${template}`, '--test', runner, '--yes');
          for (const name of ['product', 'warehouse-stock-entry']) await qn(project, 'generate', 'crud', name);
          await qn(project, 'add', ...RECIPES.filter((recipe) => recipe !== 'github-actions'));
          // npm drops .gitignore from tarballs; the template ships it as `gitignore`.
          assert.match(await read(project, '.gitignore'), /^\.env$/m);
          assert.equal(await exists(project, '.env'), true);
          assert.equal(await exists(project, 'package-lock.json'), false);

          await npm(project, 'install', '--no-fund', '--no-audit');
          await npm(project, 'audit', '--audit-level=high');
          await npm(project, 'run', 'lint');
          await npm(project, 'test');
          await qn(project, 'check');
          if (template === 'typescript') {
            await npm(project, 'run', 'build');
            assert.equal(await exists(project, 'dist', 'server.js'), true);
          }
        }
      );
    }
  }
);
