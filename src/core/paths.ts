import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TemplateName = 'typescript' | 'javascript';

/**
 * Root of the installed package (the folder holding package.json and
 * templates/). Works from both `src/` (dev) and `dist/` (published).
 */
export function packageRoot(fromUrl: string = import.meta.url): string {
  let dir = path.dirname(fileURLToPath(fromUrl));
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not locate the QuickNode package root.');
    dir = parent;
  }
  return dir;
}

/** Version of the installed CLI (also the template version recorded in quicknode.json). */
export function cliVersion(): string {
  return (JSON.parse(readFileSync(path.join(packageRoot(), 'package.json'), 'utf8')) as { version: string }).version;
}

/** Source files that `qn generate` fills in, per language (see templates/generators). */
export function generatorDir(language: TemplateName): string {
  return path.join(packageRoot(), 'templates', 'generators', language);
}
