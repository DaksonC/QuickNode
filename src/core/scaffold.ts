import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Template entries that are never copied into a generated project. */
const IGNORED = new Set(['node_modules', 'package-lock.json', '.env', 'dist', 'coverage']);
/**
 * npm never publishes `.gitignore` files, so templates store them without the
 * dot and they are renamed when the project is generated.
 */
const RENAMED_ON_COPY: Record<string, string> = { gitignore: '.gitignore' };
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

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
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

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
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
    ? (await fs.readdir(targetDir)).filter((name) => !IGNORED_IN_TARGET.has(name)).sort()
    : [];

  const conflicts: string[] = [];
  if (existingEntries.length > 0) {
    for (const file of files) {
      if (await pathExists(path.join(targetDir, file))) conflicts.push(file);
    }
  }

  return { targetDir, targetExists, sources, files, existingEntries, conflicts };
}

/**
 * Generates the project in a staging directory next to (or inside) the target
 * and only then moves it into place, so a failure never leaves a half-written
 * project behind. Refuses non-empty targets unless `force` is set.
 */
export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldPlan> {
  const { templateDir, targetDir, force = false, transform, preserve = [] } = options;
  const plan = await planScaffold(templateDir, targetDir);

  if (plan.existingEntries.length > 0 && !force) {
    throw new TargetNotEmptyError(targetDir, plan.conflicts, plan.existingEntries);
  }

  // Staging must live on the same filesystem as the target so rename() works.
  const stagingParent = plan.targetExists ? targetDir : path.dirname(targetDir);
  const stagingDir = await fs.mkdtemp(path.join(stagingParent, '.qn-staging-'));

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
