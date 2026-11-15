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
  /** Placeholder shown in help for free-form string values. */
  valueName?: string;
}

export interface ArgumentSpec {
  name: string;
  description: string;
  /** Closed list of accepted values. */
  choices?: readonly string[];
  /** Accepts several values (last argument only). */
  variadic?: boolean;
}

export interface CommandSpec {
  name: string;
  /** Other names that run the same command. */
  aliases?: string[];
  summary: string;
  usage: string;
  /** Positional arguments, in order. */
  arguments?: ArgumentSpec[];
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
  generate: 'commands/#generate',
  check: 'commands/#check',
  add: 'add/',
  doctor: 'commands/#doctor',
  faq: 'faq/',
  compare: 'compare/',
  changelog: 'changelog/',
  adr: 'adr/'
} as const satisfies Record<string, string>;

export type DocsTopic = keyof typeof DOCS_TOPICS;

export const DOCS_LANGUAGES = ['en', 'pt'] as const;

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export const TEST_RUNNERS = ['jest', 'node'] as const;

/** Kinds of code `qn generate` writes; crud is all the parts at once. */
export const GENERATOR_TYPES = ['crud', 'entity', 'usecase', 'repository', 'controller'] as const;
export const CRUD_PARTS = ['entity', 'repository', 'usecase', 'controller'] as const;

/** Recipes of `qn add` (github-actions is another name for ci). */
export const RECIPES = [
  'agents',
  'auth',
  'ci',
  'docker',
  'eslint',
  'github-actions',
  'graceful-shutdown',
  'healthcheck',
  'husky',
  'rate-limit',
  'swagger',
  'tests'
] as const;

export const GLOBAL_OPTIONS: Record<string, OptionSpec> = {
  help: { type: 'boolean', short: 'h', description: 'Show help' },
  version: { type: 'boolean', short: 'v', description: 'Show the version' },
  json: { type: 'boolean', description: 'Print a JSON result to stdout (no prompts, no colors)' }
};

export const COMMANDS: Record<string, CommandSpec> = {
  create: {
    name: 'create',
    arguments: [{ name: 'name', description: 'Project folder and package name ("." for the current directory)' }],
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
      'no-credits': { type: 'boolean', description: 'Leave the "Generated with QuickNode" line out of the README' },
      pm: { type: 'string', description: 'Package manager used in scripts, docs and --install (default: npm)', choices: PACKAGE_MANAGERS },
      test: { type: 'string', description: 'Test runner (default: jest; node uses the built-in node:test)', choices: TEST_RUNNERS }
    },
    examples: [
      'qn create my-api',
      'qn create my-api -ts --git --install',
      'qn create my-api --pm pnpm --test node',
      'qn create . --javascript --force',
      'qn create my-api --dry-run',
      'qn create my-api --yes --json'
    ]
  },
  generate: {
    name: 'generate',
    aliases: ['g'],
    summary: 'Generate a feature in the clean architecture layers, already wired',
    usage: 'qn generate <type> <name> [options]',
    arguments: [
      { name: 'type', description: 'What to generate (crud = all the parts)', choices: GENERATOR_TYPES },
      { name: 'name', description: 'Feature name, e.g. product or order-item' }
    ],
    options: {
      only: {
        type: 'string',
        valueName: 'parts',
        description: `With crud, generate only these parts (comma-separated: ${CRUD_PARTS.join(', ')})`
      },
      'no-test': { type: 'boolean', description: 'Do not generate the use case test' },
      'dry-run': { type: 'boolean', description: 'Show the files to create or change without writing anything' },
      force: { type: 'boolean', short: 'f', description: 'Overwrite existing files with different content' }
    },
    examples: [
      'qn generate crud product',
      'qn g crud order-item --dry-run',
      'qn g crud product --only entity,repository',
      'qn g usecase product --no-test',
      'qn g crud product --json'
    ]
  },
  check: {
    name: 'check',
    summary: 'Check the dependency rule: domain must not import infrastructure, frameworks or ORMs',
    usage: 'qn check [options]',
    options: {},
    examples: ['qn check', 'qn check --json']
  },
  add: {
    name: 'add',
    summary: 'Add a tool to an existing project (idempotent)',
    usage: 'qn add <recipe...> [options]',
    arguments: [{ name: 'recipe', description: 'Recipes to apply', choices: RECIPES, variadic: true }],
    options: {
      'dry-run': { type: 'boolean', description: 'Show the diff without writing anything' },
      force: { type: 'boolean', short: 'f', description: 'Overwrite existing files with different content' }
    },
    examples: ['qn add docker', 'qn add auth rate-limit --dry-run', 'qn add ci --json', 'qn add agents']
  },
  doctor: {
    name: 'doctor',
    summary: 'Check Node.js, .env, Docker, vulnerabilities and the dependency rule',
    usage: 'qn doctor [options]',
    options: {
      offline: { type: 'boolean', description: 'Skip npm audit (no network)' }
    },
    examples: ['qn doctor', 'qn doctor --offline', 'qn doctor --json']
  },
  ui: {
    name: 'ui',
    aliases: ['docs'],
    summary: 'Open the documentation in the browser',
    usage: 'qn ui [topic] [options]',
    arguments: [{ name: 'topic', description: 'Page to open', choices: Object.keys(DOCS_TOPICS) }],
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
export const LEGACY_FLAGS: Record<string, string> = { '-ts': '--typescript', '-js': '--javascript' };

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
  const args = spec.arguments ?? [];
  positionals.forEach((value, index) => {
    const argument = args[index] ?? (args.at(-1)?.variadic ? args.at(-1) : undefined);
    if (argument?.choices && !argument.choices.includes(value)) {
      throw new UsageError(`Unknown ${argument.name} "${value}". Choose one of: ${argument.choices.join(', ')}.`, spec.name);
    }
  });
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
