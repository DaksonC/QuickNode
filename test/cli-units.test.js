import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PassThrough } from 'node:stream';
import { createInputFromFlags } from '../dist/commands/create.js';
import { npmCommand, run } from '../dist/core/run.js';
import { parseCommandLine, UsageError } from '../dist/spec.js';
import { createPrompter, PromptAbortedError } from '../dist/ui/prompt.js';
import { createStyle } from '../dist/ui/style.js';

describe('parseCommandLine', () => {
  it('shows help without arguments, with help, and with --help', () => {
    assert.deepEqual(parseCommandLine([]), { kind: 'help' });
    assert.deepEqual(parseCommandLine(['help', 'create']), { kind: 'help', command: 'create' });
    assert.deepEqual(parseCommandLine(['--help']), { kind: 'help' });
    assert.deepEqual(parseCommandLine(['create', '-h']), { kind: 'help', command: 'create' });
  });

  it('recognizes --version and -v', () => {
    assert.deepEqual(parseCommandLine(['--version']), { kind: 'version' });
    assert.deepEqual(parseCommandLine(['-v']), { kind: 'version' });
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

  it('reuses npm_execpath when started by npm', () => {
    const npmCli = '/usr/lib/node_modules/npm/bin/npm-cli.js';
    assert.deepEqual(npmCommand(['install'], { npm_execpath: npmCli }), [process.execPath, [npmCli, 'install']]);
    assert.equal(npmCommand(['install'], {})[1][0], 'install');
  });
});
