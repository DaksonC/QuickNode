import { ConflictError } from './changes.js';
import { QnError, type ErrorCode } from './errors.js';
import { PathBlockedError, TargetNotEmptyError } from './scaffold.js';

export interface ErrorReport {
  code: ErrorCode;
  message: string;
  fix?: string;
  [detail: string]: unknown;
}

/**
 * Fix texts that depend on how the CLI was called: on the command line the
 * fix for E_FILES_EXIST is the same command with --force, over MCP it is
 * "call the tool again with force: true".
 */
export interface FixTexts {
  /** Used when the error has no fix of its own. */
  fallback?: Partial<Record<ErrorCode, string>>;
  /** Replaces the error's own fix (e.g. CLI usage hints that make no sense over MCP). */
  override?: Partial<Record<ErrorCode, string>>;
}

/** Stable code, message, fix and details of an error, for --json, the text output and MCP. */
export function describeError(error: unknown, { fallback = {}, override = {} }: FixTexts = {}): ErrorReport {
  const code: ErrorCode = error instanceof QnError ? error.code : 'E_INTERNAL';
  const message = error instanceof Error ? error.message : String(error);
  const fix = override[code] ?? (error instanceof QnError ? error.fix : undefined) ?? fallback[code];
  const report: ErrorReport = { code, message, ...(fix ? { fix } : {}) };
  if (error instanceof TargetNotEmptyError) Object.assign(report, { conflicts: error.conflicts, entries: error.entries });
  if (error instanceof PathBlockedError || error instanceof ConflictError) Object.assign(report, { paths: error.paths });
  return report;
}
