import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATABASES, PACKAGE_MANAGERS, TEST_RUNNERS } from '../spec.js';
import { QnError, type ErrorCode } from './errors.js';
import type { ProjectOptions } from './render.js';

/** File at the project root that records how the project was created (ADR-001, D6). */
export const CONFIG_FILE = 'quicknode.json';
export const CONFIG_SCHEMA_VERSION = 1;
export const TEMPLATES = ['typescript', 'javascript'] as const;

export interface Layers {
  domain: string;
  infrastructure: string;
}

export const DEFAULT_LAYERS: Layers = { domain: 'src/domain', infrastructure: 'src/infrastructure' };

export interface QuickNodeConfig extends ProjectOptions {
  schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  /** Version of the CLI whose template generated the files ("unknown" for adopted v2 projects). */
  templateVersion: string;
  layers: Layers;
  /** Hash of each file as the template generated it; a different hash means the user changed it. */
  files: Record<string, string>;
}

export class ConfigError extends QnError {
  constructor(message: string) {
    super('E_CONFIG_INVALID', `${CONFIG_FILE}: ${message}`, `fix ${CONFIG_FILE} by hand, or delete it to fall back to detection by layout`);
  }
}

type Fail = (message: string) => never;

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

/** A relative path inside the project, with "/" separators. */
const isProjectPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value !== '' &&
  !value.startsWith('/') &&
  !/^[A-Za-z]:/.test(value) &&
  !value.split('/').some((part) => part === '..' || part === '' || part.includes('\\'));

const CONFIG_KEYS = ['$schema', 'schemaVersion', 'templateVersion', 'template', 'db', 'pm', 'test', 'credits', 'layers', 'files'];

/** Parses and validates quicknode.json strictly: a wrong file fails instead of being half used. */
export function parseConfig(text: string): QuickNodeConfig {
  const fail: Fail = (message) => {
    throw new ConfigError(message);
  };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    fail(`not valid JSON (${(error as Error).message})`);
  }
  assertKeys(value, CONFIG_KEYS, fail);
  if (value.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    fail(`"schemaVersion" must be ${CONFIG_SCHEMA_VERSION} (this CLI does not know other versions)`);
  }
  if (typeof value.templateVersion !== 'string' || value.templateVersion === '') fail('"templateVersion" must be a string');
  for (const key of ['template', 'db', 'pm', 'test'] as const) {
    if (value[key] === undefined) fail(`"${key}" is required`);
  }
  assertChoice(value, 'template', TEMPLATES, fail);
  assertChoice(value, 'db', DATABASES, fail);
  assertChoice(value, 'pm', PACKAGE_MANAGERS, fail);
  assertChoice(value, 'test', TEST_RUNNERS, fail);
  assertBoolean(value, 'credits', fail);

  const layers = value.layers ?? DEFAULT_LAYERS;
  assertKeys(layers, ['domain', 'infrastructure'], (message) => fail(`"layers" ${message}`));
  for (const key of ['domain', 'infrastructure'] as const) {
    if (!isProjectPath(layers[key])) fail(`"layers.${key}" must be a relative path inside the project`);
  }

  const files = value.files ?? {};
  if (typeof files !== 'object' || files === null || Array.isArray(files)) fail('"files" must be an object');
  for (const [file, hash] of Object.entries(files as object)) {
    if (!isProjectPath(file)) fail(`"files" has a path outside the project: ${file}`);
    if (typeof hash !== 'string' || !/^sha256-[A-Za-z0-9+/]+=*$/.test(hash)) fail(`"files.${file}" must be a sha256 hash`);
  }

  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    templateVersion: value.templateVersion as string,
    template: value.template as QuickNodeConfig['template'],
    db: value.db as QuickNodeConfig['db'],
    pm: value.pm as QuickNodeConfig['pm'],
    test: value.test as QuickNodeConfig['test'],
    credits: value.credits !== false,
    layers: layers as unknown as Layers,
    files: files as Record<string, string>
  };
}

/** Compares "x.y.z" versions; prerelease tags are ignored. */
export function compareVersions(a: string, b: string): number {
  const parts = (version: string) => version.split(/[.-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  const [left, right] = [parts(a), parts(b)];
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

/** Reads quicknode.json from a project root; undefined when there is none. */
export function readConfig(root: string): QuickNodeConfig | undefined {
  let text: string;
  try {
    text = readFileSync(path.join(root, CONFIG_FILE), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  return parseConfig(text);
}

/** quicknode.json content, with keys in a stable order and files sorted. */
export function serializeConfig(config: QuickNodeConfig): string {
  const files = Object.fromEntries(Object.entries(config.files).sort(([a], [b]) => (a < b ? -1 : 1)));
  const ordered = {
    schemaVersion: config.schemaVersion,
    templateVersion: config.templateVersion,
    template: config.template,
    db: config.db,
    pm: config.pm,
    test: config.test,
    credits: config.credits,
    layers: config.layers,
    files
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** An error for invalid input that names the file it came from. */
export function failWith(code: ErrorCode, prefix: string, fix?: string): Fail {
  return (message) => {
    throw new QnError(code, `${prefix}: ${message}`, fix);
  };
}
