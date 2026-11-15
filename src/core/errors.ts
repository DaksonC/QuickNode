/**
 * Stable error codes (ADR-001, D9). They are a public contract for scripts
 * and AI agents: a code is never renamed or reused within a major version.
 * The catalogue feeds `qn schema` and the documentation.
 */
export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_USAGE = 2;

/** Every exit code the CLI uses. */
export const EXIT_CODES = {
  [EXIT_OK]: 'Success',
  [EXIT_ERROR]: 'The command failed (see the error code)',
  [EXIT_USAGE]: 'Invalid usage (E_USAGE)'
} as const;

export const ERROR_CODES = {
  E_USAGE: { exitCode: EXIT_USAGE, description: 'Invalid usage: unknown command, flag or value, or a missing argument' },
  E_DIR_NOT_EMPTY: { exitCode: EXIT_ERROR, description: 'qn create: the target folder is not empty (use --force to write into it)' },
  E_PATH_BLOCKED: { exitCode: EXIT_ERROR, description: 'qn create: a project path is taken by a file or folder of another type' },
  E_FILES_EXIST: { exitCode: EXIT_ERROR, description: 'qn generate / qn add: files exist with other content (use --force to overwrite)' },
  E_NOT_A_PROJECT: { exitCode: EXIT_ERROR, description: 'The command must run inside a project created with qn create' },
  E_ABORTED: { exitCode: EXIT_ERROR, description: 'An interactive prompt was cancelled' },
  E_INTERNAL: { exitCode: EXIT_ERROR, description: 'Unexpected error (rerun with DEBUG=1 and report it)' }
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Version of every --json output; incompatible changes only in a major release. */
export const JSON_SCHEMA_VERSION = 1;

/** Base of the CLI's own errors: a stable code, a short message and, when known, how to fix it. */
export class QnError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** A command or action that fixes the problem. */
    readonly fix?: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Quotes an argument for a POSIX shell when needed, so a suggested command can be pasted. */
export function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

/** The same command line with `flag` added (once), ready to suggest as a fix. */
export function withFlag(argv: string[], flag: string): string {
  const end = argv.indexOf('--');
  const args = end === -1 ? argv : argv.slice(0, end);
  return ['qn', ...args.filter((arg) => arg !== flag), flag].map(shellQuote).join(' ');
}
