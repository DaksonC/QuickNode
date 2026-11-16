/**
 * End-to-end check of the generated projects (ADR-001, D3/D5/D6). The CLI is packed with
 * `npm pack` and run from the extracted tarball, so the templates come from exactly what
 * npm would publish (the `files` field and npm's own exclusions included). Each template
 * is generated, grown with `qn generate crud` (short and long names) and every `qn add`
 * recipe, then npm install, npm audit (high/critical fail), lint, test, qn check and, for
 * TypeScript, build run: generated code must pass the project's own tools.
 *
 * Variants: `<template>[-node][-sqlite|-none]`: `typescript`, `javascript`, `-node` for
 * projects created with `--test node`, and `-sqlite`/`-none` for `--db sqlite|none`
 * (the default is `--db postgres`).
 *
 * The API is then started (NODE_ENV=development) and called over HTTP: health, the user CRUD
 * and a generated feature, then stopped with SIGTERM. PostgreSQL variants need Docker, so they
 * start the API only with QN_E2E_DOCKER=1 (docker compose up, then down -v).
 *
 * Needs network and takes minutes, so it only runs when asked:
 *   QN_E2E_TEMPLATES=all npm run test:templates          # every variant
 *   QN_E2E_TEMPLATES=typescript npm run test:templates   # one variant (CI matrix)
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
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

const TEMPLATES = [
  'typescript',
  'javascript',
  'typescript-node',
  'javascript-node',
  'typescript-sqlite',
  'javascript-sqlite',
  'typescript-none',
  'javascript-none',
];
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

const withDocker = process.env.QN_E2E_DOCKER === '1';

/** Starts the generated API, calls it over HTTP and stops it with SIGTERM. */
async function exerciseApi(project, template, port) {
  const entry =
    template === 'typescript' ? path.join('dist', 'server.js') : path.join('src', 'server.js');
  const server = spawn(process.execPath, [entry], {
    cwd: project,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  const exited = new Promise((resolve) =>
    server.on('exit', (code, signal) => resolve(code ?? signal))
  );
  const url = (route) => `http://127.0.0.1:${port}${route}`;
  const call = async (route, body) => {
    const response = await fetch(
      url(route),
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : undefined
    );
    return { status: response.status, body: await response.text() };
  };
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        if ((await fetch(url('/health'))).ok) break;
      } catch {
        // not listening yet
      }
      if (attempt > 120 || server.exitCode !== null)
        throw new Error(`the API did not start:\n${log}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal((await call('/health/ready')).status, 200, log);
    assert.equal(
      (await call('/api/v1/users', { name: 'Ana', email: 'ana@example.com', age: 30 })).status,
      201,
      log
    );
    assert.match((await call('/api/v1/users')).body, /ana@example\.com/);
    assert.equal((await call('/api/v1/products', { name: 'Chair' })).status, 201, log);
    assert.match((await call('/api/v1/products')).body, /Chair/);
    // Bad input is a client error, never a 500: no body at all and malformed JSON.
    for (const route of ['/api/v1/users', '/api/v1/products']) {
      const noBody = await fetch(url(route), { method: 'POST' });
      assert.equal(noBody.status, 400, `${route} without a body:\n${log}`);
      const malformed = await fetch(url(route), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{x',
      });
      assert.equal(malformed.status, 400, `${route} with malformed JSON:\n${log}`);
    }
  } finally {
    server.kill('SIGTERM');
  }
  assert.equal(await exited, 0, `graceful shutdown exits with 0:\n${log}`);
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

    for (const [index, variant] of selected.entries()) {
      const [template, ...flags] = variant.split('-');
      const runner = flags.includes('node') ? 'node' : 'jest';
      const db = flags.find((flag) => flag === 'sqlite' || flag === 'none') ?? 'postgres';
      it(
        `${variant}: generate, add, install, audit, lint, test, check${template === 'typescript' ? ', build' : ''}`,
        { timeout: 15 * 60_000 },
        async (t) => {
          const cwd = await makeTmp(t, `qn-tpl-${template}-`);
          const project = path.join(cwd, 'e2e-app');

          const qn = (dir, ...args) =>
            execFileAsync(process.execPath, [cli, ...args], {
              cwd: dir,
              env: { ...process.env, NO_COLOR: '1' },
            });
          await qn(
            cwd,
            'create',
            'e2e-app',
            `--${template}`,
            '--test',
            runner,
            '--db',
            db,
            '--yes'
          );
          for (const name of ['product', 'warehouse-stock-entry'])
            await qn(project, 'generate', 'crud', name);
          await qn(project, 'add', ...RECIPES.filter((recipe) => recipe !== 'github-actions'));
          // npm drops .gitignore from tarballs; the template ships it as `gitignore`.
          assert.match(await read(project, '.gitignore'), /^\.env$/m);
          assert.equal(await exists(project, '.env'), true);
          assert.equal(await exists(project, 'package-lock.json'), false);
          assert.equal(await exists(project, 'docker-compose.yml'), db === 'postgres');
          // Right after create (and generate/add), the template has nothing new to apply.
          const upgrade = JSON.parse((await qn(project, 'upgrade', '--dry-run', '--json')).stdout);
          assert.deepEqual(
            upgrade.files.filter((file) => file.action !== 'unchanged'),
            []
          );
          await qn(project, 'env', '--generate-secrets');

          await npm(project, 'install', '--no-fund', '--no-audit');
          await npm(project, 'audit', '--audit-level=high');
          await npm(project, 'run', 'lint');
          await npm(project, 'test');
          await qn(project, 'check');
          if (template === 'typescript') {
            await npm(project, 'run', 'build');
            assert.equal(await exists(project, 'dist', 'server.js'), true);
          }

          if (db !== 'postgres') {
            await exerciseApi(project, template, 3400 + index);
          } else if (withDocker) {
            // Each variant gets its own compose project and port, so variants can run in turn.
            const compose = (...args) =>
              execFileAsync('docker', ['compose', '-p', `qn-e2e-${index}`, ...args], {
                cwd: project,
                env: { ...process.env, DB_PORT: String(55432 + index) },
              });
            const envFile = path.join(project, '.env');
            await fs.writeFile(
              envFile,
              (await fs.readFile(envFile, 'utf8')).replace(
                /^DB_PORT=.*$/m,
                `DB_PORT=${55432 + index}`
              )
            );
            try {
              await compose('up', '-d', '--wait', 'postgres');
              await exerciseApi(project, template, 3400 + index);
            } finally {
              await compose('down', '-v');
            }
          }
        }
      );
    }
  }
);
