import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { resolveProject, validateProjectName } from '../dist/core/project-name.js';

const cwd = path.resolve('/work/projects');

describe('validateProjectName', () => {
  for (const name of ['my-app', 'api', 'app.v2', 'a_b', '123']) {
    it(`accepts "${name}"`, () => assert.equal(validateProjectName(name), undefined));
  }

  const invalid = {
    '': 'empty',
    'My-App': 'lowercase',
    '../escaped': 'path separators',
    '..': '".."',
    'a/b': 'path separators',
    'a\\b': 'path separators',
    '/abs': 'path separators',
    '.hidden': 'start with',
    '_private': 'start with',
    'has space': 'can only contain',
    'my~app': 'can only contain',
    'app(1)': 'can only contain',
    ' padded': 'leading or trailing',
    'node_modules': 'reserved',
    'http': 'core module',
    [`${'a'.repeat(215)}`]: 'longer than'
  };
  for (const [name, reason] of Object.entries(invalid)) {
    it(`rejects "${name.slice(0, 20)}" (${reason})`, () => {
      assert.match(validateProjectName(name) ?? '', new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }
});

describe('resolveProject', () => {
  it('resolves a subdirectory of cwd', () => {
    assert.deepEqual(resolveProject('my-app', cwd), {
      packageName: 'my-app',
      targetDir: path.join(cwd, 'my-app'),
      inCurrentDir: false
    });
  });

  it('throws on path traversal', () => {
    assert.throws(() => resolveProject('../escaped', cwd), /Invalid project name/);
  });

  it('uses the folder name for "." when it is a valid package name', () => {
    assert.deepEqual(resolveProject('.', cwd), { packageName: 'projects', targetDir: cwd, inCurrentDir: true });
  });

  it('falls back to a default package name for "." with an invalid folder name', () => {
    const odd = path.resolve('/work/My Project');
    assert.equal(resolveProject('.', odd).packageName, 'quicknode-app');
  });
});
