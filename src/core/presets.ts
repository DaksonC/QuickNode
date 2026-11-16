import fs from 'node:fs/promises';
import path from 'node:path';
import { DATABASES, PACKAGE_MANAGERS, PRESETS, TEMPLATES, TEST_RUNNERS, type Database, type PackageManager } from '../spec.js';
import { QnError } from './errors.js';
import type { TemplateName } from './paths.js';
import type { TestRunner } from './project.js';
import { assertBoolean, assertChoice, assertKeys, failWith } from './validate.js';

/** What a preset may set: the same choices as the flags of `qn create`. */
export interface PresetValues {
  template?: TemplateName;
  db?: Database;
  pm?: PackageManager;
  test?: TestRunner;
  git?: boolean;
  install?: boolean;
  credits?: boolean;
}

export const PRESET_KEYS = ['$schema', 'template', 'db', 'pm', 'test', 'git', 'install', 'credits'] as const;

export interface Preset {
  /** Built-in name, or the file path as given. */
  name: string;
  values: PresetValues;
}

/** A value with a path separator or a .json extension is a file; anything else is a built-in name. */
export const isPresetFile = (value: string) => /[/\\]/.test(value) || value.endsWith('.json');

/** Validates the content of a preset strictly: unknown keys or values are errors, not ignored. */
export function validatePreset(value: unknown, source: string): PresetValues {
  const fail = failWith('E_PRESET_INVALID', `Preset ${source}`, `fix the preset (allowed keys: ${PRESET_KEYS.slice(1).join(', ')})`);
  assertKeys(value, PRESET_KEYS, fail);
  assertChoice(value, 'template', TEMPLATES, fail);
  assertChoice(value, 'db', DATABASES, fail);
  assertChoice(value, 'pm', PACKAGE_MANAGERS, fail);
  assertChoice(value, 'test', TEST_RUNNERS, fail);
  for (const key of ['git', 'install', 'credits']) assertBoolean(value, key, fail);
  const values: Record<string, unknown> = { ...value };
  delete values.$schema;
  return values as PresetValues;
}

const presetError = (message: string, fix: string) => new QnError('E_PRESET_INVALID', message, fix);

/**
 * Loads a built-in preset by name or a local JSON preset (path relative to
 * `cwd`), validated before anything is generated.
 */
export async function loadPreset(value: string, cwd: string): Promise<Preset> {
  if (!isPresetFile(value)) {
    const builtIn = PRESETS[value as keyof typeof PRESETS];
    if (!builtIn) {
      const names = Object.keys(PRESETS).join(', ');
      throw presetError(`Unknown preset "${value}".`, `use one of ${names}, or a file such as ./preset.json`);
    }
    return { name: value, values: { ...builtIn.values } };
  }

  let text: string;
  try {
    text = await fs.readFile(path.resolve(cwd, value), 'utf8');
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code ?? (error as Error).message;
    throw presetError(`Preset ${value} cannot be read (${reason}).`, 'check the path of the preset file');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw presetError(`Preset ${value} is not valid JSON (${(error as Error).message}).`, 'fix the JSON of the preset file');
  }
  return { name: value, values: validatePreset(json, value) };
}
