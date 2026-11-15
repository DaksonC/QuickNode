import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { createInputFromFlags, createProject, type CreateResult } from './commands/create.js';
import { packageRoot } from './core/paths.js';
import { PathBlockedError, TargetNotEmptyError } from './core/scaffold.js';
import { COMMANDS, GLOBAL_OPTIONS, parseCommandLine, UsageError, wantsJson, type OptionSpec } from './spec.js';
import { renderBanner } from './ui/banner.js';
import { createPrompter, PromptAbortedError } from './ui/prompt.js';
import { createStyle, type Style } from './ui/style.js';

export const DOCS_URL = 'https://daksonc.github.io/QuickNode/';
const MAX_LISTED_FILES = 10;

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_USAGE = 2;

type TTYStream = NodeJS.WritableStream & { isTTY?: boolean; hasColors?: () => boolean };

export interface IO {
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  stdout: TTYStream;
  stderr: TTYStream;
  cwd: string;
}

const defaultIO = (): IO => ({ stdin: process.stdin, stdout: process.stdout, stderr: process.stderr, cwd: process.cwd() });

export function getVersion(): string {
  return JSON.parse(readFileSync(path.join(packageRoot(), 'package.json'), 'utf8')).version;
}

/** Runs the CLI and returns the process exit code. */
export async function main(argv: string[], io: IO = defaultIO()): Promise<number> {
  const out = createStyle(io.stdout);
  const err = createStyle(io.stderr);
  let json = wantsJson(argv);
  const writeJson = (value: unknown) => io.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

  try {
    const parsed = parseCommandLine(argv);
    json = parsed.json;
    if (parsed.kind === 'version') {
      if (json) writeJson({ ok: true, version: getVersion() });
      else io.stdout.write(`${getVersion()}\n`);
      return EXIT_OK;
    }
    if (parsed.kind === 'help') {
      const help = renderHelp(parsed.command, json ? createStyle(new PassThrough()) : out, !json && Boolean(io.stdout.isTTY));
      if (json) writeJson({ ok: true, help });
      else io.stdout.write(help);
      return EXIT_OK;
    }

    // Only "create" exists for now; new commands are dispatched here.
    const input = createInputFromFlags(parsed.positionals, parsed.values);
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
    if (json) writeJson({ ok: stepsOk, ...result });
    else io.stdout.write(renderCreate(result, out));
    return stepsOk ? EXIT_OK : EXIT_ERROR;
  } catch (error) {
    if (json) {
      writeJson({ ok: false, error: serializeError(error) });
    } else {
      io.stderr.write(renderError(error, err));
    }
    return error instanceof UsageError ? EXIT_USAGE : EXIT_ERROR;
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { code: 'ERROR', message: String(error) };
  const { code = 'ERROR' } = error as { code?: string };
  const details: Record<string, unknown> = {};
  if (error instanceof TargetNotEmptyError) Object.assign(details, { conflicts: error.conflicts, entries: error.entries });
  if (error instanceof PathBlockedError) Object.assign(details, { paths: error.paths });
  return { code, message: error.message, ...details };
}

function listFiles(files: string[]): string[] {
  const lines = files.slice(0, MAX_LISTED_FILES).map((file) => `  - ${file}`);
  if (files.length > MAX_LISTED_FILES) lines.push(`  ... and ${files.length - MAX_LISTED_FILES} more`);
  return lines;
}

function renderError(error: unknown, style: Style): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = [style.error(`✖ ${message}`)];

  if (error instanceof TargetNotEmptyError) {
    const hasConflicts = error.conflicts.length > 0;
    lines.push(hasConflicts ? 'Files that would be overwritten:' : 'Existing entries:');
    lines.push(...listFiles(hasConflicts ? error.conflicts : error.entries));
  } else if (error instanceof PathBlockedError) {
    lines.push(...listFiles(error.paths));
  } else if (error instanceof UsageError) {
    lines.push(style.muted(`Run "qn ${error.command ? `${error.command} ` : ''}--help" for usage.`));
  } else if (!(error instanceof PromptAbortedError) && process.env.DEBUG && error instanceof Error && error.stack) {
    lines.push(style.muted(error.stack));
  }
  return `${lines.join('\n')}\n`;
}

const TEMPLATE_LABEL = { typescript: 'TypeScript', javascript: 'JavaScript' } as const;

function renderCreate(result: CreateResult, style: Style): string {
  const label = `${result.packageName} (${TEMPLATE_LABEL[result.template]})`;
  const overwritten = new Set(result.overwritten);
  const lines: string[] = [];

  if (result.dryRun) {
    lines.push(style.accent('Dry run: nothing was written.'));
    lines.push(`Would create ${style.bold(label)} in ${result.targetDir} (${result.files.length} files):`);
    for (const file of result.files) {
      lines.push(overwritten.has(file) ? style.accent(`  ~ ${file} (overwrite)`) : `  + ${file}`);
    }
    if (result.env === 'kept') lines.push(style.muted('  = .env (existing file kept)'));
    if (result.steps.length > 0) lines.push(`Then would run: ${result.steps.join(', ')}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(style.success(`✔ Created ${style.bold(label)} in ${result.targetDir}`));
  if (result.overwritten.length > 0) {
    lines.push(style.accent(`  Overwrote ${result.overwritten.length} existing file(s): ${result.overwritten.join(', ')}`));
  }
  if (result.env === 'generated') lines.push(style.muted('  .env generated with random secrets (git-ignored)'));
  if (result.env === 'kept') lines.push(style.accent('  Existing .env kept: compare it with .env.example'));
  for (const [step, outcome] of [
    ['git init', result.git],
    ['npm install', result.install]
  ] as const) {
    if (!outcome) continue;
    lines.push(outcome.ok ? style.success(`✔ ${step}`) : style.error(`✖ ${step} failed: ${outcome.error}`));
  }

  lines.push('', style.accent('Next steps:'));
  if (!result.inCurrentDir) lines.push(`  cd ${result.name}`);
  if (!result.install?.ok) lines.push('  npm install');
  lines.push('  npm run docker:up   # start PostgreSQL', '  npm run dev');
  lines.push('', style.muted(`Guide: ${DOCS_URL}`));
  return `${lines.join('\n')}\n`;
}

function formatOptions(options: Record<string, OptionSpec>): string[] {
  const rows = Object.entries(options).map(([name, spec]) => [
    `${spec.short ? `-${spec.short}, ` : '    '}--${name}`,
    spec.description
  ]);
  const width = Math.max(...rows.map(([flag]) => flag.length));
  return rows.map(([flag, description]) => `  ${flag.padEnd(width)}  ${description}`);
}

export function renderHelp(command: string | undefined, style: Style, showBanner: boolean): string {
  const spec = command ? COMMANDS[command] : undefined;
  if (command && !spec) throw new UsageError(`Unknown command "${command}".`);

  if (spec) {
    return [
      style.bold(spec.usage),
      '',
      spec.summary,
      '',
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

  const width = Math.max(...Object.keys(COMMANDS).map((name) => name.length));
  return [
    ...(showBanner ? [renderBanner(getVersion(), style)] : []),
    style.bold('Usage: qn <command> [options]'),
    '',
    style.accent('Commands:'),
    ...Object.values(COMMANDS).map((cmd) => `  ${cmd.name.padEnd(width)}  ${cmd.summary}`),
    `  ${'help'.padEnd(width)}  Show help for a command`,
    '',
    style.accent('Options:'),
    ...formatOptions(GLOBAL_OPTIONS),
    '',
    style.muted(`Run "qn <command> --help" for details. Docs: ${DOCS_URL}`),
    ''
  ].join('\n');
}
