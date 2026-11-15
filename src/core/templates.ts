import fs from 'node:fs/promises';
import path from 'node:path';
import { compareCodeUnits, isNotFound } from './fs.js';

/** Template entries that are never copied into a generated project. */
const IGNORED = new Set(['node_modules', 'package-lock.json', '.env', 'dist', 'coverage', '.DS_Store']);

/** Lists files under `root` recursively, in code-unit order, skipping `ignored` names. Rejects symlinks. */
export async function listFiles(root: string, ignored: ReadonlySet<string> = new Set()): Promise<string[]> {
  const files: string[] = [];

  async function walk(relativeDir: string): Promise<void> {
    const entries = await fs.readdir(path.join(root, relativeDir), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => compareCodeUnits(a.name, b.name))) {
      if (ignored.has(entry.name)) continue;
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Template contains a symbolic link, which is not allowed: ${relativePath}`);
      }
      if (entry.isDirectory()) await walk(relativePath);
      else if (entry.isFile()) files.push(relativePath);
    }
  }

  await walk('');
  return files;
}

/**
 * Lists the files of a template folder; none when the folder does not exist
 * (a layer or recipe may have no files for a language). Symlinks are rejected
 * so a template can never make the CLI read or write outside of it.
 */
export async function listTemplateFiles(templateDir: string): Promise<string[]> {
  try {
    return await listFiles(templateDir, IGNORED);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}
