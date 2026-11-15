/**
 * Phase 5 of ADR-001 (v3): quicknode.json, presets, --db add-ons, qn env and qn upgrade.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import { runMcpServer } from '../dist/commands/mcp.js';
import { upgrade, upgradeVersions } from '../dist/commands/upgrade.js';
import { compareVersions, parseConfig, serializeConfig } from '../dist/core/config.js';
import { compareEnv, completeEnv, parseEnv } from '../dist/core/env.js';
import { getVersion } from '../dist/main.js';
import { hashContent } from '../dist/core/render.js';
import { loadPreset } from '../dist/core/presets.js';
import { exists, makeProject, makeTmp, read, runQn, write } from './helpers.js';

const config = (project) => read(project, 'quicknode.json').then(JSON.parse);
const writeConfig = (project, value) => fs.writeFile(path.join(project, 'quicknode.json'), serializeConfig(value));
const json = (result) => JSON.parse(result.stdout);

describe('quicknode.json', () => {
  it('records the choices of qn create and the hash of every generated file', async (t) => {
    const project = await makeProject(t, 'javascript', '--db', 'sqlite', '--pm', 'pnpm', '--test', 'node', '--no-credits');
    const recorded = await config(project);
    assert.deepEqual(
      { ...recorded, files: undefined },
      {
        schemaVersion: 1,
        templateVersion: getVersion(),
        template: 'javascript',
        db: 'sqlite',
        pm: 'pnpm',
        test: 'node',
        credits: false,
        layers: { domain: 'src/domain', infrastructure: 'src/infrastructure' },
        files: undefined
      }
    );
    assert.equal(recorded.files['src/server.js'], hashContent(await read(project, 'src', 'server.js')));
    assert.equal(recorded.files['.env'], undefined, '.env holds secrets and is never tracked');
    assert.equal(recorded.files['quicknode.json'], undefined);
  });

  it('is validated strictly', () => {
    const valid = { schemaVersion: 1, templateVersion: '3.0.0', template: 'typescript', db: 'none', pm: 'npm', test: 'jest' };
    assert.equal(parseConfig(JSON.stringify(valid)).credits, true);
    const invalid = [
      ['{', /not valid JSON/],
      [JSON.stringify({ ...valid, extra: 1 }), /unknown key\(s\) extra/],
      [JSON.stringify({ ...valid, schemaVersion: 2 }), /schemaVersion/],
      [JSON.stringify({ ...valid, db: 'mysql' }), /"db" must be one of postgres, sqlite, none/],
      [JSON.stringify({ ...valid, layers: { domain: '../x', infrastructure: 'src/infrastructure' } }), /layers.domain/],
      [JSON.stringify({ ...valid, files: { '../../etc/passwd': 'sha256-AA==' } }), /outside the project/]
    ];
    for (const [text, message] of invalid) {
      assert.throws(() => parseConfig(text), (error) => error.code === 'E_CONFIG_INVALID' && message.test(error.message), text);
    }
  });

  it('drives the other commands, and a broken one fails with E_CONFIG_INVALID', async (t) => {
    const project = await makeProject(t, 'typescript', '--db', 'none');
    const generated = json(await runQn(project, 'generate', 'repository', 'product', '--json'));
    assert.ok(generated.files.some((file) => file.path === 'src/infrastructure/database/repositories/product-repository.ts'));
    assert.match(await read(project, 'src/infrastructure/database/repositories/product-repository.ts'), /InMemoryProductRepository/);

    await write(path.join(project, 'quicknode.json'), '{"schemaVersion": 1');
    const broken = await runQn(project, 'check', '--json');
    assert.equal(broken.code, 1);
    assert.equal(json(broken).error.code, 'E_CONFIG_INVALID');
  });

  it('lets qn check use other layer folders, and generate refuses them', async (t) => {
    const project = await makeProject(t, 'javascript');
    await fs.rename(path.join(project, 'src', 'domain'), path.join(project, 'src', 'core'));
    await writeConfig(project, { ...(await config(project)), layers: { domain: 'src/core', infrastructure: 'src/infrastructure' } });
    await write(path.join(project, 'src', 'core', 'bad.js'), "const express = require('express');\n");
    const check = json(await runQn(project, 'check', '--json'));
    assert.deepEqual(check.violations.map((violation) => violation.file), ['src/core/bad.js']);
    const generate = await runQn(project, 'generate', 'crud', 'product', '--json');
    assert.equal(json(generate).error.code, 'E_CONFIG_INVALID');
  });

  it('falls back to the layout for projects created before it', async (t) => {
    const project = await makeProject(t, 'typescript');
    await fs.rm(path.join(project, 'quicknode.json'));
    const result = json(await runQn(project, 'generate', 'entity', 'product', '--dry-run', '--json'));
    assert.ok(result.files.some((file) => file.path === 'src/infrastructure/database/entities/product-entity.ts'));
  });
});

describe('presets', () => {
  it('loads built-in presets, and command line flags win', async (t) => {
    const cwd = await makeTmp(t);
    const result = json(await runQn(cwd, 'create', 'app', '--preset', 'api-minima', '--pm', 'yarn', '--json'));
    assert.deepEqual([result.template, result.db, result.testRunner, result.pm, result.preset], ['typescript', 'none', 'node', 'yarn', 'api-minima']);
    assert.equal((await config(path.join(cwd, 'app'))).db, 'none');
  });

  it('reads a local JSON preset and validates it before anything is written', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'team.json'), JSON.stringify({ $schema: 'x', template: 'javascript', db: 'sqlite', credits: false }));
    const created = json(await runQn(cwd, 'create', 'app', '--preset', './team.json', '--json'));
    assert.deepEqual([created.template, created.db], ['javascript', 'sqlite']);
    assert.doesNotMatch(await read(cwd, 'app', 'README.md'), /Generated with/);

    await write(path.join(cwd, 'bad.json'), JSON.stringify({ template: 'go', install: true }));
    for (const [preset, message] of [
      ['./bad.json', /"template" must be one of/],
      ['./missing.json', /cannot be read/],
      ['nope', /Unknown preset "nope"/]
    ]) {
      const failed = await runQn(cwd, 'create', 'other', '--preset', preset, '--json');
      assert.equal(failed.code, 1);
      assert.equal(json(failed).error.code, 'E_PRESET_INVALID');
      assert.match(json(failed).error.message, message);
    }
    assert.equal(await exists(cwd, 'other'), false);
  });

  it('rejects unknown keys', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'p.json'), JSON.stringify({ db: 'none', orm: 'prisma' }));
    await assert.rejects(loadPreset('p.json', cwd), /unknown key\(s\) orm/);
  });
});

describe('create --db', () => {
  for (const [template, ext] of [
    ['typescript', 'ts'],
    ['javascript', 'js']
  ]) {
    it(`${template}: sqlite and none generate their own repositories, wired`, async (t) => {
      for (const db of ['sqlite', 'none']) {
        const project = await makeProject(t, template, '--db', db);
        assert.equal(await exists(project, 'docker-compose.yml'), false);
        const env = await read(project, '.env');
        assert.doesNotMatch(env, /DB_PASSWORD/);
        const { code } = await runQn(project, 'generate', 'crud', 'order-item');
        assert.equal(code, 0);
        const factory = await read(project, 'src/infrastructure/database', `repository-factory.${ext}`);
        assert.match(factory, db === 'sqlite' ? /SqliteOrderItemRepository/ : /InMemoryOrderItemRepository/);
        assert.equal(await exists(project, 'src/infrastructure/database/entities'), false);
        assert.equal(await exists(project, 'src/infrastructure/database/models'), false);
        const check = await runQn(project, 'check');
        assert.equal(check.code, 0);
      }
    });
  }

  it('healthcheck and graceful-shutdown use the connection of any database', async (t) => {
    const project = await makeProject(t, 'javascript', '--db', 'none');
    await runQn(project, 'add', 'healthcheck', 'graceful-shutdown');
    const server = await read(project, 'src', 'server.js');
    assert.match(server, /databaseConnection\.ping\(\)/);
    assert.match(server, /onShutdown: \(\) => databaseConnection\.close\(\)/);
  });
});

describe('qn env', () => {
  it('compares by name and never prints values', async (t) => {
    const project = await makeProject(t, 'typescript');
    const secret = parseEnv(await read(project, '.env')).get('JWT_SECRET');
    await fs.appendFile(path.join(project, '.env'), 'EXTRA_VAR=1\n');
    await fs.writeFile(path.join(project, '.env'), (await read(project, '.env')).replace(/^PORT=.*\n/m, ''));

    const text = await runQn(project, 'env');
    assert.equal(text.code, 1);
    assert.match(text.stdout, /Missing in \.env: PORT/);
    assert.match(text.stdout, /Not in \.env\.example: EXTRA_VAR/);
    const result = json(await runQn(project, 'env', '--json'));
    assert.deepEqual([result.missing, result.extra, result.placeholders], [['PORT'], ['EXTRA_VAR'], []]);
    for (const output of [text.stdout, JSON.stringify(result)]) assert.ok(!output.includes(secret));
  });

  it('--generate-secrets adds missing variables and fills placeholders, keeping real secrets unless --force', async (t) => {
    const project = await makeProject(t, 'typescript');
    const before = parseEnv(await read(project, '.env'));
    await fs.writeFile(path.join(project, '.env'), (await read(project, '.env')).replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD=change-me').replace(/^PORT=.*\n/m, ''));

    const dry = json(await runQn(project, 'env', '--generate-secrets', '--dry-run', '--json'));
    assert.deepEqual([dry.generated, dry.added, dry.written, dry.ok], [['DB_PASSWORD'], ['PORT'], false, false]);
    assert.match(await read(project, '.env'), /^DB_PASSWORD=change-me$/m);

    const applied = await runQn(project, 'env', '--generate-secrets');
    assert.equal(applied.code, 0);
    const after = parseEnv(await read(project, '.env'));
    assert.notEqual(after.get('DB_PASSWORD'), 'change-me');
    assert.equal(after.get('JWT_SECRET'), before.get('JWT_SECRET'));
    assert.equal(after.get('PORT'), '3000');
    assert.ok(!applied.stdout.includes(after.get('DB_PASSWORD')));

    await runQn(project, 'env', '--generate-secrets', '--force');
    assert.notEqual(parseEnv(await read(project, '.env')).get('JWT_SECRET'), before.get('JWT_SECRET'));
  });

  it('creates .env with owner-only permissions, and needs .env.example', async (t) => {
    const project = await makeProject(t, 'javascript');
    await fs.rm(path.join(project, '.env'));
    assert.equal((await runQn(project, 'env', '--generate-secrets')).code, 0);
    if (process.platform !== 'win32') assert.equal((await fs.stat(path.join(project, '.env'))).mode & 0o777, 0o600);
    assert.doesNotMatch(await read(project, '.env'), /change-me/);

    const empty = await makeTmp(t);
    assert.equal(json(await runQn(empty, 'env', '--json')).error.code, 'E_ENV_EXAMPLE_MISSING');
    assert.equal((await runQn(empty, 'env', '--dry-run')).code, 2);
  });

  it('completeEnv keeps comments and other lines', () => {
    const { content, generated, added } = completeEnv('# mine\nJWT_SECRET=\nPORT=1\n', 'PORT=3000\nJWT_SECRET=change-me\nAPI_TOKEN=change-me\nLOG=info\n');
    assert.match(content, /^# mine\nJWT_SECRET=\S{20,}\nPORT=1\n/);
    assert.deepEqual([generated, added], [['JWT_SECRET', 'API_TOKEN'], ['LOG']]);
    assert.deepEqual(compareEnv(content, 'PORT=3000\nJWT_SECRET=x\nAPI_TOKEN=x\nLOG=info\n'), { missing: [], extra: [], placeholders: [] });
  });
});

/** Pretends the project was generated by an older template whose `file` had `oldContent`. */
async function fromOlderTemplate(project, file, oldContent, { userContent = oldContent } = {}) {
  const recorded = await config(project);
  recorded.templateVersion = '0.9.0';
  recorded.files[file] = hashContent(oldContent);
  await writeConfig(project, recorded);
  await fs.writeFile(path.join(project, ...file.split('/')), userContent);
}

describe('qn upgrade', () => {
  it('has nothing to do right after create, even after generate and add', async (t) => {
    const project = await makeProject(t, 'typescript');
    await runQn(project, 'generate', 'crud', 'product');
    await runQn(project, 'add', 'healthcheck', 'rate-limit');
    const result = json(await runQn(project, 'upgrade', '--dry-run', '--json'));
    assert.deepEqual(result.files.filter((file) => file.action !== 'unchanged'), []);
  });

  it('updates files the user did not change and diffs the ones they did', async (t) => {
    const project = await makeProject(t, 'javascript');
    const readme = await read(project, 'README.md');
    const logger = 'src/infrastructure/logging/logger.js';
    const newLogger = await read(project, logger);
    await fromOlderTemplate(project, 'README.md', 'old readme\n');
    await fromOlderTemplate(project, logger, 'old logger\n', { userContent: 'my logger\n' });

    const dry = json(await runQn(project, 'upgrade', '--dry-run', '--json'));
    const byPath = Object.fromEntries(dry.files.map((file) => [file.path, file]));
    assert.equal(byPath['README.md'].action, 'update');
    assert.equal(byPath[logger].action, 'modified');
    assert.match(byPath[logger].diff, /^-my logger$/m);
    assert.equal(await read(project, 'README.md'), 'old readme\n');

    const applied = await runQn(project, 'upgrade', '--yes');
    assert.equal(applied.code, 0, applied.stderr);
    assert.equal(await read(project, 'README.md'), readme);
    assert.equal(await read(project, logger), 'my logger\n');
    assert.equal(await read(project, `${logger}.qn-new`), newLogger);
    const recorded = await config(project);
    assert.equal(recorded.templateVersion, getVersion());
    assert.equal(recorded.files['README.md'], hashContent(readme));
    assert.equal(recorded.files[logger], hashContent('old logger\n'), 'still counts as changed by the user');

    await fromOlderTemplate(project, logger, 'old logger\n', { userContent: 'my logger\n' });
    await runQn(project, 'upgrade', '--yes', '--force');
    assert.equal(await read(project, logger), newLogger);
  });

  it('keeps deleted files deleted, never deletes obsolete ones and creates new ones', async (t) => {
    const project = await makeProject(t, 'typescript');
    const recorded = await config(project);
    recorded.files['old-file.txt'] = hashContent('x');
    await writeConfig(project, recorded);
    await write(path.join(project, 'old-file.txt'), 'x');
    await fs.rm(path.join(project, 'docs', 'adr', 'README.md'));
    const newFile = 'docs/adr/0000-template.md';
    const content = await read(project, newFile);
    await fs.rm(path.join(project, newFile));
    const without = await config(project);
    delete without.files[newFile];
    await writeConfig(project, without);

    const result = json(await runQn(project, 'upgrade', '--yes', '--json'));
    const byPath = Object.fromEntries(result.files.map((file) => [file.path, file.action]));
    assert.deepEqual([byPath['docs/adr/README.md'], byPath['old-file.txt'], byPath[newFile]], ['deleted', 'obsolete', 'create']);
    assert.equal(await exists(project, 'docs', 'adr', 'README.md'), false);
    assert.equal(await exists(project, 'old-file.txt'), true);
    assert.equal(await read(project, newFile), content);
  });

  it('raises only the versions of dependencies the project already has', () => {
    const { packageJson, raised } = upgradeVersions(
      { dependencies: { express: '^4.0.0', mine: '1.0.0', newer: '^9.0.0' }, scripts: { dev: 'mine' } },
      { dependencies: { express: '^4.21.0', added: '^1.0.0', newer: '^8.0.0' }, scripts: { dev: 'theirs' } }
    );
    assert.deepEqual(packageJson, { dependencies: { express: '^4.21.0', mine: '1.0.0', newer: '^9.0.0' }, scripts: { dev: 'mine' } });
    assert.deepEqual(raised, ['express ^4.0.0 -> ^4.21.0']);
  });

  it('merges package.json versions when the user changed it', async (t) => {
    const project = await makeProject(t, 'typescript');
    const packageJson = JSON.parse(await read(project, 'package.json'));
    const wanted = packageJson.dependencies.express;
    packageJson.dependencies.express = '^4.0.0';
    packageJson.scripts.mine = 'echo mine';
    await fromOlderTemplate(project, 'package.json', 'older', { userContent: `${JSON.stringify(packageJson, null, 2)}\n` });

    const result = json(await runQn(project, 'upgrade', '--yes', '--json'));
    assert.match(result.notes.join('\n'), /raised express \^4\.0\.0 -> /);
    const after = JSON.parse(await read(project, 'package.json'));
    assert.equal(after.dependencies.express, wanted);
    assert.equal(after.scripts.mine, 'echo mine');
  });

  it('adopts projects without quicknode.json: every difference is a change by the user', async (t) => {
    const project = await makeProject(t, 'javascript');
    await fs.rm(path.join(project, 'quicknode.json'));
    await fs.appendFile(path.join(project, 'src', 'server.js'), '// mine\n');

    const result = json(await runQn(project, 'upgrade', '--yes', '--json'));
    assert.equal(result.from, 'unknown');
    const server = result.files.find((file) => file.path === 'src/server.js');
    assert.equal(server.action, 'modified');
    assert.match(await read(project, 'src', 'server.js'), /\/\/ mine\n$/);
    const adopted = await config(project);
    assert.equal(adopted.db, 'postgres');
    assert.equal(adopted.files['src/server.js'], undefined, 'no hash: it stays a file changed by the user');
    assert.equal(adopted.files['README.md'], hashContent(await read(project, 'README.md')));
  });

  it('asks for confirmation: --yes without a terminal, and refuses newer templates', async (t) => {
    const project = await makeProject(t, 'typescript');
    await fromOlderTemplate(project, 'README.md', 'old\n');
    const refused = await runQn(project, 'upgrade', '--json');
    assert.equal(json(refused).error.code, 'E_CONFIRM_REQUIRED');
    assert.match(json(refused).error.fix, /qn upgrade --json --yes/);
    assert.equal(await read(project, 'README.md'), 'old\n');

    const cancelled = await upgrade({ dryRun: false, yes: false, force: false }, { cwd: project, confirm: async () => false });
    assert.equal(cancelled.applied, false);
    assert.equal(await read(project, 'README.md'), 'old\n');

    const newer = await config(project);
    newer.templateVersion = '99.0.0';
    await writeConfig(project, newer);
    assert.equal(json(await runQn(project, 'upgrade', '--dry-run', '--json')).error.code, 'E_CLI_OUTDATED');
  });

  it('compares versions numerically', () => {
    assert.ok(compareVersions('3.10.0', '3.9.9') > 0);
    assert.equal(compareVersions('3.0.0', '3.0.0-beta.1'), 0);
    assert.ok(compareVersions('2.9.9', '3.0.0') < 0);
  });
});

describe('qn doctor (v3)', () => {
  it('skips Docker without PostgreSQL and tells when an upgrade is available', async (t) => {
    const project = await makeProject(t, 'typescript', '--db', 'sqlite');
    const result = json(await runQn(project, 'doctor', '--offline', '--json'));
    const byName = Object.fromEntries(result.checks.map((check) => [check.name, check]));
    assert.equal(byName.docker.status, 'skip');
    assert.equal(byName.template.status, 'ok');
    await fromOlderTemplate(project, 'README.md', 'x');
    const older = json(await runQn(project, 'doctor', '--offline', '--json'));
    assert.match(older.checks.find((check) => check.name === 'template').message, /qn upgrade --dry-run/);
  });
});

describe('qn mcp (v3)', () => {
  async function session(cwd, messages) {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    let text = '';
    stdout.on('data', (chunk) => (text += chunk));
    const done = runMcpServer({ stdin, stdout, cwd, version: getVersion() });
    stdin.end(messages.map((message) => JSON.stringify(message)).join('\n'));
    await done;
    return text.trim().split('\n').map((line) => JSON.parse(line).result.structuredContent);
  }
  const call = (id, name, args = {}) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

  it('plans env and upgrade by default and never runs programs from presets', async (t) => {
    const project = await makeProject(t, 'javascript');
    await fromOlderTemplate(project, 'README.md', 'old\n');
    await fs.rm(path.join(project, '.env'));
    const [env, plan, applied, created] = await session(project, [
      call(1, 'qn_env', { generateSecrets: true }),
      call(2, 'qn_upgrade'),
      call(3, 'qn_upgrade', { apply: true }),
      call(4, 'qn_create', { name: 'sub', preset: 'api-minima', db: 'sqlite' })
    ]);
    assert.equal(env.dryRun, true);
    assert.equal(await exists(project, '.env'), false);
    assert.equal(plan.dryRun, true);
    assert.equal(applied.applied, true);
    assert.notEqual(await read(project, 'README.md'), 'old\n');
    assert.deepEqual([created.db, created.testRunner, created.steps], ['sqlite', 'node', []]);
  });
});
