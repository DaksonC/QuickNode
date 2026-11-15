import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import * as prettier from 'prettier';
import { addInputFromFlags, addRecipes } from '../dist/commands/add.js';
import { fillRecipeTokens } from '../dist/core/recipes.js';
import { RECIPES } from '../dist/spec.js';
import { exists, makeProject, read, runQn } from './helpers.js';

const add = (root, recipes, extra = {}) => addRecipes({ recipes, dryRun: false, force: false, ...extra }, root);
const NEW_RECIPES = ['auth', 'ci', 'docker', 'graceful-shutdown', 'healthcheck', 'rate-limit'];
const BUILT_IN = ['agents', 'eslint', 'husky', 'swagger', 'tests'];

for (const template of ['typescript', 'javascript']) {
  const ext = template === 'typescript' ? 'ts' : 'js';

  describe(`qn add (${template})`, () => {
    it('finds the built-in recipes already in place in a new project', async (t) => {
      const root = await makeProject(t, template);
      const result = await add(root, BUILT_IN);
      assert.deepEqual(
        result.recipes.map((recipe) => recipe.status),
        BUILT_IN.map(() => 'already-applied')
      );
      assert.deepEqual(result.files.filter((file) => file.action !== 'unchanged'), []);
    });

    it('applies every new recipe once; a second run changes nothing', async (t) => {
      const root = await makeProject(t, template);
      const result = await add(root, NEW_RECIPES);
      assert.ok(result.recipes.every((recipe) => recipe.status === 'applied'));

      const server = await read(root, 'src', `server.${ext}`);
      assert.match(server, /app\.use\(rateLimit\(\)\);/);
      assert.match(server, /app\.use\('\/health', createHealthRoutes\(\{ database: databaseCheck \}\)\);/);
      assert.match(server, /registerGracefulShutdown\(server, \{ logger, onShutdown: /);
      assert.doesNotMatch(server, /qn:shutdown:start/);
      for (const file of ['Dockerfile', '.github/workflows/ci.yml', `src/infrastructure/auth/jwt.${ext}`]) {
        assert.ok(await exists(root, file), file);
      }
      const env = await read(root, '.env.example');
      assert.match(env, /RATE_LIMIT_MAX=100/);
      assert.equal(env.match(/^JWT_SECRET=/gm).length, 1);
      assert.match(JSON.parse(await read(root, 'package.json')).scripts['docker:build'], /^docker build -t app \.$/);
      assert.ok(result.notes.some((note) => note.includes('npm install')));

      const again = await add(root, [...NEW_RECIPES, ...BUILT_IN]);
      assert.ok(again.recipes.every((recipe) => recipe.status === 'already-applied'));
      assert.ok(again.files.every((file) => file.action === 'unchanged'));
    });

    it('writes code that Prettier accepts', async (t) => {
      const root = await makeProject(t, template);
      const config = JSON.parse(await read(root, '.prettierrc.json'));
      const result = await add(root, NEW_RECIPES);
      for (const { path: file } of result.files.filter((change) => change.path.endsWith(`.${ext}`))) {
        assert.ok(await prettier.check(await read(root, file), { ...config, filepath: file }), `${file} is not formatted`);
      }
    });

    it('restores removed tools from the template', async (t) => {
      const root = await makeProject(t, template);
      await fs.rm(path.join(root, 'eslint.config.mjs'));
      const packageJson = JSON.parse(await read(root, 'package.json'));
      delete packageJson.devDependencies.eslint;
      delete packageJson.scripts.lint;
      await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));

      await add(root, ['eslint']);
      const restored = JSON.parse(await read(root, 'package.json'));
      assert.ok(restored.devDependencies.eslint);
      assert.equal(restored.scripts.lint, 'eslint src');
      assert.ok(await exists(root, 'eslint.config.mjs'));
    });
  });
}

describe('qn add details', () => {
  it('--dry-run shows diffs and writes nothing', async (t) => {
    const root = await makeProject(t, 'typescript');
    const before = await read(root, 'src', 'server.ts');
    const result = await add(root, ['rate-limit'], { dryRun: true });
    assert.equal(await read(root, 'src', 'server.ts'), before);
    assert.equal(await exists(root, 'src', 'infrastructure', 'middleware', 'rate-limit.ts'), false);
    assert.match(result.files.find((file) => file.path === 'src/server.ts').diff, /\+app\.use\(rateLimit\(\)\);/);
    assert.match(result.files.find((file) => file.path.endsWith('rate-limit.ts')).diff, /^--- \/dev\/null/);
  });

  it('keeps package.json values the user changed and says so', async (t) => {
    const root = await makeProject(t, 'javascript');
    const packageJson = JSON.parse(await read(root, 'package.json'));
    packageJson.scripts.lint = 'eslint .';
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));
    const result = await add(root, ['eslint']);
    assert.equal(JSON.parse(await read(root, 'package.json')).scripts.lint, 'eslint .');
    assert.ok(result.notes.some((note) => note.includes('kept your "lint"')));
  });

  it('explains what to do when the server markers are gone', async (t) => {
    const root = await makeProject(t, 'javascript');
    const server = path.join(root, 'src', 'server.js');
    const content = (await fs.readFile(server, 'utf8')).replace('// qn:middleware', '').replace(/\/\/ qn:shutdown:(start|end)/g, '');
    await fs.writeFile(server, content);
    const result = await add(root, ['rate-limit', 'graceful-shutdown']);
    assert.ok(result.notes.some((note) => note.includes('no "// qn:middleware" marker found')));
    assert.ok(result.notes.some((note) => note.includes('replace your own shutdown code')));
  });

  it('treats github-actions as ci and ignores repeated names', async (t) => {
    const root = await makeProject(t, 'javascript');
    assert.deepEqual(addInputFromFlags(['ci', 'ci'], {}).recipes, ['ci']);
    await add(root, ['github-actions']);
    assert.ok(await exists(root, '.github', 'workflows', 'ci.yml'));
    assert.equal((await add(root, ['ci'])).recipes[0].status, 'already-applied');
  });

  it('adapts Dockerfile and CI to the package manager', () => {
    const ctx = (pm, language) => ({ project: { packageManager: pm, language, packageJson: { name: 'api' } }, templatePackage: {} });
    const text = '__corepack__\nRUN __installProd__\n__buildStep__\n';
    assert.equal(fillRecipeTokens(text, ctx('npm', 'javascript')), 'RUN npm ci --omit=dev --ignore-scripts\n');
    assert.equal(
      fillRecipeTokens(text, ctx('pnpm', 'typescript')),
      'RUN corepack enable\nRUN pnpm install --frozen-lockfile --prod --ignore-scripts\n      - run: pnpm run build\n'
    );
  });

  it('needs at least one known recipe', async (t) => {
    const root = await makeProject(t, 'javascript');
    const none = await runQn(root, 'add');
    assert.equal(none.code, 2);
    assert.match(none.stderr, new RegExp(RECIPES.join(', ')));
    const unknown = await runQn(root, 'add', 'kafka');
    assert.equal(unknown.code, 2);
    assert.match(unknown.stderr, /Unknown recipe "kafka"/);
  });

  it('prints what changed and what to do next', async (t) => {
    const root = await makeProject(t, 'typescript');
    const { code, stdout } = await runQn(root, 'add', 'auth', 'agents');
    assert.equal(code, 0);
    assert.match(stdout, /✔ auth/);
    assert.match(stdout, /= agents: already in place/);
    assert.match(stdout, /\+ src\/infrastructure\/middleware\/auth\.ts/);
    assert.match(stdout, /authenticate\(\)/);
  });
});
