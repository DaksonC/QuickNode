import { randomBytes } from 'node:crypto';
import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { QnError } from './errors.js';
import { compareCodeUnits } from './fs.js';
import { listFiles } from './templates.js';

/** Prefix of the temporary folder the project is generated in. */
export const STAGING_PREFIX = '.qn-staging-';
/** Entries in the target directory that do not count as "non empty". */
const IGNORED_IN_TARGET = new Set(['.git']);

export class TargetNotEmptyError extends QnError {
  constructor(
    readonly targetDir: string,
    /** Project files that already exist in the target (would be overwritten). */
    readonly conflicts: string[],
    /** Entries already present in the target (excluding .git). */
    readonly entries: string[]
  ) {
    super('E_DIR_NOT_EMPTY', `Directory ${targetDir} is not empty. Use --force to write into it anyway.`);
  }
}

export class PathBlockedError extends QnError {
  constructor(
    readonly targetDir: string,
    /** Project files blocked by a file/directory of another type in the target. */
    readonly paths: string[]
  ) {
    super(
      'E_PATH_BLOCKED',
      `Cannot write into ${targetDir}: some paths are blocked by an existing file or directory.`,
      'rename or remove the listed paths, or choose another folder'
    );
  }
}

export interface PlanOptions {
  /** Files of the project, relative to its root ("/" separators). */
  files: string[];
  targetDir: string;
  /** Files that are never overwritten when they already exist (e.g. ".env"). */
  preserve?: string[];
}

export interface ScaffoldPlan {
  targetDir: string;
  targetExists: boolean;
  /** Files to generate, relative to the project root. */
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
export async function planScaffold({ files: projectFiles, targetDir, preserve = [] }: PlanOptions): Promise<ScaffoldPlan> {
  const files = projectFiles.map((file) => file.split('/').join(path.sep));
  const targetStats = await lstatOrUndefined(targetDir);

  if (targetStats && !targetStats.isDirectory()) {
    throw new QnError('E_PATH_BLOCKED', `${targetDir} exists and is not a directory.`, 'choose another project name');
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
    targetDir,
    targetExists: targetStats !== undefined,
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
  /** Writes the project files into the (empty) staging folder. */
  populate: (stagingDir: string) => Promise<void>;
}

/**
 * Writes a plan that passed `assertWritable`. The project is generated in a
 * staging folder next to (or inside) the target and then moved into place. A
 * new target appears atomically (single rename); for an existing target every
 * path was validated beforehand, so the remaining failure modes are I/O errors
 * such as a full disk or missing permissions.
 */
export async function writeScaffold(plan: ScaffoldPlan, { populate }: WriteOptions): Promise<void> {
  // Staging must live on the same filesystem as the target so rename() works.
  const stagingParent = plan.targetExists ? plan.targetDir : path.dirname(plan.targetDir);
  // mkdir (unlike mkdtemp, which forces 0700) honors the umask, so a new
  // project root ends up with the same permissions as any other folder.
  const stagingDir = path.join(stagingParent, `${STAGING_PREFIX}${randomBytes(6).toString('hex')}`);
  await fs.mkdir(stagingDir);

  try {
    await populate(stagingDir);

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
  for (const file of await listFiles(stagingDir)) {
    if (preserved.has(file)) continue;
    const destination = path.join(targetDir, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(path.join(stagingDir, file), destination);
  }
}
