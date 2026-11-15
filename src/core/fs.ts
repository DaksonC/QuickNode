import fs from 'node:fs/promises';

/** True for "no such file or directory". */
export const isNotFound = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** Reads a UTF-8 file; undefined when it does not exist (other errors are thrown). */
export async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}
