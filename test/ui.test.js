import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PassThrough } from 'node:stream';
import {
  canOpenBrowser,
  docsUrl,
  DOCS_URL,
  languageFromEnv,
  launchDetached,
  openDocs,
  openerCommand,
  uiInputFromFlags
} from '../dist/commands/ui.js';
import { EXIT_OK, EXIT_USAGE, main } from '../dist/main.js';
import { DOCS_TOPICS, parseCommandLine, UsageError } from '../dist/spec.js';
import { exists, makeTmp, read } from './helpers.js';

const DESKTOP = { DISPLAY: ':0' };
const noFiles = () => false;

describe('docs links', () => {
  it('builds every link from the fixed base and the closed topic list', () => {
    assert.equal(docsUrl(), DOCS_URL);
    assert.equal(docsUrl(undefined, 'pt'), `${DOCS_URL}pt/`);
    assert.equal(docsUrl('create'), `${DOCS_URL}commands/#create`);
    assert.equal(docsUrl('structure', 'pt'), `${DOCS_URL}pt/structure/`);
    for (const topic of Object.keys(DOCS_TOPICS)) assert.ok(docsUrl(topic).startsWith(DOCS_URL));
  });

  it('rejects topics outside the list, including prototype keys', () => {
    assert.throws(() => docsUrl('https://evil.example'), UsageError);
    assert.throws(() => docsUrl('constructor'), UsageError);
  });

  it('picks Portuguese from the locale, in POSIX precedence, then from the system locale', () => {
    const english = () => 'en-US';
    assert.equal(languageFromEnv({ LANG: 'pt_BR.UTF-8' }, english), 'pt');
    assert.equal(languageFromEnv({ LANG: 'pt' }, english), 'pt');
    assert.equal(languageFromEnv({ LC_ALL: 'en_US.UTF-8', LANG: 'pt_BR.UTF-8' }), 'en');
    assert.equal(languageFromEnv({ LC_MESSAGES: 'pt_PT' }, english), 'pt');
    assert.equal(languageFromEnv({ LANG: 'ptx' }, () => 'pt-BR'), 'en');
    assert.equal(languageFromEnv({}, english), 'en');
    assert.equal(languageFromEnv({}, () => 'pt-BR'), 'pt'); // Windows: no LANG
    assert.match(languageFromEnv({}), /^(en|pt)$/);
  });
});

describe('when to open a browser', () => {
  it('opens only in an interactive desktop session', () => {
    assert.equal(canOpenBrowser(DESKTOP, 'linux', true, noFiles), true);
    assert.equal(canOpenBrowser({}, 'darwin', true, noFiles), true);
    assert.equal(canOpenBrowser({}, 'win32', true, noFiles), true);
    assert.equal(canOpenBrowser(DESKTOP, 'linux', false, noFiles), false);
  });

  it('never opens in CI, over SSH, in a container or without a display', () => {
    assert.equal(canOpenBrowser({ ...DESKTOP, CI: 'true' }, 'linux', true, noFiles), false);
    assert.equal(canOpenBrowser({ ...DESKTOP, CI: 'false' }, 'linux', true, noFiles), true);
    assert.equal(canOpenBrowser({ SSH_CONNECTION: '1 2 3 4' }, 'darwin', true, noFiles), false);
    assert.equal(canOpenBrowser({ SSH_TTY: '/dev/pts/1' }, 'win32', true, noFiles), false);
    assert.equal(canOpenBrowser(DESKTOP, 'linux', true, (file) => file === '/.dockerenv'), false);
    assert.equal(canOpenBrowser({}, 'linux', true, noFiles), false);
    assert.equal(canOpenBrowser({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux', true, noFiles), true);
    assert.equal(canOpenBrowser({}, 'freebsd', true, noFiles), false);
    assert.equal(canOpenBrowser(DESKTOP, 'freebsd', true, noFiles), true);
  });

  it('uses the native opener of each platform, never a shell', () => {
    assert.equal(openerCommand('darwin'), 'open');
    assert.equal(openerCommand('win32'), 'explorer.exe');
    assert.equal(openerCommand('linux'), 'xdg-open');
    assert.equal(openerCommand('aix'), undefined);
  });

  it('opens the link as a single argument, or only prints it with --print', async () => {
    const calls = [];
    const open = async (...call) => calls.push(call) > 0;
    const ctx = { env: DESKTOP, platform: 'linux', interactive: true, fileExists: noFiles, open };
    assert.deepEqual(await openDocs({ topic: 'faq', lang: 'en' }, ctx), { url: `${DOCS_URL}faq/`, opened: true });
    assert.deepEqual(calls, [['xdg-open', [`${DOCS_URL}faq/`]]]);
    assert.deepEqual(await openDocs({ topic: 'faq', lang: 'en', print: true }, ctx), { url: `${DOCS_URL}faq/`, opened: false });
    assert.equal((await openDocs({}, { ...ctx, platform: 'aix' })).opened, false);
    assert.equal(calls.length, 1);
  });

  it('reports whether the opener actually started', async () => {
    const ctx = { env: DESKTOP, platform: 'linux', interactive: true, fileExists: noFiles, open: async () => false };
    assert.equal((await openDocs({ lang: 'en' }, ctx)).opened, false);
    assert.equal(await launchDetached(path.join('/nonexistent', 'qn-opener'), ['https://example.invalid']), false);
    assert.equal(await launchDetached(process.execPath, ['-e', '']), true);
  });
});

describe('qn ui', () => {
  async function qn(argv, extra = {}) {
    const stdout = Object.assign(new PassThrough(), extra.stdout);
    const stderr = new PassThrough();
    let out = '';
    let err = '';
    stdout.on('data', (chunk) => (out += chunk));
    stderr.on('data', (chunk) => (err += chunk));
    const opened = [];
    const code = await main(argv, {
      stdin: new PassThrough(),
      stdout,
      stderr,
      cwd: '/',
      env: extra.env ?? { LANG: 'en_US.UTF-8' },
      platform: 'darwin',
      fileExists: noFiles,
      open: async (...call) => opened.push(call) > 0
    });
    return { code, out, err, opened };
  }

  it('does not claim to open the browser when the opener fails', async () => {
    const stdout = Object.assign(new PassThrough(), { isTTY: true });
    const stderr = new PassThrough();
    let err = '';
    stderr.on('data', (chunk) => (err += chunk));
    const code = await main(['ui'], { stdin: new PassThrough(), stdout, stderr, cwd: '/', env: {}, platform: 'darwin', open: async () => false });
    assert.equal(code, EXIT_OK);
    assert.equal(err, '');
  });

  it('prints the link and does not open anything without a terminal', async () => {
    const { code, out, opened } = await qn(['ui', 'create']);
    assert.equal(code, EXIT_OK);
    assert.equal(out, `${DOCS_URL}commands/#create\n`);
    assert.deepEqual(opened, []);
  });

  it('opens the browser in a terminal and still prints the link', async () => {
    const { out, err, opened } = await qn(['docs', 'structure', '--lang', 'pt'], { stdout: { isTTY: true } });
    assert.equal(out, `${DOCS_URL}pt/structure/\n`);
    assert.match(err, /Opening the documentation/);
    assert.deepEqual(opened, [['open', [`${DOCS_URL}pt/structure/`]]]);
  });

  it('honors --print and LANG, and reports JSON', async () => {
    const printed = await qn(['ui', '-p'], { stdout: { isTTY: true }, env: { LANG: 'pt_BR.UTF-8' } });
    assert.equal(printed.out, `${DOCS_URL}pt/\n`);
    assert.deepEqual(printed.opened, []);
    const json = JSON.parse((await qn(['ui', 'faq', '--json'], { stdout: { isTTY: true } })).out);
    assert.deepEqual(json, { ok: true, url: `${DOCS_URL}faq/`, opened: false });
  });

  it('rejects unknown topics and languages', async () => {
    const topic = await qn(['ui', 'https://evil.example']);
    assert.equal(topic.code, EXIT_USAGE);
    assert.match(topic.err, /Unknown topic "https:\/\/evil\.example"\. Choose one of: start,/);
    const lang = await qn(['ui', '--lang', 'fr']);
    assert.equal(lang.code, EXIT_USAGE);
    assert.match(lang.err, /Invalid value "fr" for --lang/);
    assert.throws(() => uiInputFromFlags(['a', 'b'], {}), /Only one topic/);
  });

  it('documents the alias, the topics and the string option in help', async () => {
    const { out } = await qn(['help', 'docs']);
    assert.match(out, /qn ui \[topic\]/);
    assert.match(out, /alias: qn docs/);
    assert.match(out, /topic {2}Page to open \(start, commands, create/);
    assert.match(out, /--lang <en\|pt>/);
    assert.match((await qn(['--help'])).out, /ui, docs\s+Open the documentation/);
    assert.equal(parseCommandLine(['docs', '-h']).command, 'ui');
  });
});

describe('credits in the generated README', () => {
  async function create(t, ...flags) {
    const cwd = await makeTmp(t);
    const code = await main(['create', 'app', '-js', ...flags], {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      cwd
    });
    assert.equal(code, EXIT_OK);
    return read(cwd, 'app', 'README.md');
  }

  it('keeps the "Generated with QuickNode" line by default', async (t) => {
    assert.match(await create(t), /Generated with \[QuickNode\]\(https:\/\/daksonc\.github\.io\/QuickNode\/\)/);
  });

  it('removes only the credit block with --no-credits', async (t) => {
    const readme = await create(t, '--no-credits');
    assert.doesNotMatch(readme, /Generated with|quicknode:credits/);
    assert.match(readme, /## 📚 Guide/);
    assert.ok(readme.endsWith('ui structure`.\n'));
  });

  it('does nothing when the project has no README, and reports other read errors', async (t) => {
    const { removeCredits } = await import('../dist/commands/create.js');
    const dir = await makeTmp(t);
    await removeCredits(dir);
    assert.equal(await exists(dir, 'README.md'), false);
    await fs.mkdir(path.join(dir, 'README.md'));
    await assert.rejects(removeCredits(dir), { code: 'EISDIR' });
  });
});
