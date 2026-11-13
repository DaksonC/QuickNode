import { builtinModules } from 'node:module';
import path from 'node:path';

const MAX_LENGTH = 214;
const RESERVED = new Set(['node_modules', 'favicon.ico']);
// Unscoped npm package name: lowercase, URL-safe, cannot start with "." or "_".
// npm also rejects ~'!()* in new package names.
const VALID_NAME = /^[a-z0-9-][a-z0-9-._]*$/;

export interface ResolvedProject {
  /** Name written to package.json. */
  packageName: string;
  /** Absolute directory where the project will be generated. */
  targetDir: string;
  /** True when generating into the current directory ("."). */
  inCurrentDir: boolean;
}

/**
 * Returns the reason a name is not a valid npm package / directory name, or
 * undefined when it is valid.
 */
export function validateProjectName(name: string): string | undefined {
  if (name.length === 0) return 'name cannot be empty';
  if (name.length > MAX_LENGTH) return `name cannot be longer than ${MAX_LENGTH} characters`;
  if (name.trim() !== name) return 'name cannot have leading or trailing spaces';
  if (/[/\\]/.test(name) || path.isAbsolute(name)) return 'name cannot contain path separators';
  if (name.includes('..')) return 'name cannot contain ".."';
  if (name.startsWith('.') || name.startsWith('_')) return 'name cannot start with "." or "_"';
  if (name.toLowerCase() !== name) return 'name must be lowercase';
  if (!VALID_NAME.test(name)) return 'name can only contain lowercase letters, digits, "-", "." and "_"';
  if (RESERVED.has(name)) return `"${name}" is a reserved name`;
  if (builtinModules.includes(name)) return `"${name}" is a Node.js core module name`;
  return undefined;
}

/**
 * Validates the requested project name and resolves where it will be generated.
 * Throws when the name is invalid or the directory would escape `cwd`.
 */
export function resolveProject(name: string, cwd: string = process.cwd()): ResolvedProject {
  if (name === '.') {
    const dirName = path.basename(cwd);
    return {
      // Reuse the folder name when it is a valid package name.
      packageName: validateProjectName(dirName) ? 'quicknode-app' : dirName,
      targetDir: cwd,
      inCurrentDir: true
    };
  }

  const reason = validateProjectName(name);
  if (reason) {
    throw new Error(`Invalid project name "${name}": ${reason}.`);
  }

  const targetDir = path.resolve(cwd, name);
  const relative = path.relative(cwd, targetDir);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Project directory must be inside ${cwd}.`);
  }

  return { packageName: name, targetDir, inCurrentDir: false };
}
