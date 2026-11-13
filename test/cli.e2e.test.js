import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { exists, makeTmp, read } from './helpers.js';

const execFileAsync = promisify(execFile);
const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** Runs the real executable in a child process (stdin is not a TTY). */
const qn = (cwd, ...args) =>
  execFileAsync(process.execPath, [cli, ...args], { cwd, env: { ...process.env, NO_COLOR: '1' } });

describe('qn executable', () => {
  for (const [flag, entry] of [
    ['-ts', path.join('src', 'server.ts')],
    ['-js', path.join('src', 'server.js')]
  ]) {
    it(`generates the ${flag} template`, async (t) => {
      const cwd = await makeTmp(t, 'qn-e2e-');
      await qn(cwd, 'create', 'demo-app', flag);

      assert.equal(JSON.parse(await read(cwd, 'demo-app', 'package.json')).name, 'demo-app');
      assert.equal(await exists(cwd, 'demo-app', entry), true);
      assert.equal(await exists(cwd, 'demo-app', 'package-lock.json'), false);
      assert.match(await read(cwd, 'demo-app', '.gitignore'), /^\.env$/m);
      assert.match(await read(cwd, 'demo-app', '.env'), /^JWT_SECRET=\S{64}$/m);
    });
  }

  it('exits with an error and does not write on path traversal', async (t) => {
    const cwd = await makeTmp(t, 'qn-e2e-');
    await assert.rejects(qn(cwd, 'create', '../escaped', '-ts'), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Invalid project name/);
      return true;
    });
    assert.equal(await exists(path.dirname(cwd), 'escaped'), false);
  });

  it('does not wait for input when stdin is not a terminal', async (t) => {
    const cwd = await makeTmp(t, 'qn-e2e-');
    await assert.rejects(qn(cwd, 'create'), (error) => error.code === 2 && /--yes/.test(error.stderr));
  });
});
