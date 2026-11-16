import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Creates a temp directory removed automatically after the current test. */
export async function makeTmp(t, prefix = 'qn-test-') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

export async function write(file, content = '') {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

export const read = (...parts) => fs.readFile(path.join(...parts), 'utf8');

export const exists = (...parts) =>
  fs.access(path.join(...parts)).then(
    () => true,
    () => false
  );

/** Runs the CLI in-process with captured, non-TTY streams. */
export async function runQn(cwd, ...argv) {
  const { PassThrough } = await import('node:stream');
  const { main } = await import('../dist/main.js');
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

/** Creates a QuickNode project ("app") in a new temp dir and returns its path. */
export async function makeProject(t, template = 'typescript', ...flags) {
  const cwd = await makeTmp(t, 'qn-project-');
  const { code, stderr } = await runQn(cwd, 'create', 'app', `--${template}`, '--yes', ...flags);
  if (code !== 0) throw new Error(`qn create failed: ${stderr}`);
  return path.join(cwd, 'app');
}
