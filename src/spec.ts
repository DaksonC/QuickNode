import { parseArgs, type ParseArgsConfig } from 'node:util';

/**
 * Single source of truth for commands and flags: used by the parser, by
 * `--help` and (later) by the documentation generator, so they never diverge.
 */
export interface OptionSpec {
  type: 'boolean' | 'string';
  short?: string;
  description: string;
  /** Closed list of accepted values (string options only). */
  choices?: readonly string[];
}

export interface ArgumentSpec {
  name: string;
  description: string;
  /** Closed list of accepted values. */
  choices?: readonly string[];
}

export interface CommandSpec {
  name: string;
  /** Other names that run the same command. */
  aliases?: string[];
  summary: string;
  usage: string;
  /** Positional argument, if the command takes one. */
  argument?: ArgumentSpec;
  options: Record<string, OptionSpec>;
  examples: string[];
}

/**
 * Pages of the documentation site that `qn ui <topic>` can open. Only these
 * paths (relative to the fixed base URL) ever end up in a URL.
 */
export const DOCS_TOPICS = {
  start: 'start/',
  commands: 'commands/',
  create: 'commands/#create',
  ui: 'commands/#ui',
  structure: 'structure/',
  tutorial: 'tutorial/',
  add: 'add/',
  faq: 'faq/',
  compare: 'compare/',
  changelog: 'changelog/',
  adr: 'adr/'
} as const satisfies Record<string, string>;

export type DocsTopic = keyof typeof DOCS_TOPICS;

export const DOCS_LANGUAGES = ['en', 'pt'] as const;

export const GLOBAL_OPTIONS: Record<string, OptionSpec> = {
  help: { type: 'boolean', short: 'h', description: 'Show help' },
  version: { type: 'boolean', short: 'v', description: 'Show the version' },
  json: { type: 'boolean', description: 'Print a JSON result to stdout (no prompts, no colors)' }
};

export const COMMANDS: Record<string, CommandSpec> = {
  create: {
    name: 'create',
    argument: { name: 'name', description: 'Project folder and package name ("." for the current directory)' },
    summary: 'Create a new project with clean architecture',
    usage: 'qn create [name] [options]',
    options: {
      typescript: { type: 'boolean', short: 't', description: 'Use the TypeScript template (also -ts)' },
      javascript: { type: 'boolean', short: 'j', description: 'Use the JavaScript template (also -js)' },
      force: { type: 'boolean', short: 'f', description: 'Write into a non-empty directory, overwriting conflicting files' },
      yes: { type: 'boolean', short: 'y', description: 'Accept defaults without prompting (name, TypeScript)' },
      'dry-run': { type: 'boolean', description: 'Show what would be created without writing anything' },
      install: { type: 'boolean', description: 'Run npm install after creating the project' },
      git: { type: 'boolean', description: 'Initialize a git repository' },
      'no-credits': { type: 'boolean', description: 'Leave the "Generated with QuickNode" line out of the README' }
    },
    examples: [
      'qn create my-api',
      'qn create my-api -ts --git --install',
      'qn create . --javascript --force',
      'qn create my-api --dry-run',
      'qn create my-api --yes --json'
    ]
  },
  ui: {
    name: 'ui',
    aliases: ['docs'],
    summary: 'Open the documentation in the browser',
    usage: 'qn ui [topic] [options]',
    argument: { name: 'topic', description: 'Page to open', choices: Object.keys(DOCS_TOPICS) },
    options: {
      print: { type: 'boolean', short: 'p', description: 'Only print the link, do not open the browser' },
      lang: { type: 'string', description: 'Language of the page (default: from LANG)', choices: DOCS_LANGUAGES }
    },
    examples: ['qn ui', 'qn docs create', 'qn ui structure --lang pt', 'qn ui faq --print']
  }
};

/** Command name for a name or alias ("docs" -> "ui"). */
export function resolveCommand(name: string): CommandSpec | undefined {
  return COMMANDS[name] ?? Object.values(COMMANDS).find((spec) => spec.aliases?.includes(name));
}

/** Legacy two-letter flags from v1, which util.parseArgs cannot express. */
const LEGACY_FLAGS: Record<string, string> = { '-ts': '--typescript', '-js': '--javascript' };

/**
 * Best-effort --json detection for errors thrown before parsing succeeded
 * (arguments after "--" are positionals, not flags).
 */
export function wantsJson(argv: string[]): boolean {
  const end = argv.indexOf('--');
  return (end === -1 ? argv : argv.slice(0, end)).includes('--json');
}

export class UsageError extends Error {
  readonly code = 'USAGE';

  constructor(
    message: string,
    readonly command?: string
  ) {
    super(message);
    this.name = 'UsageError';
  }
}

export type ParsedArgs = { json: boolean } & (
  | { kind: 'help'; command?: string }
  | { kind: 'version' }
  | { kind: 'command'; command: string; positionals: string[]; values: FlagValues }
);

function toParseArgsOptions(options: Record<string, OptionSpec>): ParseArgsConfig['options'] {
  return Object.fromEntries(
    Object.entries(options).map(([name, { type, short }]) => [name, short ? { type, short } : { type }])
  );
}

/** Parses argv (without node and script) into a help/version/command request. */
export function parseCommandLine(argv: string[]): ParsedArgs {
  const args = argv.map((arg) => LEGACY_FLAGS[arg] ?? arg);
  const [first, ...rest] = args;

  if (first === undefined) return { kind: 'help', json: false };

  if (first === 'help' || first.startsWith('-')) {
    // Global flags, possibly followed by a command name: "qn --help create".
    const { values, positionals } = parse(first === 'help' ? rest : args, GLOBAL_OPTIONS, undefined);
    const json = Boolean(values.json);
    if (values.version && first !== 'help') return { kind: 'version', json };
    const command = positionals[0];
    return { kind: 'help', command: command === undefined ? undefined : (resolveCommand(command)?.name ?? command), json };
  }

  const spec = resolveCommand(first);
  if (!spec) throw new UsageError(`Unknown command "${first}".`);

  const { values, positionals } = parse(rest, { ...GLOBAL_OPTIONS, ...spec.options }, spec.name);
  const json = Boolean(values.json);
  if (values.help) return { kind: 'help', command: spec.name, json };
  if (values.version) return { kind: 'version', json };
  assertChoices(spec, positionals, values);
  return { kind: 'command', command: spec.name, positionals, values, json };
}

/** Rejects values outside the closed lists declared in the spec. */
function assertChoices(spec: CommandSpec, positionals: string[], values: FlagValues): void {
  const { argument } = spec;
  const value = positionals[0];
  if (argument?.choices && value !== undefined && !argument.choices.includes(value)) {
    throw new UsageError(`Unknown ${argument.name} "${value}". Choose one of: ${argument.choices.join(', ')}.`, spec.name);
  }
  for (const [name, option] of Object.entries(spec.options)) {
    const given = values[name];
    if (option.choices && typeof given === 'string' && !option.choices.includes(given)) {
      throw new UsageError(`Invalid value "${given}" for --${name}. Choose one of: ${option.choices.join(', ')}.`, spec.name);
    }
  }
}

type FlagValues = Record<string, boolean | string | undefined>;

function parse(
  args: string[],
  options: Record<string, OptionSpec>,
  command: string | undefined
): { values: FlagValues; positionals: string[] } {
  try {
    const { values, positionals } = parseArgs({
      args,
      options: toParseArgsOptions(options),
      allowPositionals: true,
      strict: true
    });
    return { values: values as FlagValues, positionals };
  } catch (error) {
    throw new UsageError((error as Error).message.split('\n')[0], command);
  }
}
