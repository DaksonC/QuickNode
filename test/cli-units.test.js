import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PassThrough } from 'node:stream';
import { createInputFromFlags } from '../dist/commands/create.js';
import { npmCommand, run } from '../dist/core/run.js';
import { isSupportedNode } from '../dist/node-version.js';
import { parseCommandLine, UsageError, wantsJson } from '../dist/spec.js';
import { createPrompter, PromptAbortedError } from '../dist/ui/prompt.js';
import { createStyle } from '../dist/ui/style.js';

describe('parseCommandLine', () => {
  it('shows help without arguments, with help, and with --help', () => {
    assert.deepEqual(parseCommandLine([]), { kind: 'help', json: false });
    assert.deepEqual(parseCommandLine(['help', 'create']), { kind: 'help', command: 'create', json: false });
    assert.deepEqual(parseCommandLine(['--help']), { kind: 'help', command: undefined, json: false });
    assert.deepEqual(parseCommandLine(['create', '-h']), { kind: 'help', command: 'create', json: false });
  });

  it('shows command help for "qn --help create"', () => {
    assert.equal(parseCommandLine(['--help', 'create']).command, 'create');
    assert.equal(parseCommandLine(['-h', 'create']).command, 'create');
  });

  it('recognizes --version and -v, also after a command', () => {
    assert.equal(parseCommandLine(['--version']).kind, 'version');
    assert.equal(parseCommandLine(['-v']).kind, 'version');
    assert.equal(parseCommandLine(['create', 'my-api', '-v']).kind, 'version');
  });

  it('treats --json as a global flag', () => {
    assert.deepEqual(parseCommandLine(['--json', '--version']), { kind: 'version', json: true });
    assert.equal(parseCommandLine(['create', 'x', '--json']).json, true);
    assert.equal(wantsJson(['create', '--json', '--nope']), true);
    assert.equal(wantsJson(['create', '--', '--json']), false);
  });

  it('maps the legacy -ts/-js flags', () => {
    const parsed = parseCommandLine(['create', 'app', '-ts']);
    assert.equal(parsed.kind, 'command');
    assert.deepEqual(parsed.positionals, ['app']);
    assert.equal(parsed.values.typescript, true);
    assert.equal(parseCommandLine(['create', '-js']).values.javascript, true);
  });

  it('rejects unknown commands and options as usage errors', () => {
    assert.throws(() => parseCommandLine(['nope']), UsageError);
    assert.throws(() => parseCommandLine(['create', '--nope']), (e) => e instanceof UsageError && e.command === 'create');
    assert.throws(() => parseCommandLine(['--nope']), UsageError);
  });
});

describe('createInputFromFlags', () => {
  it('maps flags to input', () => {
    assert.deepEqual(createInputFromFlags(['app'], { javascript: true, 'dry-run': true, git: true }), {
      name: 'app',
      template: 'javascript',
      force: false,
      yes: false,
      dryRun: true,
      install: false,
      git: true
    });
  });

  it('rejects contradictory or extra arguments', () => {
    assert.throws(() => createInputFromFlags([], { typescript: true, javascript: true }), /only one template/);
    assert.throws(() => createInputFromFlags(['a', 'b'], {}), /Only one project name/);
  });
});

describe('createStyle', () => {
  it('does not color non-TTY streams', () => {
    assert.equal(createStyle(new PassThrough()).success('ok'), 'ok');
  });

  it('colors terminals that support it', () => {
    const tty = Object.assign(new PassThrough(), { isTTY: true, hasColors: () => true });
    assert.equal(createStyle(tty).success('ok'), '\u001b[32mok\u001b[39m');
  });

  it('honors hasColors() (NO_COLOR, TERM=dumb)', () => {
    const tty = Object.assign(new PassThrough(), { isTTY: true, hasColors: () => false });
    assert.equal(createStyle(tty).error('x'), 'x');
  });
});

describe('createPrompter', () => {
  function session(answers) {
    const input = new PassThrough();
    const output = new PassThrough();
    let written = '';
    output.on('data', (chunk) => (written += chunk));
    const prompter = createPrompter(input, output);
    for (const answer of answers) input.write(`${answer}\n`);
    return { prompter, input, written: () => written };
  }

  it('returns the default on empty input and re-asks on invalid input', async () => {
    const { prompter, written } = session(['', 'Bad', 'good']);
    assert.equal(await prompter.text('Name', 'dflt'), 'dflt');
    assert.equal(await prompter.text('Name', 'dflt', (v) => (v === 'good' ? undefined : 'invalid!')), 'good');
    assert.match(written(), /invalid!/);
    prompter.close();
  });

  it('chooses by number, defaults to the first and re-asks out of range', async () => {
    const { prompter, written } = session(['', '9', '2']);
    const choices = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' }
    ];
    assert.equal(await prompter.choose('Pick', choices), 'a');
    assert.equal(await prompter.choose('Pick', choices), 'b');
    assert.match(written(), /1\) A \(default\)/);
    assert.match(written(), /number from 1 to 2/);
    prompter.close();
  });

  it('rejects with PromptAbortedError when input ends', async () => {
    const { prompter, input } = session([]);
    const answer = prompter.text('Name', 'x');
    input.end();
    await assert.rejects(answer, PromptAbortedError);
  });
});

describe('run / npmCommand', () => {
  it('reports success, failure and missing programs without throwing', async () => {
    assert.deepEqual(await run(process.execPath, ['-e', ''], process.cwd()), { ok: true });
    assert.deepEqual(await run(process.execPath, ['-e', 'process.exit(3)'], process.cwd()), {
      ok: false,
      error: 'exited with code 3'
    });
    assert.equal((await run('qn-command-that-does-not-exist', [], process.cwd())).ok, false);
  });

  const node = path.join('/opt', 'node', 'bin', 'node');
  const only = (file) => (candidate) => candidate === file;

  it('reuses npm when started by npm or npx', () => {
    const dir = path.join('/usr', 'lib', 'node_modules', 'npm', 'bin');
    const npmCli = path.join(dir, 'npm-cli.js');
    for (const execPath of [npmCli, path.join(dir, 'npx-cli.js')]) {
      assert.deepEqual(npmCommand(['install'], { npm_execpath: execPath }, 'linux', node, only(npmCli)), [
        node,
        [npmCli, 'install']
      ]);
    }
  });

  it('finds the npm bundled with Node, so Windows never spawns npm.cmd', () => {
    const bundled = path.join('/opt', 'node', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
    assert.deepEqual(npmCommand(['install'], {}, 'win32', node, only(bundled)), [node, [bundled, 'install']]);
  });

  it('falls back to "npm" on Unix and gives up on Windows', () => {
    assert.deepEqual(npmCommand(['install'], {}, 'linux', node, () => false), ['npm', ['install']]);
    assert.equal(npmCommand(['install'], {}, 'win32', node, () => false), undefined);
  });
});

describe('isSupportedNode', () => {
  it('requires Node 22.13 or newer', () => {
    for (const version of ['22.13.0', '22.20.1', '24.0.0', '30.1.2']) assert.equal(isSupportedNode(version), true);
    for (const version of ['18.20.8', '20.19.0', '22.12.0']) assert.equal(isSupportedNode(version), false);
  });
});
