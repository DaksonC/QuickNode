import { existsSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

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

/** True when `child` is `parent` or inside it (lexically; see realpathNearest for links). */
export function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Real path of `target` with symbolic links resolved, for a path that may not
 * exist yet: the nearest existing ancestor is resolved and the rest appended.
 */
export function realpathNearest(target: string): string {
  let existing = path.resolve(target);
  const rest: string[] = [];
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    rest.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(realpathSync(existing), ...rest);
}

/** A relative path with "/" separators, as written in quicknode.json, plans and JSON output. */
export const toPosix = (file: string) => file.split(path.sep).join('/');

/** Locale-independent ordering, so plans, files and messages are stable everywhere. */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** JSON as written to package.json, quicknode.json and other project files. */
export const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
