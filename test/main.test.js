import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PassThrough } from 'node:stream';
import { EXIT_ERROR, EXIT_OK, EXIT_USAGE, getVersion, main } from '../dist/main.js';
import { exists, makeTmp, read, write } from './helpers.js';

/** Runs main() in-process with captured, non-TTY streams. */
async function qn(cwd, ...argv) {
  const capture = () => {
    const stream = new PassThrough();
    stream.text = '';
    stream.on('data', (chunk) => (stream.text += chunk));
    return stream;
  };
  const stdout = capture();
  const stderr = capture();
  const code = await main(argv, { stdin: new PassThrough(), stdout, stderr, cwd });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

describe('help and version', () => {
  it('prints the version from package.json', async (t) => {
    const { code, stdout } = await qn(await makeTmp(t), '--version');
    assert.equal(code, EXIT_OK);
    assert.equal(stdout.trim(), getVersion());
  });

  it('prints general help without banner when not a TTY', async (t) => {
    const { code, stdout } = await qn(await makeTmp(t));
    assert.equal(code, EXIT_OK);
    assert.match(stdout, /Usage: qn <command>/);
    assert.match(stdout, /create\s+Create a new project/);
    assert.doesNotMatch(stdout, /██/);
  });

  it('prints command help with every option and examples', async (t) => {
    const { stdout } = await qn(await makeTmp(t), 'help', 'create');
    for (const flag of ['--typescript', '--javascript', '--force', '--yes', '--dry-run', '--install', '--git', '--json']) {
      assert.match(stdout, new RegExp(flag));
    }
    assert.match(stdout, /Examples:/);
  });

  it('fails with a usage error for unknown commands', async (t) => {
    const { code, stderr } = await qn(await makeTmp(t), 'help', 'nope');
    assert.equal(code, EXIT_USAGE);
    assert.match(stderr, /Unknown command "nope"/);
  });
});

describe('create', () => {
  it('requires a name and a template when it cannot prompt', async (t) => {
    const cwd = await makeTmp(t);
    const noName = await qn(cwd, 'create', '-ts');
    assert.equal(noName.code, EXIT_USAGE);
    assert.match(noName.stderr, /project name is required/);

    const noTemplate = await qn(cwd, 'create', 'app');
    assert.equal(noTemplate.code, EXIT_USAGE);
    assert.match(noTemplate.stderr, /Choose a template/);
    assert.equal(await exists(cwd, 'app'), false);
  });

  it('uses defaults with --yes', async (t) => {
    const cwd = await makeTmp(t);
    const { code, stdout } = await qn(cwd, 'create', '--yes');
    assert.equal(code, EXIT_OK);
    assert.match(stdout, /Created my-quicknode-app \(TypeScript\)/);
    assert.match(stdout, /cd my-quicknode-app/);
    assert.equal(JSON.parse(await read(cwd, 'my-quicknode-app', 'package.json')).name, 'my-quicknode-app');
  });

  it('--dry-run lists the plan and writes nothing', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', 'README.md'), 'mine');
    const { code, stdout } = await qn(cwd, 'create', 'app', '-js', '--dry-run', '--force');
    assert.equal(code, EXIT_OK);
    assert.match(stdout, /Dry run: nothing was written/);
    assert.match(stdout, /~ README\.md \(overwrite\)/);
    assert.match(stdout, /\+ src/);
    assert.equal(await read(cwd, 'app', 'README.md'), 'mine');
    assert.deepEqual(await fs.readdir(path.join(cwd, 'app')), ['README.md']);
  });

  it('--dry-run still reports a non-empty target', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', 'README.md'), 'mine');
    const { code, stderr } = await qn(cwd, 'create', 'app', '-js', '--dry-run');
    assert.equal(code, EXIT_ERROR);
    assert.match(stderr, /not empty/);
    assert.match(stderr, /- README\.md/);
  });

  it('--json prints a machine-readable result', async (t) => {
    const cwd = await makeTmp(t);
    const { code, stdout, stderr } = await qn(cwd, 'create', 'app', '--json', '-js');
    assert.equal(code, EXIT_OK);
    assert.equal(stderr, '');
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.template, 'javascript');
    assert.equal(result.env, 'generated');
    assert.ok(result.files.includes('.gitignore'));
    assert.ok(result.files.includes('.env'));
  });

  it('--json reports errors with code and details', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', 'package.json'), '{}');
    const { code, stdout } = await qn(cwd, 'create', 'app', '-ts', '--json');
    assert.equal(code, EXIT_ERROR);
    const { ok, error } = JSON.parse(stdout);
    assert.equal(ok, false);
    assert.equal(error.code, 'TARGET_NOT_EMPTY');
    assert.deepEqual(error.conflicts, ['package.json']);

    const usage = JSON.parse((await qn(cwd, 'create', '--json')).stdout);
    assert.equal(usage.error.code, 'USAGE');
  });

  it('--force keeps an existing .env and says so', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', '.env'), 'MINE=1');
    const { code, stdout } = await qn(cwd, 'create', 'app', '-ts', '--force');
    assert.equal(code, EXIT_OK);
    assert.equal(await read(cwd, 'app', '.env'), 'MINE=1');
    assert.match(stdout, /Existing \.env kept/);
    assert.doesNotMatch(stdout, /random secrets/);
  });

  it('lists paths blocked by another file type', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', 'src'), 'not a folder');
    const { code, stderr } = await qn(cwd, 'create', 'app', '-js', '--force');
    assert.equal(code, EXIT_ERROR);
    assert.match(stderr, /blocked/);
    assert.match(stderr, /- src/);
  });

  it('prompts for name and template in a terminal', async (t) => {
    const cwd = await makeTmp(t);
    const tty = (stream) => Object.assign(stream, { isTTY: true, hasColors: () => false });
    const stdin = tty(new PassThrough());
    const stderr = tty(new PassThrough());
    let prompts = '';
    stderr.on('data', (chunk) => (prompts += chunk));
    stdin.write('Bad Name\nprompted-app\n2\n');

    const code = await main(['create'], { stdin, stdout: new PassThrough(), stderr, cwd });
    assert.equal(code, EXIT_OK);
    assert.match(prompts, /Project name/);
    assert.match(prompts, /must be lowercase/);
    assert.match(prompts, /2\) JavaScript/);
    assert.equal(await exists(cwd, 'prompted-app', 'src', 'server.js'), true);
  });

  it('--git initializes a repository', async (t) => {
    const cwd = await makeTmp(t);
    const { code, stdout } = await qn(cwd, 'create', 'app', '-js', '--git');
    assert.equal(code, EXIT_OK);
    assert.match(stdout, /✔ git init/);
    assert.equal(await exists(cwd, 'app', '.git'), true);
  });
});
