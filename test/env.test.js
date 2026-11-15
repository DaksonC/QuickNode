import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvFile, fillSecrets } from '../dist/core/env.js';
import { makeTmp, read } from './helpers.js';

const example = ['PORT=3000', 'DB_PASSWORD=change-me', '# JWT_SECRET=commented', 'JWT_SECRET=change-me', ''].join('\n');

describe('fillSecrets', () => {
  it('replaces only the secret variables, keeping other lines', () => {
    const lines = fillSecrets(example).split('\n');
    assert.equal(lines[0], 'PORT=3000');
    assert.match(lines[1], /^DB_PASSWORD=[0-9a-f]{48}$/);
    assert.equal(lines[2], '# JWT_SECRET=commented');
    assert.match(lines[3], /^JWT_SECRET=[A-Za-z0-9_-]{64}$/);
    assert.equal(lines[4], '');
  });

  it('generates different secrets on each call', () => {
    assert.notEqual(fillSecrets(example), fillSecrets(example));
  });
});

describe('createEnvFile', () => {
  it('writes .env from .env.example with owner-only permissions', async (t) => {
    const dir = await makeTmp(t, 'qn-env-');
    await fs.writeFile(path.join(dir, '.env.example'), example);
    assert.equal(await createEnvFile(dir), true);
    assert.doesNotMatch(await read(dir, '.env'), /change-me/);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(path.join(dir, '.env'))).mode & 0o777, 0o600);
    }
  });

  it('returns false when there is no .env.example', async (t) => {
    assert.equal(await createEnvFile(await makeTmp(t, 'qn-env-')), false);
  });
});
