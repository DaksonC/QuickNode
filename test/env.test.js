import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvFile, fillSecrets } from '../dist/core/env.js';

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
  it('writes .env from .env.example with owner-only permissions', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-env-'));
    try {
      await fs.writeFile(path.join(dir, '.env.example'), example);
      assert.equal(await createEnvFile(dir), true);
      const env = await fs.readFile(path.join(dir, '.env'), 'utf8');
      assert.doesNotMatch(env, /change-me/);
      if (process.platform !== 'win32') {
        assert.equal((await fs.stat(path.join(dir, '.env'))).mode & 0o777, 0o600);
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('returns false when there is no .env.example', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-env-'));
    try {
      assert.equal(await createEnvFile(dir), false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
