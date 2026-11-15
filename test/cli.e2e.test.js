import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
let cwd;

const qn = (...args) => run(process.execPath, [cli, ...args], { cwd, env: { ...process.env, NO_COLOR: '1' } });
const read = (...parts) => fs.readFile(path.join(cwd, ...parts), 'utf8');

beforeEach(async () => {
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-e2e-'));
});

afterEach(async () => {
  await fs.rm(cwd, { recursive: true, force: true });
});

describe('qn create', () => {
  for (const [flag, entry] of [
    ['-ts', path.join('src', 'server.ts')],
    ['-js', path.join('src', 'server.js')]
  ]) {
    it(`generates the ${flag} template with name, secrets and no lockfile`, async () => {
      await qn('create', 'demo-app', flag);

      const pkg = JSON.parse(await read('demo-app', 'package.json'));
      assert.equal(pkg.name, 'demo-app');
      await fs.access(path.join(cwd, 'demo-app', entry));
      await assert.rejects(fs.access(path.join(cwd, 'demo-app', 'package-lock.json')));
      assert.match(await read('demo-app', '.gitignore'), /^\.env$/m);

      const env = await read('demo-app', '.env');
      assert.match(env, /^JWT_SECRET=[A-Za-z0-9_-]{64}$/m);
      assert.match(env, /^DB_PASSWORD=[0-9a-f]{48}$/m);
      assert.doesNotMatch(await read('demo-app', 'docker-compose.yml'), /POSTGRES_PASSWORD: password/);
    });
  }

  it('rejects path traversal without creating anything', async () => {
    const inner = path.join(cwd, 'inner');
    await fs.mkdir(inner);
    await assert.rejects(
      run(process.execPath, [cli, 'create', '../escaped', '-ts'], { cwd: inner }),
      (error) => /Invalid project name/.test(error.stderr)
    );
    await assert.rejects(fs.access(path.join(cwd, 'escaped')));
  });

  it('does not overwrite an existing project without --force', async () => {
    await fs.mkdir(path.join(cwd, 'demo-app'));
    await fs.writeFile(path.join(cwd, 'demo-app', 'README.md'), 'mine');

    await assert.rejects(qn('create', 'demo-app', '-ts'), (error) => {
      assert.match(error.stderr, /not empty/);
      assert.match(error.stderr, /README\.md/);
      return true;
    });
    assert.equal(await read('demo-app', 'README.md'), 'mine');

    await fs.writeFile(path.join(cwd, 'demo-app', '.env'), 'MINE=1');
    const { stdout } = await qn('create', 'demo-app', '-ts', '--force');
    assert.notEqual(await read('demo-app', 'README.md'), 'mine');
    assert.equal(await read('demo-app', '.env'), 'MINE=1');
    assert.match(stdout, /existing \.env was kept/);
    assert.doesNotMatch(stdout, /random secrets was generated/);
  });

  it('rejects conflicting template flags before prompting', async () => {
    await assert.rejects(qn('create', '-ts', '-js'), (error) => /Choose only one template/.test(error.stderr));
  });

  it('refuses "." in a non-empty directory', async () => {
    await fs.writeFile(path.join(cwd, 'README.md'), 'mine');
    await assert.rejects(qn('create', '.', '-js'), /not empty/);
    assert.equal(await read('README.md'), 'mine');
  });
});
