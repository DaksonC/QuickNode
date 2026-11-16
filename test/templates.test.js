import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { renderProject } from '../dist/core/render.js';
import { exists, makeProject, makeTmp, read, runQn } from './helpers.js';

const TEMPLATES = ['typescript', 'javascript'];
const DATABASES = ['postgres', 'sqlite', 'none'];
const config = JSON.parse(await read(fileURLToPath(new URL('../templates/common/.prettierrc.json', import.meta.url))));

describe('templates', () => {
  for (const template of TEMPLATES) {
    for (const db of DATABASES) {
      const label = `${template} + ${db}`;
      const render = () => renderProject({ template, db, pm: 'npm', test: 'jest', credits: true, packageName: 'app' });

      it(`${label}: every token is filled and CLAUDE.md is an exact copy of AGENTS.md`, async () => {
        const files = await render();
        for (const [file, { content }] of files) assert.doesNotMatch(content, /\{\{qn:/, file);
        const agents = files.get('AGENTS.md').content;
        assert.equal(files.get('CLAUDE.md').content, agents);
        for (const topic of ['Dependency rule', 'qn check', 'generate crud', 'npm test', 'npm run lint']) {
          assert.ok(agents.includes(topic), topic);
        }
      });

      it(`${label}: source code is formatted with the template Prettier config`, async () => {
        for (const [file, { content }] of await render()) {
          if (!/^src\/.*\.[jt]s$/.test(file)) continue;
          assert.ok(await prettier.check(content, { ...config, filepath: file }), file);
        }
      });

      it(`${label}: has every wiring marker used by qn generate and qn add`, async () => {
        const files = await render();
        const ext = template === 'typescript' ? 'ts' : 'js';
        const server = files.get(`src/server.${ext}`).content;
        for (const marker of ['imports', 'middleware', 'modules', 'shutdown:start', 'shutdown:end']) {
          assert.match(server, new RegExp(`// qn:${marker}\\n`), marker);
        }
        const factory = files.get(`src/infrastructure/database/repository-factory.${ext}`).content;
        for (const marker of ['imports', 'factories']) assert.match(factory, new RegExp(`// qn:${marker}\\n`), marker);
      });
    }
  }

  it('database add-ons change dependencies, scripts, .env.example and files', async () => {
    const render = (template, db) => renderProject({ template, db, pm: 'npm', test: 'jest', credits: true, packageName: 'app' });
    const pg = await render('typescript', 'postgres');
    const pgPackage = JSON.parse(pg.get('package.json').content);
    assert.ok(pgPackage.dependencies.typeorm && pgPackage.dependencies.pg);
    assert.equal(pgPackage.scripts['docker:up'], 'docker-compose up -d');
    assert.ok(pg.has('docker-compose.yml'));
    assert.match(pg.get('.env.example').content, /^DB_PASSWORD=change-me$/m);
    assert.match(pg.get('.env.example').content, /^JWT_SECRET=change-me$/m);

    const sqlite = await render('javascript', 'sqlite');
    const sqlitePackage = JSON.parse(sqlite.get('package.json').content);
    assert.equal(sqlitePackage.dependencies.sequelize, undefined);
    assert.equal(sqlitePackage.scripts['docker:up'], undefined);
    assert.ok(sqlitePackage.scripts['db:seed']);
    assert.equal(sqlite.has('docker-compose.yml'), false);
    assert.match(sqlite.get('.env.example').content, /^SQLITE_PATH=/m);
    assert.doesNotMatch(sqlite.get('.env.example').content, /DB_PASSWORD/);
    assert.match(sqlite.get('src/infrastructure/database/connection.js').content, /node:sqlite/);

    const none = await render('typescript', 'none');
    const nonePackage = JSON.parse(none.get('package.json').content);
    assert.equal(nonePackage.scripts['db:seed'], undefined);
    assert.equal(none.has('src/infrastructure/database/seeder.ts'), false);
    assert.equal(none.has('docker-compose.yml'), false);
    assert.match(none.get('README.md').content, /No database yet/);
    assert.doesNotMatch(none.get('README.md').content, /^- Docker/m);
  });
});

describe('create --pm and --test', () => {
  it('writes pnpm commands in scripts, hooks and docs', async (t) => {
    const project = await makeProject(t, 'typescript', '--pm', 'pnpm');
    const packageJson = JSON.parse(await read(project, 'package.json'));
    assert.equal(packageJson.scripts['db:setup'], 'pnpm run docker:up && sleep 5 && pnpm run db:seed');
    assert.match(await read(project, '.husky', 'pre-commit'), /^pnpm run lint/);
    assert.match(await read(project, '.husky', 'commit-msg'), /^pnpm exec commitlint/);
    assert.match(await read(project, 'AGENTS.md'), /pnpm test/);
    assert.doesNotMatch(await read(project, 'AGENTS.md'), /\bnpm run/);
  });

  it('switches to node:test: scripts, no Jest, test files import node:test', async (t) => {
    for (const template of TEMPLATES) {
      const project = await makeProject(t, template, '--test', 'node');
      const packageJson = JSON.parse(await read(project, 'package.json'));
      assert.match(packageJson.scripts.test, /--test "src\/\*\*\/\*\.test\.[jt]s"$/);
      for (const name of ['jest', 'ts-jest', '@types/jest', 'jest-extended']) assert.equal(packageJson.devDependencies[name], undefined);
      assert.equal(await exists(project, 'jest.config.js'), false);
      const tests = (await fs.readdir(path.join(project, 'src'), { recursive: true })).filter((file) => file.includes('.test.'));
      assert.ok(tests.length > 0);
      for (const file of tests) assert.match(await read(project, 'src', file), /node:test/, file);
    }
  });

  it('shows the package manager in dry runs and next steps', async (t) => {
    const cwd = await makeTmp(t);
    const dry = await runQn(cwd, 'create', 'app', '-js', '--pm', 'yarn', '--install', '--dry-run', '--test', 'node');
    assert.match(dry.stdout, /Then would run: yarn install/);
    assert.doesNotMatch(dry.stdout, /jest\.config\.js/);
    const created = await runQn(cwd, 'create', 'app', '-js', '--pm', 'yarn');
    assert.match(created.stdout, / {2}yarn install\n {2}yarn run docker:up/);
    const invalid = await runQn(cwd, 'create', 'other', '-js', '--pm', 'bun');
    assert.equal(invalid.code, 2);
    assert.match(invalid.stderr, /Invalid value "bun" for --pm/);
  });
});
