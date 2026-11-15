import { ConflictError } from './changes.js';
import { QnError, withFlag, type ErrorCode } from './errors.js';
import { PathBlockedError, TargetNotEmptyError } from './scaffold.js';

export interface ErrorReport {
  code: ErrorCode;
  message: string;
  fix?: string;
  [detail: string]: unknown;
}

/** Stable code, message, fix and details of an error, for --json and for the text output. */
export function describeError(error: unknown, argv: string[]): ErrorReport {
  if (!(error instanceof QnError)) {
    return {
      code: 'E_INTERNAL',
      message: error instanceof Error ? error.message : String(error),
      fix: `DEBUG=1 qn ${argv.join(' ')}`.trim()
    };
  }
  // Errors solved by --force suggest the same command with it.
  const fix = error.fix ?? (error.code === 'E_DIR_NOT_EMPTY' || error.code === 'E_FILES_EXIST' ? withFlag(argv, '--force') : undefined);
  const report: ErrorReport = { code: error.code, message: error.message, ...(fix ? { fix } : {}) };
  if (error instanceof TargetNotEmptyError) Object.assign(report, { conflicts: error.conflicts, entries: error.entries });
  if (error instanceof PathBlockedError || error instanceof ConflictError) Object.assign(report, { paths: error.paths });
  return report;
}
