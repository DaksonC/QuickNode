import { existsSync } from 'node:fs';
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

export function templateDir(name: TemplateName): string {
  return path.join(packageRoot(), 'templates', name);
}
