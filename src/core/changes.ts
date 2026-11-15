import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * What a command would do to one file of a project:
 * - create: the file does not exist yet;
 * - update: an existing file changes (an edit, or an overwrite with --force);
 * - unchanged: the file already has the wanted content (commands are idempotent);
 * - conflict: an existing file has other content and --force was not given.
 */
export type ChangeAction = 'create' | 'update' | 'unchanged' | 'conflict';

export interface FileChange {
  /** Path relative to the project root, always with "/" separators. */
  path: string;
  action: ChangeAction;
  /** Content on disk before the change (undefined for new files). */
  before?: string;
  after: string;
}

export class ConflictError extends Error {
  readonly code = 'FILES_EXIST';

  constructor(readonly paths: string[]) {
    super('Some files already exist with different content. Use --force to overwrite them.');
    this.name = 'ConflictError';
  }
}

async function readOrUndefined(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

const toPosix = (file: string) => file.split(path.sep).join('/');

/**
 * Collects the changes of one command before anything is written, so the same
 * plan serves --dry-run (listing and diff) and the real run. Several edits to
 * the same file compose, in order.
 */
export class ChangePlan {
  private readonly changes = new Map<string, FileChange>();
  /** Things the user has to do by hand (e.g. a wiring marker was removed). */
  readonly notes: string[] = [];

  constructor(
    readonly root: string,
    private readonly force = false
  ) {}

  private resolve(relativePath: string): string {
    const absolute = path.resolve(this.root, relativePath);
    const relative = path.relative(this.root, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Refusing to write outside the project: ${relativePath}`);
    }
    return absolute;
  }

  /** Current content of a file: the planned one if any, else the one on disk. */
  async read(relativePath: string): Promise<string | undefined> {
    const key = toPosix(relativePath);
    const planned = this.changes.get(key);
    if (planned) return planned.action === 'conflict' ? planned.before : planned.after;
    return readOrUndefined(this.resolve(relativePath));
  }

  async exists(relativePath: string): Promise<boolean> {
    return (await this.read(relativePath)) !== undefined;
  }

  /** Plans a whole file. Existing different content is a conflict unless forced. */
  async write(relativePath: string, content: string): Promise<FileChange> {
    const key = toPosix(relativePath);
    const previous = this.changes.get(key);
    const before = previous ? previous.before : await readOrUndefined(this.resolve(relativePath));
    const action: ChangeAction =
      before === undefined ? 'create' : before === content ? 'unchanged' : this.force ? 'update' : 'conflict';
    return this.set({ path: key, action, before, after: content });
  }

  /**
   * Plans an edit of an existing (or already planned) file: `edit` gets the
   * current content and returns the new one. Returns undefined, planning
   * nothing, when the file does not exist.
   */
  async edit(relativePath: string, edit: (content: string) => string): Promise<FileChange | undefined> {
    const key = toPosix(relativePath);
    const previous = this.changes.get(key);
    if (previous?.action === 'conflict') return previous;
    const current = await this.read(relativePath);
    if (current === undefined) return undefined;
    const before = previous ? previous.before : current;
    const after = edit(current);
    const action: ChangeAction = before === undefined ? 'create' : after === before ? 'unchanged' : 'update';
    return this.set({ path: key, action, before, after });
  }

  private set(change: FileChange): FileChange {
    this.changes.set(change.path, change);
    return change;
  }

  list(): FileChange[] {
    return [...this.changes.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  conflicts(): string[] {
    return this.list()
      .filter((change) => change.action === 'conflict')
      .map((change) => change.path);
  }

  /** True when applying the plan would write at least one file. */
  hasWrites(): boolean {
    return this.list().some((change) => change.action === 'create' || change.action === 'update');
  }

  /**
   * Writes every created or updated file. Each file goes to a temporary file
   * next to it and is renamed into place, so a file is never left half written.
   */
  async apply(): Promise<void> {
    const conflicts = this.conflicts();
    if (conflicts.length > 0) throw new ConflictError(conflicts);
    for (const change of this.list()) {
      if (change.action !== 'create' && change.action !== 'update') continue;
      const destination = this.resolve(change.path);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      const temporary = `${destination}.qn-${randomBytes(4).toString('hex')}.tmp`;
      // Keep the mode of an existing file (e.g. an executable git hook).
      const mode = change.before === undefined ? undefined : (await fs.stat(destination)).mode;
      try {
        await fs.writeFile(temporary, change.after, mode === undefined ? undefined : { mode });
        await fs.rename(temporary, destination);
      } finally {
        await fs.rm(temporary, { force: true });
      }
    }
  }
}
