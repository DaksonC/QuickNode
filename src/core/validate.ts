import { QnError, type ErrorCode } from './errors.js';

/** Strict validation of the JSON files the CLI reads (quicknode.json, presets). */

export type Fail = (message: string) => never;

/** Checks that `value` is a plain object with only `allowed` keys. */
export function assertKeys(value: unknown, allowed: readonly string[], fail: Fail): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('must be a JSON object');
  const unknown = Object.keys(value as object).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) fail(`unknown key(s) ${unknown.join(', ')} (allowed: ${allowed.join(', ')})`);
}

/** Checks an optional string field against a closed list. */
export function assertChoice(object: Record<string, unknown>, key: string, choices: readonly string[], fail: Fail): void {
  const value = object[key];
  if (value !== undefined && (typeof value !== 'string' || !choices.includes(value))) {
    fail(`"${key}" must be one of ${choices.join(', ')}`);
  }
}

export function assertBoolean(object: Record<string, unknown>, key: string, fail: Fail): void {
  if (object[key] !== undefined && typeof object[key] !== 'boolean') fail(`"${key}" must be true or false`);
}

/** An error for invalid input that names the file it came from. */
export function failWith(code: ErrorCode, prefix: string, fix?: string): Fail {
  return (message) => {
    throw new QnError(code, `${prefix}: ${message}`, fix);
  };
}
