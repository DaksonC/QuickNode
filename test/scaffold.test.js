import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  listTemplateFiles,
  planScaffold,
  scaffold,
  STAGING_PREFIX,
  TargetNotEmptyError
} from '../dist/core/scaffold.js';

let root;
let template;

async function write(file, content = '') {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-scaffold-'));
  template = path.join(root, 'template');
  await write(path.join(template, 'package.json'), '{}');
  await write(path.join(template, 'README.md'), 'template readme');
  await write(path.join(template, 'src', 'server.js'), 'server');
  await write(path.join(template, 'gitignore'), '.env');
  await write(path.join(template, 'package-lock.json'), '{}');
  await write(path.join(template, 'node_modules', 'x', 'index.js'), '');
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const read = (file) => fs.readFile(file, 'utf8');
const stagingLeftovers = async (dir) => (await fs.readdir(dir)).filter((name) => name.startsWith(STAGING_PREFIX));

describe('listTemplateFiles', () => {
  it('lists files recursively, skipping lockfiles and node_modules', async () => {
    // Code-unit order (uppercase first), independent of locale/ICU.
    assert.deepEqual(await listTemplateFiles(template), [
      'README.md',
      'gitignore',
      'package.json',
      path.join('src', 'server.js')
    ]);
  });

  it('rejects symbolic links', async () => {
    await fs.symlink('/etc/passwd', path.join(template, 'evil'));
    await assert.rejects(listTemplateFiles(template), /symbolic link/);
  });
});

describe('scaffold', () => {
  it('creates a new directory with the template files', async () => {
    const target = path.join(root, 'app');
    await scaffold({ templateDir: template, targetDir: target });

    assert.equal(await read(path.join(target, 'src', 'server.js')), 'server');
    assert.equal(await read(path.join(target, '.gitignore')), '.env');
    await assert.rejects(fs.access(path.join(target, 'gitignore')));
    await assert.rejects(fs.access(path.join(target, 'package-lock.json')));
    assert.deepEqual(await stagingLeftovers(root), []);
  });

  it('creates the project root with umask permissions, not 0700', { skip: process.platform === 'win32' }, async () => {
    const target = path.join(root, 'app');
    await scaffold({ templateDir: template, targetDir: target });
    const expected = (await fs.stat(path.join(target, 'src'))).mode & 0o777;
    assert.equal((await fs.stat(target)).mode & 0o777, expected);
  });

  it('applies the transform before moving into place', async () => {
    const target = path.join(root, 'app');
    await scaffold({
      templateDir: template,
      targetDir: target,
      transform: (dir) => fs.writeFile(path.join(dir, '.env'), 'SECRET=1')
    });
    assert.equal(await read(path.join(target, '.env')), 'SECRET=1');
  });

  it('accepts an existing empty directory and one holding only .git', async () => {
    const target = path.join(root, 'app');
    await fs.mkdir(path.join(target, '.git'), { recursive: true });
    await scaffold({ templateDir: template, targetDir: target });
    assert.equal(await read(path.join(target, 'README.md')), 'template readme');
    assert.deepEqual(await stagingLeftovers(target), []);
  });

  it('refuses a non-empty directory and lists conflicts without writing', async () => {
    const target = path.join(root, 'app');
    await write(path.join(target, 'README.md'), 'mine');
    await write(path.join(target, '.gitignore'), 'mine');
    await write(path.join(target, 'notes.txt'), 'keep');

    await assert.rejects(scaffold({ templateDir: template, targetDir: target }), (error) => {
      assert.ok(error instanceof TargetNotEmptyError);
      assert.deepEqual(error.conflicts, ['README.md', '.gitignore']);
      assert.deepEqual(error.entries, ['.gitignore', 'README.md', 'notes.txt']);
      return true;
    });

    assert.equal(await read(path.join(target, 'README.md')), 'mine');
    assert.deepEqual((await fs.readdir(target)).sort(), ['.gitignore', 'README.md', 'notes.txt']);
  });

  it('overwrites conflicts with force but keeps other files and preserved ones', async () => {
    const target = path.join(root, 'app');
    await write(path.join(target, 'README.md'), 'mine');
    await write(path.join(target, 'notes.txt'), 'keep');
    await write(path.join(target, '.env'), 'USER_SECRET=1');

    await scaffold({
      templateDir: template,
      targetDir: target,
      force: true,
      preserve: ['.env'],
      transform: (dir) => fs.writeFile(path.join(dir, '.env'), 'GENERATED=1')
    });

    assert.equal(await read(path.join(target, 'README.md')), 'template readme');
    assert.equal(await read(path.join(target, 'notes.txt')), 'keep');
    assert.equal(await read(path.join(target, '.env')), 'USER_SECRET=1');
    assert.deepEqual(await stagingLeftovers(target), []);
  });

  it('leaves nothing behind when the transform fails', async () => {
    const target = path.join(root, 'app');
    await assert.rejects(
      scaffold({
        templateDir: template,
        targetDir: target,
        transform: async () => {
          throw new Error('boom');
        }
      }),
      /boom/
    );
    await assert.rejects(fs.access(target));
    assert.deepEqual(await stagingLeftovers(root), []);
  });

  it('ignores staging folders left by an interrupted run', async () => {
    const target = path.join(root, 'app');
    await fs.mkdir(path.join(target, `${STAGING_PREFIX}stale`), { recursive: true });
    const plan = await planScaffold(template, target);
    assert.deepEqual(plan.existingEntries, []);
    await scaffold({ templateDir: template, targetDir: target });
    assert.equal(await read(path.join(target, 'README.md')), 'template readme');
  });

  it('with force, refuses before writing when a path is blocked by another type', async () => {
    const target = path.join(root, 'app');
    await write(path.join(target, 'src'), 'a file where the template has a folder');
    await write(path.join(target, 'README.md'), 'mine');

    await assert.rejects(scaffold({ templateDir: template, targetDir: target, force: true }), /blocked/);
    assert.equal(await read(path.join(target, 'README.md')), 'mine');
    assert.deepEqual((await fs.readdir(target)).sort(), ['README.md', 'src']);
  });

  it('plans files, existing entries and conflicts', async () => {
    const target = path.join(root, 'app');
    await write(path.join(target, 'package.json'), '{}');
    await fs.mkdir(path.join(target, '.git'));
    const plan = await planScaffold(template, target);
    assert.deepEqual(plan.files, ['README.md', '.gitignore', 'package.json', path.join('src', 'server.js')]);
    assert.deepEqual(plan.existingEntries, ['package.json']);
    assert.deepEqual(plan.conflicts, ['package.json']);
    assert.deepEqual(plan.typeClashes, []);
  });

  it('refuses a target that is a file', async () => {
    const target = path.join(root, 'file');
    await write(target, 'x');
    await assert.rejects(planScaffold(template, target), /not a directory/);
  });
});
