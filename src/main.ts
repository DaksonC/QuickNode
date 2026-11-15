import { addInputFromFlags, addRecipes } from './commands/add.js';
import { checkProject } from './commands/check.js';
import { createInputFromFlags, createProject, type CreateResult } from './commands/create.js';
import { doctor } from './commands/doctor.js';
import { envCommand, envInputFromFlags } from './commands/env.js';
import { generate, generateInputFromFlags } from './commands/generate.js';
import { runMcpServer } from './commands/mcp.js';
import { buildSchema, commandSchema } from './commands/schema.js';
import { DOCS_URL, openDocs, uiInputFromFlags, type UiContext } from './commands/ui.js';
import { upgrade, upgradeInputFromFlags } from './commands/upgrade.js';
import { ConflictError } from './core/changes.js';
import { describeError, type ErrorReport } from './core/error-report.js';
import {
  ERROR_CODES,
  EXIT_ERROR,
  EXIT_OK,
  EXIT_USAGE,
  JSON_SCHEMA_VERSION,
  QnError,
  shellQuote,
  withFlag
} from './core/errors.js';
import { cliVersion } from './core/paths.js';
import { PathBlockedError, TargetNotEmptyError } from './core/scaffold.js';
import {
  COMMANDS,
  GLOBAL_OPTIONS,
  parseCommandLine,
  resolveCommand,
  UsageError,
  wantsJson,
  type CommandSpec,
  type OptionSpec
} from './spec.js';
import { renderBanner } from './ui/banner.js';
import { createPrompter } from './ui/prompt.js';
import { renderAdd, renderCheck, renderCreate, renderDoctor, renderEnv, renderGenerate, renderUpgrade } from './ui/render.js';
import { createStyle, type Style } from './ui/style.js';

export { DOCS_URL };
const MAX_LISTED_FILES = 10;

export { EXIT_ERROR, EXIT_OK, EXIT_USAGE };

type TTYStream = NodeJS.WritableStream & { isTTY?: boolean; hasColors?: () => boolean };

export interface IO {
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  stdout: TTYStream;
  stderr: TTYStream;
  cwd: string;
  /** Defaults to process.env / process.platform; injectable for tests. */
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  /** How `qn ui` launches the system link opener (tests replace it). */
  open?: UiContext['open'];
  fileExists?: UiContext['fileExists'];
}

const defaultIO = (): IO => ({ stdin: process.stdin, stdout: process.stdout, stderr: process.stderr, cwd: process.cwd() });

export const getVersion = cliVersion;

/** Runs the CLI and returns the process exit code. */
export async function main(argv: string[], io: IO = defaultIO()): Promise<number> {
  const out = createStyle(io.stdout);
  const err = createStyle(io.stderr);
  let json = wantsJson(argv);
  const writeJson = (value: object) =>
    io.stdout.write(`${JSON.stringify({ schemaVersion: JSON_SCHEMA_VERSION, ...value }, null, 2)}\n`);

  try {
    const parsed = parseCommandLine(argv);
    json = parsed.json;
    if (parsed.kind === 'version') {
      if (json) writeJson({ ok: true, version: getVersion() });
      else io.stdout.write(`${getVersion()}\n`);
      return EXIT_OK;
    }
    if (parsed.kind === 'help') {
      // As JSON, help is the specification itself (ADR-001, D9): agents discover instead of guessing.
      if (json) {
        writeJson(parsed.command ? { ok: true, command: commandSchema(parsed.command) } : { ok: true, ...buildSchema(getVersion()) });
      } else {
        io.stdout.write(renderHelp(parsed.command, out, Boolean(io.stdout.isTTY)));
      }
      return EXIT_OK;
    }

    const { positionals, values } = parsed;
    /** Prints a command result as JSON or as text and returns the exit code. */
    const finish = (value: { ok: boolean }, text: string, code = value.ok ? EXIT_OK : EXIT_ERROR) => {
      if (json) writeJson(value);
      else io.stdout.write(text);
      return code;
    };

    switch (parsed.command) {
      case 'schema': {
        if (positionals.length > 0) throw new UsageError('qn schema takes no arguments.', 'schema');
        // Always JSON: the schema is meant for programs.
        writeJson({ ok: true, ...buildSchema(getVersion()) });
        return EXIT_OK;
      }
      case 'mcp': {
        if (positionals.length > 0) throw new UsageError('qn mcp takes no arguments.', 'mcp');
        return runMcpServer({ stdin: io.stdin, stdout: io.stdout, cwd: io.cwd, version: getVersion() });
      }
      case 'ui': {
        const result = await openDocs(uiInputFromFlags(positionals, values), {
          env: io.env ?? process.env,
          platform: io.platform ?? process.platform,
          interactive: !json && Boolean(io.stdout.isTTY),
          open: io.open,
          fileExists: io.fileExists
        });
        if (result.opened && !json) io.stderr.write(`${err.muted('› Opening the documentation in your browser')}\n`);
        return finish({ ok: true, ...result }, `${result.url}\n`);
      }
      case 'generate': {
        const result = await generate(generateInputFromFlags(positionals, values), io.cwd);
        // A dry run that would hit conflicts reports ok: false and exit 1, like the real run.
        return finish({ ok: !result.files.some((file) => file.action === 'conflict'), ...result }, renderGenerate(result, out));
      }
      case 'check': {
        if (positionals.length > 0) throw new UsageError('qn check takes no arguments.', 'check');
        const result = await checkProject(io.cwd);
        return finish(result, renderCheck(result, out));
      }
      case 'add': {
        const result = await addRecipes(addInputFromFlags(positionals, values), io.cwd);
        return finish({ ok: !result.files.some((file) => file.action === 'conflict'), ...result }, renderAdd(result, out));
      }
      case 'env': {
        const result = await envCommand(envInputFromFlags(positionals, values), io.cwd);
        return finish(result, renderEnv(result, out));
      }
      case 'upgrade': {
        const input = upgradeInputFromFlags(positionals, values);
        const interactive = !json && !input.yes && Boolean(io.stdin.isTTY && io.stderr.isTTY);
        const prompter = interactive ? createPrompter(io.stdin, io.stderr) : undefined;
        try {
          const result = await upgrade(input, {
            cwd: io.cwd,
            confirm: prompter
              ? async (plan) => {
                  // The plan (with the diffs of changed files) comes first, then the question.
                  io.stderr.write(renderUpgrade(plan, err, true));
                  return prompter.confirm('Apply these changes?');
                }
              : undefined
          });
          return finish(result, renderUpgrade(result, out));
        } finally {
          prompter?.close();
        }
      }
      case 'doctor': {
        if (positionals.length > 0) throw new UsageError('qn doctor takes no arguments.', 'doctor');
        const result = await doctor({ cwd: io.cwd, offline: Boolean(values.offline) });
        return finish(result, renderDoctor(result, out));
      }
    }

    const input = createInputFromFlags(positionals, values);
    const interactive = !json && !input.yes && Boolean(io.stdin.isTTY && io.stderr.isTTY);
    const prompter = interactive ? createPrompter(io.stdin, io.stderr) : undefined;

    let result: CreateResult;
    try {
      result = await createProject(input, {
        cwd: io.cwd,
        prompter,
        progress: json ? undefined : (message) => io.stderr.write(`${err.muted(`› ${message}`)}\n`)
      });
    } finally {
      prompter?.close();
    }

    const stepsOk = result.git?.ok !== false && result.install?.ok !== false;
    return finish({ ok: stepsOk, ...result }, renderCreate(result, out, DOCS_URL));
  } catch (error) {
    const rerunWithForce = withFlag(argv, '--force');
    const problem = describeError(error, {
      fallback: {
        E_DIR_NOT_EMPTY: rerunWithForce,
        E_FILES_EXIST: rerunWithForce,
        E_CONFIRM_REQUIRED: withFlag(argv, '--yes'),
        E_INTERNAL: `DEBUG=1 ${['qn', ...argv].map(shellQuote).join(' ')}`
      }
    });
    if (json) writeJson({ ok: false, error: problem });
    else io.stderr.write(renderError(error, problem, err));
    return ERROR_CODES[problem.code].exitCode;
  }
}

function listFiles(files: string[]): string[] {
  const lines = files.slice(0, MAX_LISTED_FILES).map((file) => `  - ${file}`);
  if (files.length > MAX_LISTED_FILES) lines.push(`  ... and ${files.length - MAX_LISTED_FILES} more`);
  return lines;
}

function renderError(error: unknown, problem: ErrorReport, style: Style): string {
  const lines = [style.error(`✖ ${problem.message}`)];

  if (error instanceof TargetNotEmptyError) {
    const hasConflicts = error.conflicts.length > 0;
    lines.push(hasConflicts ? 'Files that would be overwritten:' : 'Existing entries:');
    lines.push(...listFiles(hasConflicts ? error.conflicts : error.entries));
  } else if (error instanceof PathBlockedError || error instanceof ConflictError) {
    lines.push(...listFiles(error.paths));
  } else if (!(error instanceof QnError) && process.env.DEBUG && error instanceof Error && error.stack) {
    lines.push(style.muted(error.stack));
  }
  if (problem.fix) lines.push(style.muted(`Fix: ${problem.fix}`));
  lines.push(style.muted(`[${problem.code}]`));
  return `${lines.join('\n')}\n`;
}

function formatOptions(options: Record<string, OptionSpec>): string[] {
  const rows = Object.entries(options).map(([name, spec]) => [
    `${spec.short ? `-${spec.short}, ` : '    '}--${name}${spec.type === 'string' ? ` <${spec.choices?.join('|') ?? spec.valueName ?? 'value'}>` : ''}`,
    spec.description
  ]);
  const width = Math.max(...rows.map(([flag]) => flag.length));
  return rows.map(([flag, description]) => `  ${flag.padEnd(width)}  ${description}`);
}

function formatArguments(spec: CommandSpec, style: Style): string[] {
  const args = spec.arguments ?? [];
  if (args.length === 0) return [];
  const names = args.map((argument) => `${argument.name}${argument.variadic ? '...' : ''}`);
  const width = Math.max(...names.map((name) => name.length));
  return [
    style.accent('Arguments:'),
    ...args.map((argument, index) => {
      const choices = argument.choices ? ` (${argument.choices.join(', ')})` : '';
      return `  ${names[index].padEnd(width)}  ${argument.description}${choices}`;
    }),
    ''
  ];
}

export function renderHelp(command: string | undefined, style: Style, showBanner: boolean): string {
  const spec = command ? resolveCommand(command) : undefined;
  if (command && !spec) throw new UsageError(`Unknown command "${command}".`);

  if (spec) {
    return [
      style.bold(spec.usage),
      '',
      spec.summary + (spec.aliases ? ` (alias: ${spec.aliases.map((alias) => `qn ${alias}`).join(', ')})` : ''),
      '',
      ...formatArguments(spec, style),
      style.accent('Options:'),
      ...formatOptions({ ...spec.options, ...GLOBAL_OPTIONS }),
      '',
      style.accent('Examples:'),
      ...spec.examples.map((example) => `  ${example}`),
      '',
      style.muted(`Docs: ${DOCS_URL}`),
      ''
    ].join('\n');
  }

  const names = Object.values(COMMANDS).map((cmd) => [cmd.name, ...(cmd.aliases ?? [])].join(', '));
  const width = Math.max(...names.map((name) => name.length));
  return [
    ...(showBanner ? [renderBanner(getVersion(), style)] : []),
    style.bold('Usage: qn <command> [options]'),
    '',
    style.accent('Commands:'),
    ...Object.values(COMMANDS).map((cmd, index) => `  ${names[index].padEnd(width)}  ${cmd.summary}`),
    `  ${'help'.padEnd(width)}  Show help for a command`,
    '',
    style.accent('Options:'),
    ...formatOptions(GLOBAL_OPTIONS),
    '',
    style.muted(`Run "qn <command> --help" for details. Docs: ${DOCS_URL}`),
    ''
  ].join('\n');
}
