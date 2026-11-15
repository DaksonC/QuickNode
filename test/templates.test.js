import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { exists, makeProject, makeTmp, read, runQn } from './helpers.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const TEMPLATES = ['typescript', 'javascript'];

describe('templates', () => {
  for (const template of TEMPLATES) {
    const dir = path.join(root, 'templates', template);

    it(`${template}: CLAUDE.md is an exact copy of AGENTS.md`, async () => {
      const agents = await read(dir, 'AGENTS.md');
      assert.equal(await read(dir, 'CLAUDE.md'), agents);
      for (const topic of ['Dependency rule', 'qn check', 'generate crud', 'npm test', 'npm run lint']) {
        assert.ok(agents.includes(topic), topic);
      }
    });

    it(`${template}: source code is formatted with the template Prettier config`, async () => {
      const config = JSON.parse(await read(dir, '.prettierrc.json'));
      const files = (await fs.readdir(path.join(dir, 'src'), { recursive: true })).filter((file) => /\.[jt]s$/.test(file));
      for (const file of files) {
        assert.ok(await prettier.check(await read(dir, 'src', file), { ...config, filepath: file }), file);
      }
    });

    it(`${template}: has every wiring marker used by qn generate and qn add`, async () => {
      const ext = template === 'typescript' ? 'ts' : 'js';
      const server = await read(dir, 'src', `server.${ext}`);
      for (const marker of ['imports', 'middleware', 'modules', 'shutdown:start', 'shutdown:end']) {
        assert.match(server, new RegExp(`// qn:${marker}\\n`), marker);
      }
    });
  }
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
