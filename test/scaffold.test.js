import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  assertWritable,
  PathBlockedError,
  planScaffold,
  STAGING_PREFIX,
  TargetNotEmptyError,
  writeScaffold
} from '../dist/core/scaffold.js';
import { listTemplateFiles } from '../dist/core/templates.js';
import { exists, makeTmp, read, write } from './helpers.js';

/** A small template plus an "app" target path inside a temp dir. */
async function setup(t) {
  const root = await makeTmp(t, 'qn-scaffold-');
  const template = path.join(root, 'template');
  await write(path.join(template, 'package.json'), '{}');
  await write(path.join(template, 'README.md'), 'template readme');
  await write(path.join(template, 'src', 'server.js'), 'server');
  await write(path.join(template, 'gitignore'), '.env');
  await write(path.join(template, 'package-lock.json'), '{}');
  await write(path.join(template, 'node_modules', 'x', 'index.js'), '');
  return { root, template, target: path.join(root, 'app') };
}

const stagingLeftovers = async (dir) => (await fs.readdir(dir)).filter((name) => name.startsWith(STAGING_PREFIX));

/** Rendered files of a small project, as qn create passes them. */
const FILES = { '.gitignore': '.env', 'README.md': 'template readme', 'package.json': '{}', 'src/server.js': 'server' };

/** plan + assert + write, as the create command does. */
async function scaffold({ target, force = false, preserve, transform }) {
  const plan = await planScaffold({ files: Object.keys(FILES), targetDir: target, preserve });
  assertWritable(plan, force);
  await writeScaffold(plan, {
    populate: async (dir) => {
      for (const [file, content] of Object.entries(FILES)) await write(path.join(dir, file), content);
      if (transform) await transform(dir);
    }
  });
  return plan;
}

describe('listTemplateFiles', () => {
  it('lists files recursively in code-unit order, skipping lockfiles and node_modules', async (t) => {
    const { template } = await setup(t);
    assert.deepEqual(await listTemplateFiles(template), [
      'README.md',
      'gitignore',
      'package.json',
      path.join('src', 'server.js')
    ]);
  });

  it('lists nothing for a folder that does not exist', async (t) => {
    const { root } = await setup(t);
    assert.deepEqual(await listTemplateFiles(path.join(root, 'missing')), []);
  });

  it('rejects symbolic links', async (t) => {
    const { template } = await setup(t);
    await fs.symlink('/etc/passwd', path.join(template, 'evil'));
    await assert.rejects(listTemplateFiles(template), /symbolic link/);
  });
});

describe('planScaffold', () => {
  it('plans a new directory', async (t) => {
    const { target } = await setup(t);
    const plan = await planScaffold({ files: Object.keys(FILES), targetDir: target });
    assert.equal(plan.targetExists, false);
    assert.deepEqual(plan.files, ['.gitignore', 'README.md', 'package.json', path.join('src', 'server.js')]);
    assert.deepEqual([plan.existingEntries, plan.conflicts, plan.blocked, plan.preserved], [[], [], [], []]);
  });

  it('reports existing entries, conflicts and preserved files, ignoring .git and staging leftovers', async (t) => {
    const { target } = await setup(t);
    await write(path.join(target, 'package.json'), '{}');
    await write(path.join(target, '.env'), 'MINE=1');
    await fs.mkdir(path.join(target, '.git'));
    await fs.mkdir(path.join(target, `${STAGING_PREFIX}stale`));

    const plan = await planScaffold({ files: Object.keys(FILES), targetDir: target, preserve: ['.env'] });
    assert.deepEqual(plan.existingEntries, ['.env', 'package.json']);
    assert.deepEqual(plan.conflicts, ['package.json']);
    assert.deepEqual(plan.preserved, ['.env']);
    assert.deepEqual(plan.blocked, []);
  });

  it('reports paths blocked by another file type', async (t) => {
    const { target } = await setup(t);
    await write(path.join(target, 'src'), 'file where the template has a folder');
    await fs.mkdir(path.join(target, 'README.md'));
    const plan = await planScaffold({ files: Object.keys(FILES), targetDir: target });
    assert.deepEqual(plan.blocked, ['README.md', path.join('src', 'server.js')]);
  });

  it('refuses a target that is a file', async (t) => {
    const { root } = await setup(t);
    await write(path.join(root, 'file'), 'x');
    await assert.rejects(planScaffold({ files: Object.keys(FILES), targetDir: path.join(root, 'file') }), /not a directory/);
  });
});

describe('assertWritable', () => {
  const plan = (overrides) => ({ targetDir: '/t', existingEntries: [], conflicts: [], blocked: [], ...overrides });

  it('accepts an empty target', () => assert.doesNotThrow(() => assertWritable(plan())));

  it('refuses a non-empty target without force', () => {
    assert.throws(
      () => assertWritable(plan({ existingEntries: ['a'], conflicts: ['a'] })),
      (error) => error instanceof TargetNotEmptyError && error.code === 'E_DIR_NOT_EMPTY'
    );
  });

  it('refuses blocked paths even with force', () => {
    assert.throws(
      () => assertWritable(plan({ existingEntries: ['src'], blocked: ['src/x'] }), true),
      (error) => error instanceof PathBlockedError && error.paths[0] === 'src/x'
    );
  });
});

describe('writeScaffold', () => {
  it('creates a new directory with umask permissions and no leftovers', async (t) => {
    const { root, target } = await setup(t);
    await scaffold({ target });

    assert.equal(await read(target, 'src', 'server.js'), 'server');
    assert.equal(await read(target, '.gitignore'), '.env');
    assert.deepEqual(await stagingLeftovers(root), []);
    if (process.platform !== 'win32') {
      const expected = (await fs.stat(path.join(target, 'src'))).mode & 0o777;
      assert.equal((await fs.stat(target)).mode & 0o777, expected);
    }
  });

  it('populates the staging folder before moving into place', async (t) => {
    const { target } = await setup(t);
    await scaffold({ target, transform: (dir) => fs.writeFile(path.join(dir, '.env'), 'SECRET=1') });
    assert.equal(await read(target, '.env'), 'SECRET=1');
  });

  it('writes into a directory holding only .git', async (t) => {
    const { target } = await setup(t);
    await fs.mkdir(path.join(target, '.git'), { recursive: true });
    await scaffold({ target });
    assert.equal(await read(target, 'README.md'), 'template readme');
    assert.deepEqual(await stagingLeftovers(target), []);
  });

  it('with force, overwrites conflicts but keeps other and preserved files', async (t) => {
    const { target } = await setup(t);
    await write(path.join(target, 'README.md'), 'mine');
    await write(path.join(target, 'notes.txt'), 'keep');
    await write(path.join(target, '.env'), 'USER_SECRET=1');

    await scaffold({
      target,
      force: true,
      preserve: ['.env'],
      transform: (dir) => fs.writeFile(path.join(dir, '.env'), 'GENERATED=1')
    });

    assert.equal(await read(target, 'README.md'), 'template readme');
    assert.equal(await read(target, 'notes.txt'), 'keep');
    assert.equal(await read(target, '.env'), 'USER_SECRET=1');
    assert.deepEqual(await stagingLeftovers(target), []);
  });

  it('leaves nothing behind when the transform fails', async (t) => {
    const { root, target } = await setup(t);
    const transform = async () => {
      throw new Error('boom');
    };
    await assert.rejects(scaffold({ target, transform }), /boom/);
    assert.equal(await exists(target), false);
    assert.deepEqual(await stagingLeftovers(root), []);
  });
});
