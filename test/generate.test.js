import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import * as prettier from 'prettier';
import { featureNames, fillPlaceholders, generate, generateInputFromFlags } from '../dist/commands/generate.js';
import { ConflictError } from '../dist/core/changes.js';
import { NotQuickNodeProjectError } from '../dist/core/project.js';
import { UsageError } from '../dist/spec.js';
import { exists, makeProject, makeTmp, read, runQn } from './helpers.js';

const input = (type, name, extra = {}) => ({ type, name, test: true, dryRun: false, force: false, ...extra });

describe('featureNames', () => {
  it('derives every spelling from kebab, snake or camel case', () => {
    for (const raw of ['order-item', 'order_item', 'orderItem', 'OrderItem']) {
      assert.deepEqual(featureNames(raw), {
        Name: 'OrderItem',
        name: 'order-item',
        Names: 'OrderItems',
        names: 'order-items',
        table: 'order_items',
        label: 'order item',
        labels: 'order items',
        Label: 'Order item'
      });
    }
  });

  it('pluralizes common endings and keeps names that are already plural', () => {
    const plural = (name) => featureNames(name).names;
    assert.equal(plural('category'), 'categories');
    assert.equal(plural('day'), 'days');
    assert.equal(plural('address'), 'addresses');
    assert.equal(plural('status'), 'statuses');
    assert.equal(plural('box'), 'boxes');
    assert.equal(plural('items'), 'items');
  });

  it('rejects invalid, reserved and too long names', () => {
    for (const bad of ['1product', 'pro duct', '../x', 'a--b', '', 'delete', 'a'.repeat(21)]) {
      assert.throws(() => featureNames(bad), UsageError, bad);
    }
  });

  it('fills placeholders', () => {
    assert.equal(fillPlaceholders('__Name__ __names__ __table__ __Label__', featureNames('order-item')), 'OrderItem order-items order_items Order item');
  });
});

describe('generateInputFromFlags', () => {
  it('reads type, name and options', () => {
    assert.deepEqual(generateInputFromFlags(['crud', 'product'], { only: 'entity, usecase', 'no-test': true }), {
      type: 'crud',
      name: 'product',
      only: ['entity', 'usecase'],
      test: false,
      dryRun: false,
      force: false
    });
  });

  it('rejects missing or unknown values', () => {
    assert.throws(() => generateInputFromFlags([], {}), /Missing type/);
    assert.throws(() => generateInputFromFlags(['crud'], {}), /Missing name/);
    assert.throws(() => generateInputFromFlags(['nope', 'x'], {}), /Unknown type/);
    assert.throws(() => generateInputFromFlags(['crud', 'a', 'b'], {}), /Only one name/);
    assert.throws(() => generateInputFromFlags(['entity', 'a'], { only: 'entity' }), /--only works with "crud" only/);
    assert.throws(() => generateInputFromFlags(['crud', 'a'], { only: 'entity,view' }), /Invalid --only/);
  });
});

for (const template of ['typescript', 'javascript']) {
  const ext = template === 'typescript' ? 'ts' : 'js';

  describe(`generate (${template})`, () => {
    it('crud creates every layer and wires it, and a second run changes nothing', async (t) => {
      const root = await makeProject(t, template);
      const result = await generate(input('crud', 'order-item'), root);

      assert.deepEqual(result.parts, ['entity', 'repository', 'usecase', 'controller', 'test']);
      assert.deepEqual(result.notes, []);
      assert.ok(result.wiring.every((wire) => wire.status === 'inserted'));
      for (const file of [
        `src/domain/entities/order-item.${ext}`,
        `src/domain/repositories/order-item-repository.${ext}`,
        `src/domain/use-cases/order-item-use-cases.${ext}`,
        `src/infrastructure/controllers/order-item-controller.${ext}`,
        `src/infrastructure/routes/order-item-routes.${ext}`,
        `src/infrastructure/modules/order-item-module.${ext}`
      ]) {
        assert.ok(await exists(root, file), file);
      }
      const server = await read(root, 'src', `server.${ext}`);
      assert.match(server, /registerOrderItemModule\(app\);\n\s*\/\/ qn:modules/);
      assert.match(await read(root, 'src', 'infrastructure', 'modules', `order-item-module.${ext}`), /'\/api\/v1\/order-items'/);

      const again = await generate(input('crud', 'order-item'), root);
      assert.ok(again.files.every((file) => file.action === 'unchanged'));
      assert.ok(again.wiring.every((wire) => wire.status === 'present'));
    });

    it('writes code that Prettier accepts with the template config, for short and long names', async (t) => {
      const root = await makeProject(t, template);
      const config = JSON.parse(await read(root, '.prettierrc.json'));
      for (const name of ['ab', 'warehouse-stock-entry', 'abcdefghij-klmnopqrst']) {
        await generate(input('crud', name), root);
      }
      const files = (await fs.readdir(path.join(root, 'src'), { recursive: true })).filter((file) => file.endsWith(`.${ext}`));
      for (const file of files) {
        const source = await read(root, 'src', file);
        assert.ok(await prettier.check(source, { ...config, filepath: file }), `${file} is not formatted`);
      }
    });

    it('--only, --no-test and missing parts', async (t) => {
      const root = await makeProject(t, template);
      const result = await generate(input('crud', 'product', { only: ['entity'], test: false }), root);
      assert.deepEqual(result.parts, ['entity']);

      const repository = await generate(input('usecase', 'invoice', { test: false }), root);
      assert.deepEqual(repository.parts, ['usecase']);
      assert.deepEqual(repository.notes, [
        `usecase needs src/domain/entities/invoice.${ext}: run "qn generate entity invoice".`,
        `usecase needs src/domain/repositories/invoice-repository.${ext}: run "qn generate repository invoice".`
      ]);
    });

    it('--dry-run writes nothing and shows the diff of edited files', async (t) => {
      const root = await makeProject(t, template);
      const before = await read(root, 'src', `server.${ext}`);
      const result = await generate(input('crud', 'product', { dryRun: true }), root);
      assert.equal(await read(root, 'src', `server.${ext}`), before);
      assert.equal(await exists(root, 'src', 'domain', 'entities', `product.${ext}`), false);
      const server = result.files.find((file) => file.path === `src/server.${ext}`);
      assert.equal(server.action, 'update');
      assert.match(server.diff, /\+.*registerProductModule\(app\);/);
    });

    it('refuses to overwrite changed files unless --force', async (t) => {
      const root = await makeProject(t, template);
      await generate(input('entity', 'product'), root);
      const file = path.join(root, 'src', 'domain', 'entities', `product.${ext}`);
      await fs.writeFile(file, 'mine');
      await assert.rejects(generate(input('entity', 'product'), root), ConflictError);
      assert.equal(await fs.readFile(file, 'utf8'), 'mine');
      await generate(input('entity', 'product', { force: true }), root);
      assert.notEqual(await fs.readFile(file, 'utf8'), 'mine');
    });

    it('explains the wiring when a marker was removed', async (t) => {
      const root = await makeProject(t, template);
      const server = path.join(root, 'src', `server.${ext}`);
      await fs.writeFile(server, (await fs.readFile(server, 'utf8')).replace('// qn:modules', ''));
      const result = await generate(input('controller', 'product'), root);
      assert.equal(result.wiring.find((wire) => wire.marker === 'modules').status, 'missing');
      assert.ok(result.notes.some((note) => note.includes('"// qn:modules" marker was not found') && note.includes('registerProductModule(app);')));
    });
  });
}

describe('generate with node:test', () => {
  it('imports describe and it from node:test in generated tests', async (t) => {
    const root = await makeProject(t, 'typescript', '--test', 'node');
    await generate(input('crud', 'product'), root);
    const test = await read(root, 'src', '__tests__', 'use-cases', 'product-use-cases.test.ts');
    assert.match(test, /^import \{ beforeEach, describe, it \} from 'node:test';/);
  });
});

describe('qn generate (CLI)', () => {
  it('prints the files, supports the g alias and --json', async (t) => {
    const root = await makeProject(t, 'javascript');
    const text = await runQn(root, 'g', 'crud', 'product', '--dry-run');
    assert.equal(text.code, 0);
    assert.match(text.stdout, /Dry run: nothing was written/);
    assert.match(text.stdout, /\+ src\/domain\/entities\/product\.js/);

    const json = JSON.parse((await runQn(root, 'generate', 'entity', 'product', '--json')).stdout);
    assert.equal(json.ok, true);
    assert.deepEqual(json.parts, ['entity']);
  });

  it('fails clearly outside a project and on conflicts', async (t) => {
    const outside = await runQn(await makeTmp(t), 'g', 'crud', 'product', '--json');
    assert.equal(outside.code, 1);
    assert.equal(JSON.parse(outside.stdout).error.code, 'NOT_QUICKNODE_PROJECT');

    const root = await makeProject(t, 'javascript');
    await runQn(root, 'g', 'entity', 'product');
    await fs.writeFile(path.join(root, 'src', 'domain', 'entities', 'product.js'), 'mine');
    const dry = await runQn(root, 'g', 'entity', 'product', '--dry-run', '--json');
    assert.equal(dry.code, 1);
    assert.equal(JSON.parse(dry.stdout).ok, false);
    const conflict = await runQn(root, 'g', 'entity', 'product');
    assert.equal(conflict.code, 1);
    assert.match(conflict.stderr, /--force/);
    assert.match(conflict.stderr, /- src\/domain\/entities\/product\.js/);
  });

  it('rejects an unknown type with a usage error', async (t) => {
    const { code, stderr } = await runQn(await makeTmp(t), 'g', 'page', 'x');
    assert.equal(code, 2);
    assert.match(stderr, /Unknown type "page"/);
  });
});

it('generate requires a project', async (t) => {
  await assert.rejects(generate(input('crud', 'x'), await makeTmp(t)), NotQuickNodeProjectError);
});
