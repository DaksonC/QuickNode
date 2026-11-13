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
