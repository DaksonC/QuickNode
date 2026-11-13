import { randomBytes } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
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
  readonly code = 'TARGET_NOT_EMPTY';

  constructor(
    readonly targetDir: string,
    /** Project files that already exist in the target (would be overwritten). */
    readonly conflicts: string[],
    /** Entries already present in the target (excluding .git). */
    readonly entries: string[]
  ) {
    super(`Directory ${targetDir} is not empty. Use --force to write into it anyway.`);
    this.name = 'TargetNotEmptyError';
  }
}

export class PathBlockedError extends Error {
  readonly code = 'PATH_BLOCKED';

  constructor(
    readonly targetDir: string,
    /** Project files blocked by a file/directory of another type in the target. */
    readonly paths: string[]
  ) {
    super(`Cannot write into ${targetDir}: some paths are blocked by an existing file or directory.`);
    this.name = 'PathBlockedError';
  }
}

export interface PlanOptions {
  templateDir: string;
  targetDir: string;
  /** Files that are never overwritten when they already exist (e.g. ".env"). */
  preserve?: string[];
}

export interface ScaffoldPlan {
  templateDir: string;
  targetDir: string;
  targetExists: boolean;
  /** Template files, relative to the template root. */
  sources: string[];
  /** Files to generate, relative to the project root (after renames). */
  files: string[];
  /** Entries already in the target directory (excluding .git). */
  existingEntries: string[];
  /** Project files that already exist in the target and would be overwritten. */
  conflicts: string[];
  /** Project files blocked by a file/directory of another type in the target. */
  blocked: string[];
  /** Files from `preserve` that already exist and will be kept untouched. */
  preserved: string[];
}

/** Locale-independent ordering, so plans and messages are stable everywhere. */
function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** lstat that returns undefined when the path does not exist. */
async function lstatOrUndefined(target: string): Promise<Stats | undefined> {
  try {
    return await fs.lstat(target);
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    // ENOTDIR: a parent path is a file, so this path cannot exist.
    if (code === 'ENOENT' || code === 'ENOTDIR') return undefined;
    throw error;
  }
}

/** Lists files under `root` recursively, skipping `ignored` names. Rejects symlinks. */
async function listFiles(root: string, ignored: ReadonlySet<string>): Promise<string[]> {
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
 * Lists the files of a template. Symlinks are rejected so a template can never
 * make the CLI read or write outside of it.
 */
export function listTemplateFiles(templateDir: string): Promise<string[]> {
  return listFiles(templateDir, IGNORED);
}

/** Path a template file gets in the generated project. */
function destinationOf(templateFile: string): string {
  const renamed = RENAMED_ON_COPY[path.basename(templateFile)];
  return renamed ? path.join(path.dirname(templateFile), renamed) : templateFile;
}

/** Leftovers of an interrupted run, or our own staging folder. */
const isIgnoredInTarget = (name: string) => IGNORED_IN_TARGET.has(name) || name.startsWith(STAGING_PREFIX);

/**
 * True when `file` cannot be written into `targetDir` because the destination
 * is a directory, or one of its parent paths is not a directory.
 */
async function isBlocked(targetDir: string, file: string): Promise<boolean> {
  const parts = file.split(path.sep);
  let current = targetDir;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stats = await lstatOrUndefined(current);
    if (!stats) return false;
    const isLast = index === parts.length - 1;
    if (isLast ? stats.isDirectory() : !stats.isDirectory()) return true;
  }
  return false;
}

/** Computes what generating the project would do, without writing anything. */
export async function planScaffold({ templateDir, targetDir, preserve = [] }: PlanOptions): Promise<ScaffoldPlan> {
  const sources = await listTemplateFiles(templateDir);
  const files = sources.map(destinationOf);
  const targetStats = await lstatOrUndefined(targetDir);

  if (targetStats && !targetStats.isDirectory()) {
    throw new Error(`${targetDir} exists and is not a directory.`);
  }

  const existingEntries = targetStats
    ? (await fs.readdir(targetDir)).filter((name) => !isIgnoredInTarget(name)).sort(compareCodeUnits)
    : [];

  const conflicts: string[] = [];
  const blocked: string[] = [];
  const preserved: string[] = [];
  if (existingEntries.length > 0) {
    for (const file of files) {
      if (await isBlocked(targetDir, file)) blocked.push(file);
      else if (await lstatOrUndefined(path.join(targetDir, file))) conflicts.push(file);
    }
    for (const file of preserve) {
      if (await lstatOrUndefined(path.join(targetDir, file))) preserved.push(file);
    }
  }

  return {
    templateDir,
    targetDir,
    targetExists: targetStats !== undefined,
    sources,
    files,
    existingEntries,
    conflicts,
    blocked,
    preserved
  };
}

/**
 * Throws when the plan cannot be applied: a non-empty target without `force`,
 * or paths blocked by a file/directory of another type (even with `force`).
 */
export function assertWritable(plan: ScaffoldPlan, force = false): void {
  if (plan.existingEntries.length > 0 && !force) {
    throw new TargetNotEmptyError(plan.targetDir, plan.conflicts, plan.existingEntries);
  }
  if (plan.blocked.length > 0) {
    throw new PathBlockedError(plan.targetDir, plan.blocked);
  }
}

export interface WriteOptions {
  /** Customize the staged project before it is moved into place. */
  transform?: (stagingDir: string) => Promise<void>;
}

/**
 * Writes a plan that passed `assertWritable`. The project is generated in a
 * staging folder next to (or inside) the target and then moved into place. A
 * new target appears atomically (single rename); for an existing target every
 * path was validated beforehand, so the remaining failure modes are I/O errors
 * such as a full disk or missing permissions.
 */
export async function writeScaffold(plan: ScaffoldPlan, { transform }: WriteOptions = {}): Promise<void> {
  // Staging must live on the same filesystem as the target so rename() works.
  const stagingParent = plan.targetExists ? plan.targetDir : path.dirname(plan.targetDir);
  // mkdir (unlike mkdtemp, which forces 0700) honors the umask, so a new
  // project root ends up with the same permissions as any other folder.
  const stagingDir = path.join(stagingParent, `${STAGING_PREFIX}${randomBytes(6).toString('hex')}`);
  await fs.mkdir(stagingDir);

  try {
    for (const source of plan.sources) {
      const destination = path.join(stagingDir, destinationOf(source));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(plan.templateDir, source), destination, constants.COPYFILE_EXCL);
    }

    if (transform) await transform(stagingDir);

    if (plan.targetExists) {
      await moveInto(stagingDir, plan.targetDir, new Set(plan.preserved));
    } else {
      await fs.rename(stagingDir, plan.targetDir);
    }
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

/** Moves every staged file into the existing `targetDir`, skipping `preserved` ones. */
async function moveInto(stagingDir: string, targetDir: string, preserved: Set<string>): Promise<void> {
  for (const file of await listFiles(stagingDir, new Set())) {
    if (preserved.has(file)) continue;
    const destination = path.join(targetDir, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(path.join(stagingDir, file), destination);
  }
}
