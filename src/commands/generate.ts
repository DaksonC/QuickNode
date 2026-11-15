import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangePlan, type ChangeAction } from '../core/changes.js';
import { unifiedDiff } from '../core/diff.js';
import { insertBeforeMarker, type MarkerStatus } from '../core/markers.js';
import { generatorDir, type TemplateName } from '../core/paths.js';
import { detectProject } from '../core/project.js';
import { listTemplateFiles } from '../core/scaffold.js';
import { adaptTestFile, formatImports } from '../core/source-format.js';
import { CRUD_PARTS, GENERATOR_TYPES, UsageError } from '../spec.js';

export type GeneratorType = (typeof GENERATOR_TYPES)[number];
/** What `crud` is made of, in dependency order. */
export type Part = (typeof CRUD_PARTS)[number];
/** Generator folders: the four parts plus the use case test. */
type Unit = Part | 'test';

/** Longest PascalCase name; keeps generated lines within Prettier's 100 columns. */
export const MAX_NAME_LENGTH = 20;

export interface FeatureNames {
  /** PascalCase singular: OrderItem */
  Name: string;
  /** kebab-case singular, used in file names: order-item */
  name: string;
  /** PascalCase plural: OrderItems */
  Names: string;
  /** kebab-case plural, used in URLs: order-items */
  names: string;
  /** snake_case plural, used as table name: order_items */
  table: string;
  /** Words for messages: "order item", "order items", "Order item" */
  label: string;
  labels: string;
  Label: string;
}

export interface GenerateInput {
  type: GeneratorType;
  name: string;
  /** Subset of crud parts (crud only). */
  only?: Part[];
  test: boolean;
  dryRun: boolean;
  force: boolean;
}

export interface WiringResult {
  file: string;
  marker: string;
  status: MarkerStatus | 'file-missing';
}

export interface GenerateResult {
  dryRun: boolean;
  type: GeneratorType;
  parts: Unit[];
  names: FeatureNames;
  root: string;
  language: TemplateName;
  files: { path: string; action: ChangeAction; diff?: string }[];
  wiring: WiringResult[];
  /** Manual steps and missing pieces, for the user to act on. */
  notes: string[];
}

const RESERVED = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static implements interface package private protected public await'.split(
    ' '
  )
);

function pluralize(word: string): string {
  // Already plural ("items"), but not "address", "status" or "analysis".
  if (/[^sui]s$/.test(word)) return word;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Derives every spelling of a feature name ("order-item", "OrderItem", "order_item"...). */
export function featureNames(raw: string): FeatureNames {
  if (!/^[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$/.test(raw)) {
    throw new UsageError(
      `Invalid name "${raw}": use letters and digits, starting with a letter, words separated by "-", "_" or camelCase (e.g. product, order-item).`,
      'generate'
    );
  }
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[-_]/)
    .map((word) => word.toLowerCase());
  const plural = [...words.slice(0, -1), pluralize(words[words.length - 1])];
  const Name = words.map(capitalize).join('');
  if (Name.length > MAX_NAME_LENGTH) {
    throw new UsageError(`Name "${raw}" is too long (at most ${MAX_NAME_LENGTH} characters in PascalCase).`, 'generate');
  }
  const camel = words[0] + words.slice(1).map(capitalize).join('');
  if (RESERVED.has(camel)) throw new UsageError(`"${raw}" is a reserved word in JavaScript.`, 'generate');
  return {
    Name,
    name: words.join('-'),
    Names: plural.map(capitalize).join(''),
    names: plural.join('-'),
    table: plural.join('_'),
    label: words.join(' '),
    labels: plural.join(' '),
    Label: capitalize(words.join(' '))
  };
}

/** Replaces the __Name__-style placeholders of generator files. */
export function fillPlaceholders(text: string, names: FeatureNames): string {
  return text.replace(/__(Name|name|Names|names|table|label|labels|Label)__/g, (_, key: keyof FeatureNames) => names[key]);
}

/** Converts parsed flags into a GenerateInput. */
export function generateInputFromFlags(
  positionals: string[],
  values: Record<string, boolean | string | undefined>
): GenerateInput {
  const [type, name, ...extra] = positionals;
  if (type === undefined) {
    throw new UsageError(`Missing type. Choose one of: ${GENERATOR_TYPES.join(', ')}.`, 'generate');
  }
  if (!(GENERATOR_TYPES as readonly string[]).includes(type)) {
    throw new UsageError(`Unknown type "${type}". Choose one of: ${GENERATOR_TYPES.join(', ')}.`, 'generate');
  }
  if (name === undefined) throw new UsageError(`Missing name, e.g. "qn generate ${type} product".`, 'generate');
  if (extra.length > 0) throw new UsageError('Only one name can be given.', 'generate');

  let only: Part[] | undefined;
  if (typeof values.only === 'string') {
    if (type !== 'crud') throw new UsageError('--only works with "crud" only.', 'generate');
    only = values.only.split(',').map((part) => part.trim()) as Part[];
    const unknown = only.filter((part) => !(CRUD_PARTS as readonly string[]).includes(part));
    if (unknown.length > 0 || only.length === 0) {
      throw new UsageError(`Invalid --only "${values.only}". Use a comma-separated list of: ${CRUD_PARTS.join(', ')}.`, 'generate');
    }
  }

  return {
    type: type as GeneratorType,
    name,
    only,
    test: !values['no-test'],
    dryRun: Boolean(values['dry-run']),
    force: Boolean(values.force)
  };
}

function unitsFor(input: GenerateInput): Unit[] {
  const parts: Part[] = input.type === 'crud' ? CRUD_PARTS.filter((part) => !input.only || input.only.includes(part)) : [input.type];
  return input.test && parts.includes('usecase') ? [...parts, 'test'] : parts;
}

interface WiringEntry {
  file: string;
  marker: string;
  snippet: string;
}

/** Files each unit relies on, to warn when they are neither present nor generated. */
function requirements(unit: Unit, names: FeatureNames, ext: string): Record<string, string> {
  const entity = `src/domain/entities/${names.name}.${ext}`;
  const repository = `src/domain/repositories/${names.name}-repository.${ext}`;
  const useCases = `src/domain/use-cases/${names.name}-use-cases.${ext}`;
  switch (unit) {
    case 'entity':
      return {};
    case 'repository':
      return { [entity]: 'entity' };
    case 'usecase':
      return { [entity]: 'entity', [repository]: 'repository' };
    case 'test':
      return { [entity]: 'entity', [repository]: 'repository', [useCases]: 'usecase' };
    case 'controller':
      return { [useCases]: 'usecase', [repository]: 'repository' };
  }
}

/**
 * Generates (or, with dryRun, plans) the files of a feature in the right
 * layers and wires them into the project through the template markers.
 */
export async function generate(input: GenerateInput, cwd: string): Promise<GenerateResult> {
  const project = detectProject(cwd);
  const names = featureNames(input.name);
  const units = unitsFor(input);
  const sourceDir = generatorDir(project.language);
  const plan = new ChangePlan(project.root, input.force);
  const wiring: WiringResult[] = [];

  const allWiring = JSON.parse(await fs.readFile(path.join(sourceDir, 'wiring.json'), 'utf8')) as Record<string, WiringEntry[]>;

  for (const unit of units) {
    const unitDir = path.join(sourceDir, unit);
    for (const file of await listTemplateFiles(unitDir)) {
      let content = formatImports(fillPlaceholders(await fs.readFile(path.join(unitDir, file), 'utf8'), names));
      if (unit === 'test') content = adaptTestFile(content, project.testRunner, project.language);
      await plan.write(fillPlaceholders(file, names), content);
    }

    for (const entry of allWiring[unit] ?? []) {
      const snippet = formatImports(fillPlaceholders(entry.snippet, names));
      const current = await plan.read(entry.file);
      let status: WiringResult['status'] = 'file-missing';
      if (current !== undefined) {
        const result = insertBeforeMarker(current, entry.marker, snippet);
        status = result.status;
        if (result.status === 'inserted') await plan.edit(entry.file, () => result.content);
      }
      wiring.push({ file: entry.file, marker: entry.marker, status });
      if (status === 'missing' || status === 'file-missing') {
        const where = status === 'missing' ? `the "// qn:${entry.marker}" marker was not found` : 'the file was not found';
        plan.notes.push(`Add to ${entry.file} by hand (${where}):\n${snippet}`);
      }
    }
  }

  for (const unit of units) {
    for (const [file, needed] of Object.entries(requirements(unit, names, project.ext))) {
      if (units.includes(needed as Unit) || (await plan.exists(file))) continue;
      const note = `${unit} needs ${file}: run "qn generate ${needed} ${names.name}".`;
      if (!plan.notes.includes(note)) plan.notes.push(note);
    }
  }

  const files = plan.list().map((change) => ({
    path: change.path,
    action: change.action,
    ...(input.dryRun && change.action === 'update' ? { diff: unifiedDiff(change.path, change.before, change.after) } : {})
  }));

  if (!input.dryRun) await plan.apply();

  return {
    dryRun: input.dryRun,
    type: input.type,
    parts: units,
    names,
    root: project.root,
    language: project.language,
    files,
    wiring,
    notes: plan.notes
  };
}
