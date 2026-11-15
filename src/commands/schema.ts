import { ERROR_CODES, EXIT_CODES, JSON_SCHEMA_VERSION } from '../core/errors.js';
import { COMMANDS, GLOBAL_OPTIONS, LEGACY_FLAGS, resolveCommand, UsageError, type CommandSpec, type OptionSpec } from '../spec.js';

/**
 * Machine-readable description of the CLI (ADR-001, D9): what `qn schema`,
 * `qn --help --json` and the MCP server return. Built from the same spec the
 * parser and the documentation use, so an agent never has to guess a flag.
 */

/** Declared default; boolean flags are false unless given. */
function defaultOf(spec: OptionSpec): { default?: string | boolean } {
  const value = spec.default ?? (spec.type === 'boolean' ? false : undefined);
  return value === undefined ? {} : { default: value };
}

function describeOptions(options: Record<string, OptionSpec>) {
  return Object.fromEntries(
    Object.entries(options).map(([name, spec]) => [
      name,
      {
        type: spec.type,
        ...(spec.short ? { short: spec.short } : {}),
        description: spec.description,
        ...(spec.choices ? { choices: [...spec.choices] } : {}),
        ...(spec.valueName ? { valueName: spec.valueName } : {}),
        ...defaultOf(spec)
      }
    ])
  );
}

function describeCommand(spec: CommandSpec) {
  return {
    name: spec.name,
    aliases: spec.aliases ?? [],
    summary: spec.summary,
    usage: spec.usage,
    arguments: (spec.arguments ?? []).map((argument) => ({
      name: argument.name,
      description: argument.description,
      required: Boolean(argument.required),
      variadic: Boolean(argument.variadic),
      ...(argument.choices ? { choices: [...argument.choices] } : {})
    })),
    options: describeOptions(spec.options),
    examples: spec.examples
  };
}

export function buildSchema(version: string) {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    name: 'qn',
    package: '@10565/quicknode-cli',
    version,
    usage: 'qn <command> [arguments] [options]',
    notes: [
      'Without a terminal (agents, CI, pipes) qn never prompts: it uses the declared defaults or fails with E_USAGE and a fix.',
      'Commands that write files accept --dry-run; with --json they list every file to create or change, with diffs.',
      'Every --json output has "ok" and "schemaVersion"; failures add "error": { code, message, fix }.',
      'No command deletes files: dry runs list the files to create and to change.'
    ],
    commands: Object.values(COMMANDS).map(describeCommand),
    globalOptions: describeOptions(GLOBAL_OPTIONS),
    legacyFlags: LEGACY_FLAGS,
    errors: Object.entries(ERROR_CODES).map(([code, { exitCode, description }]) => ({ code, exitCode, description })),
    exitCodes: EXIT_CODES
  };
}

/** Schema of one command, for `qn help <command> --json`. */
export function commandSchema(name: string) {
  const spec = resolveCommand(name);
  if (!spec) throw new UsageError(`Unknown command "${name}".`);
  return describeCommand(spec);
}
