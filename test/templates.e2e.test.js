/**
 * End-to-end check of the generated projects (ADR-001, D3/D5): generate each template
 * with the real CLI, then run npm install, npm audit (high/critical fail), lint, test
 * and, for TypeScript, build — the same steps a user would run on day one.
 *
 * Needs network and takes minutes, so it only runs when asked:
 *   QN_E2E_TEMPLATES=all npm run test:templates          # both templates
 *   QN_E2E_TEMPLATES=typescript npm run test:templates   # one template (CI matrix)
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { exists, makeTmp } from './helpers.js';

const execFileAsync = promisify(execFile);
const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const npmCli = process.env.npm_execpath;

const TEMPLATES = ['typescript', 'javascript'];
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
    for (const template of selected) {
      it(
        `${template}: install, audit, lint, test${template === 'typescript' ? ', build' : ''}`,
        { timeout: 15 * 60_000 },
        async (t) => {
          const cwd = await makeTmp(t, `qn-tpl-${template}-`);
          const project = path.join(cwd, 'e2e-app');

          await execFileAsync(
            process.execPath,
            [cli, 'create', 'e2e-app', `--${template}`, '--yes'],
            {
              cwd,
              env: { ...process.env, NO_COLOR: '1' },
            }
          );
          assert.equal(await exists(project, '.env'), true);
          assert.equal(await exists(project, 'package-lock.json'), false);

          await npm(project, 'install', '--no-fund', '--no-audit');
          await npm(project, 'audit', '--audit-level=high');
          await npm(project, 'run', 'lint');
          await npm(project, 'test');
          if (template === 'typescript') {
            await npm(project, 'run', 'build');
            assert.equal(await exists(project, 'dist', 'server.js'), true);
          }
        }
      );
    }
  }
);
