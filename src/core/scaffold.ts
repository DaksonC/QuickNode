import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Template entries that are never copied into a generated project. */
const IGNORED = new Set(['node_modules', 'package-lock.json', '.env', 'dist', 'coverage', '.DS_Store']);
/**
 * npm never publishes `.gitignore` files, so templates store them without the
 * dot and they are renamed when the project is generated.
 */
const RENAMED_ON_COPY: Record<string, string> = { gitignore: '.gitignore' };
/** Prefix of the temporary folder the project is generated in. */
export const STAGING_PREFIX = '.qn-staging-';
/** Entries in the target directory that do not count as "non empty". */
const IGNORED_IN_TARGET = new Set(['.git']);

export class TargetNotEmptyError extends Error {
  constructor(
    readonly targetDir: string,
    /** Template files that already exist in the target (would be overwritten). */
    readonly conflicts: string[],
    /** Entries already present in the target (excluding .git). */
    readonly entries: string[]
  ) {
    super(`Directory ${targetDir} is not empty. Use --force to write into it anyway.`);
    this.name = 'TargetNotEmptyError';
  }
}

export interface ScaffoldPlan {
  targetDir: string;
  targetExists: boolean;
  /** Template files, relative to the template root. */
  sources: string[];
  /** Files to generate, relative to the project root (after renames). */
  files: string[];
  /** Entries already in the target directory (excluding .git). */
  existingEntries: string[];
  /** Template files that already exist in the target. */
  conflicts: string[];
  /** Template files blocked by a directory/file of the same path in the target. */
  typeClashes: string[];
}

export interface ScaffoldOptions {
  templateDir: string;
  targetDir: string;
  /** Allow writing into a non-empty directory, overwriting conflicting files. */
  force?: boolean;
  /** Customize the staged project before it is moved into place. */
  transform?: (stagingDir: string) => Promise<void>;
  /** Files that are never overwritten in an existing target (e.g. ".env"). */
  preserve?: string[];
}

/**
 * Lists template files recursively. Symlinks are rejected so a template can
 * never make the CLI read or write outside of it.
 */
export async function listTemplateFiles(
  templateDir: string,
  ignored: ReadonlySet<string> = IGNORED,
  relativeDir = ''
): Promise<string[]> {
  const entries = await fs.readdir(path.join(templateDir, relativeDir), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => compareCodeUnits(a.name, b.name))) {
    if (ignored.has(entry.name)) continue;
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Template contains a symbolic link, which is not allowed: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(templateDir, ignored, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/** Path a template file gets in the generated project. */
export function destinationOf(templateFile: string): string {
  const renamed = RENAMED_ON_COPY[path.basename(templateFile)];
  return renamed ? path.join(path.dirname(templateFile), renamed) : templateFile;
}

/** Locale-independent ordering, so plans and messages are stable everywhere. */
function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Leftovers of an interrupted run, or our own staging folder. */
const isIgnoredInTarget = (name: string) => IGNORED_IN_TARGET.has(name) || name.startsWith(STAGING_PREFIX);

/**
 * Template files that cannot be written over what is in the target: the
 * destination is a directory, or one of its parent paths is not a directory.
 * Checked before writing anything so --force never fails halfway through.
 */
async function findTypeClashes(targetDir: string, files: string[]): Promise<string[]> {
  const clashes: string[] = [];
  for (const file of files) {
    let current = targetDir;
    const parts = file.split(path.sep);
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const stats = await fs.lstat(current).catch(() => undefined);
      if (!stats) break;
      const isLast = index === parts.length - 1;
      if (isLast ? stats.isDirectory() : !stats.isDirectory()) {
        clashes.push(file);
        break;
      }
    }
  }
  return clashes;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    // ENOTDIR: a parent path is a file, so this path cannot exist.
    if (code === 'ENOENT' || code === 'ENOTDIR') return false;
    throw error;
  }
}

/** Computes what generating the project would do, without writing anything. */
export async function planScaffold(templateDir: string, targetDir: string): Promise<ScaffoldPlan> {
  const sources = await listTemplateFiles(templateDir);
  const files = sources.map(destinationOf);
  const targetExists = await pathExists(targetDir);

  if (targetExists && !(await fs.lstat(targetDir)).isDirectory()) {
    throw new Error(`${targetDir} exists and is not a directory.`);
  }

  const existingEntries = targetExists
    ? (await fs.readdir(targetDir)).filter((name) => !isIgnoredInTarget(name)).sort(compareCodeUnits)
    : [];

  const conflicts: string[] = [];
  let typeClashes: string[] = [];
  if (existingEntries.length > 0) {
    for (const file of files) {
      if (await pathExists(path.join(targetDir, file))) conflicts.push(file);
    }
    typeClashes = await findTypeClashes(targetDir, files);
  }

  return { targetDir, targetExists, sources, files, existingEntries, conflicts, typeClashes };
}

/**
 * Generates the project in a staging directory next to (or inside) the target
 * and only then moves it into place. A new target appears atomically (single
 * rename); for an existing target (only allowed with `force`) every file is
 * validated before the first move, so the remaining failure modes are I/O
 * errors such as a full disk or missing permissions.
 */
export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldPlan> {
  const { templateDir, targetDir, force = false, transform, preserve = [] } = options;
  const plan = await planScaffold(templateDir, targetDir);

  if (plan.existingEntries.length > 0 && !force) {
    throw new TargetNotEmptyError(targetDir, plan.conflicts, plan.existingEntries);
  }
  if (plan.typeClashes.length > 0) {
    throw new Error(
      `Cannot write into ${targetDir}: these paths are blocked by an existing file or directory:\n` +
        plan.typeClashes.map((file) => `  - ${file}`).join('\n')
    );
  }

  // Staging must live on the same filesystem as the target so rename() works.
  const stagingParent = plan.targetExists ? targetDir : path.dirname(targetDir);
  // mkdir (unlike mkdtemp, which forces 0700) honors the umask, so a new
  // project root ends up with the same permissions as any other folder.
  const stagingDir = path.join(stagingParent, `${STAGING_PREFIX}${randomBytes(6).toString('hex')}`);
  await fs.mkdir(stagingDir);

  try {
    for (const source of plan.sources) {
      const destination = path.join(stagingDir, destinationOf(source));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(templateDir, source), destination, constants.COPYFILE_EXCL);
    }

    if (transform) await transform(stagingDir);

    if (plan.targetExists) {
      await moveInto(stagingDir, targetDir, new Set(preserve));
    } else {
      await fs.rename(stagingDir, targetDir);
    }
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }

  return plan;
}

/** Moves every file from `sourceDir` into the existing `targetDir`. */
async function moveInto(sourceDir: string, targetDir: string, preserve: Set<string>): Promise<void> {
  const files = await listTemplateFiles(sourceDir, new Set());
  for (const file of files) {
    const destination = path.join(targetDir, file);
    if (preserve.has(file) && (await pathExists(destination))) continue;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(path.join(sourceDir, file), destination);
  }
}
