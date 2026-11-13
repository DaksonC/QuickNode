import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { listTemplateFiles, planScaffold, scaffold, TargetNotEmptyError } from '../dist/core/scaffold.js';

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
const stagingLeftovers = async (dir) => (await fs.readdir(dir)).filter((name) => name.startsWith('.qn-staging-'));

describe('listTemplateFiles', () => {
  it('lists files recursively, skipping lockfiles and node_modules', async () => {
    assert.deepEqual(await listTemplateFiles(template), [
      'gitignore',
      'package.json',
      'README.md',
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
      assert.deepEqual(error.conflicts, ['.gitignore', 'README.md']);
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

  it('refuses a target that is a file', async () => {
    const target = path.join(root, 'file');
    await write(target, 'x');
    await assert.rejects(planScaffold(template, target), /not a directory/);
  });
});
