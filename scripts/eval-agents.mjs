#!/usr/bin/env node
/**
 * Agent evaluation (ADR-001, D9): runs the real tasks of eval/tasks.json with an
 * AI coding agent (Claude Code in headless mode by default), each in a fresh
 * temporary folder with the packed CLI installed as `qn`, and measures:
 *
 *   - success: expected files and contents, and `qn check` passing;
 *   - invented flags: `qn ...` commands the agent ran that the parser rejects;
 *   - dependency rule violations left in the project.
 *
 * It needs the agent CLI, an account or API key and costs tokens, so it never
 * runs in CI. Results go to eval/results/ (git-ignored).
 *
 *   npm run eval:agents                      # every task
 *   npm run eval:agents -- --task add-auth   # one task (repeatable)
 *   npm run eval:agents -- --model sonnet    # passed to the agent
 *   npm run eval:agents -- --keep            # keep the work folders
 *
 * QN_EVAL_AGENT replaces the agent command ("claude" by default); it gets the
 * prompt as its last argument and must print Claude Code stream-json on stdout.
 */
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { main } from '../dist/main.js';
import { parseCommandLine } from '../dist/spec.js';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASK_TIMEOUT_MS = 15 * 60_000;

const GUIDANCE = [
  'The QuickNode CLI (npm package @10565/quicknode-cli) is installed and available as the `qn` command.',
  'Work only inside the current folder. Do not install dependencies unless the task asks for it.',
  'When you are done, reply with a one-line summary.'
].join(' ');

/** Splits a shell command line into words (quotes and backslashes; enough for qn calls). */
export function shellWords(line) {
  const words = [];
  let word = '';
  let quote;
  let started = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === quote) quote = undefined;
      else if (char === '\\' && quote === '"') word += line[++index] ?? '';
      else word += char;
    } else if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (char === '\\') {
      word += line[++index] ?? '';
      started = true;
    } else if (/\s/.test(char)) {
      if (started || word) words.push(word);
      word = '';
      started = false;
    } else {
      word += char;
    }
  }
  if (started || word) words.push(word);
  return words;
}

/** qn invocations inside a shell command ("cd x && qn g crud y | jq"), as argv arrays. */
export function qnInvocations(command) {
  return command
    .split(/&&|\|\||;|\||\n/)
    .map((part) => shellWords(part.trim()))
    .map((words) => {
      if (words[0] === 'qn') return words.slice(1);
      if (words[0] === 'npx' && words.some((word) => word.startsWith('@10565/quicknode-cli'))) {
        return words.slice(words.findIndex((word) => word.startsWith('@10565/quicknode-cli')) + 1);
      }
      return undefined;
    })
    .filter((argv) => argv !== undefined);
}

/** Invocations the real parser rejects: flags or values the agent made up. */
export function inventedFlags(invocations) {
  return invocations.filter((argv) => {
    try {
      parseCommandLine(argv);
      return false;
    } catch (error) {
      return error.code === 'E_USAGE';
    }
  });
}

/** Runs the CLI in-process (for setup and checks), returning exit code and stdout. */
async function qn(cwd, argv) {
  const stdout = new PassThrough();
  let text = '';
  stdout.on('data', (chunk) => (text += chunk));
  const code = await main(argv, { stdin: new PassThrough(), stdout, stderr: new PassThrough(), cwd });
  return { code, stdout: text };
}

async function packCli(dir) {
  const { stdout } = await execFileAsync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dir], { cwd: ROOT });
  const tarball = path.join(dir, JSON.parse(stdout)[0].filename);
  const prefix = path.join(dir, 'prefix');
  await execFileAsync('npm', ['install', '--global', '--prefix', prefix, '--no-audit', '--no-fund', tarball]);
  return path.join(prefix, 'bin');
}

/** Runs the agent and collects the shell commands it ran and its final result event. */
function runAgent(prompt, cwd, binDir, model) {
  const agent = process.env.QN_EVAL_AGENT ?? 'claude';
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    'Bash(qn:*)',
    'Bash(ls:*)',
    'Bash(cat:*)',
    'Read',
    'Write',
    'Edit',
    'Glob',
    'Grep',
    ...(model ? ['--model', model] : []),
    `${prompt}\n\n${GUIDANCE}`
  ];
  return new Promise((resolve) => {
    const child = spawn(agent, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: TASK_TIMEOUT_MS,
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH}`, NO_COLOR: '1' }
    });
    const commands = [];
    let result;
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === 'result') result = event;
        for (const item of event.message?.content ?? []) {
          if (item.type === 'tool_use' && item.name === 'Bash' && typeof item.input?.command === 'string') commands.push(item.input.command);
        }
      }
    });
    child.stderr.resume();
    child.on('error', (error) => resolve({ commands, error: error.message }));
    child.on('close', (code, signal) => resolve({ commands, result, ...(code === 0 ? {} : { error: signal ? `stopped (${signal})` : `exited with code ${code}` }) }));
  });
}

async function checkExpectations(task, workDir) {
  const failures = [];
  for (const file of task.expect.files ?? []) {
    try {
      await fs.access(path.join(workDir, file));
    } catch {
      failures.push(`missing ${file}`);
    }
  }
  for (const [file, text] of Object.entries(task.expect.contains ?? {})) {
    const content = await fs.readFile(path.join(workDir, file), 'utf8').catch(() => '');
    if (!content.includes(text)) failures.push(`${file} does not contain "${text}"`);
  }
  const check = await qn(path.join(workDir, task.project), ['check', '--json']);
  const violations = JSON.parse(check.stdout).violations?.length ?? 0;
  if (check.code !== 0) failures.push(`qn check failed (${violations} violations)`);
  return { failures, violations };
}

async function runTask(task, binDir, options) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `qn-eval-${task.id}-`));
  const started = Date.now();
  try {
    for (const argv of task.setup ?? []) {
      const cwd = argv[0] === 'create' ? workDir : path.join(workDir, task.cwd ?? '.');
      const { code } = await qn(cwd, argv);
      if (code !== 0) throw new Error(`setup "qn ${argv.join(' ')}" failed`);
    }
    for (const [file, prefix] of Object.entries(task.inject ?? {})) {
      const full = path.join(workDir, file);
      await fs.writeFile(full, prefix + (await fs.readFile(full, 'utf8')));
    }
    const agent = await runAgent(task.prompt, path.join(workDir, task.cwd ?? '.'), binDir, options.model);
    const invocations = agent.commands.flatMap(qnInvocations);
    const invented = inventedFlags(invocations);
    const { failures, violations } = await checkExpectations(task, workDir);
    if (agent.error) failures.unshift(`agent: ${agent.error}`);
    return {
      id: task.id,
      success: failures.length === 0,
      failures,
      qnCalls: invocations.length,
      inventedFlags: invented.map((argv) => `qn ${argv.join(' ')}`),
      violations,
      turns: agent.result?.num_turns,
      costUsd: agent.result?.total_cost_usd,
      seconds: Math.round((Date.now() - started) / 1000),
      ...(options.keep ? { workDir } : {})
    };
  } catch (error) {
    return { id: task.id, success: false, failures: [error.message], seconds: Math.round((Date.now() - started) / 1000) };
  } finally {
    if (!options.keep) await fs.rm(workDir, { recursive: true, force: true });
  }
}

function summary(results) {
  const passed = results.filter((result) => result.success).length;
  const invented = results.flatMap((result) => result.inventedFlags ?? []);
  const lines = [
    `# Agent evaluation, ${new Date().toISOString()}`,
    '',
    `- Success without intervention: ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%; target 90%)`,
    `- Invented flags: ${invented.length} (target 0)`,
    `- Dependency rule violations left: ${results.reduce((sum, result) => sum + (result.violations ?? 0), 0)}`,
    '',
    '| Task | Result | qn calls | Invented flags | Turns | Cost (USD) | Seconds |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${result.id} | ${result.success ? 'pass' : `fail: ${result.failures.join('; ')}`} | ${result.qnCalls ?? '-'} | ${(result.inventedFlags ?? []).join(', ') || 0} | ${result.turns ?? '-'} | ${result.costUsd?.toFixed(2) ?? '-'} | ${result.seconds} |`
    )
  ];
  return `${lines.join('\n')}\n`;
}

async function run() {
  const { values } = parseArgs({
    options: { task: { type: 'string', multiple: true }, model: { type: 'string' }, keep: { type: 'boolean' } }
  });
  const { tasks } = JSON.parse(await fs.readFile(path.join(ROOT, 'eval', 'tasks.json'), 'utf8'));
  const selected = values.task ? tasks.filter((task) => values.task.includes(task.id)) : tasks;
  if (selected.length === 0) throw new Error(`No task matches ${values.task}. Tasks: ${tasks.map((task) => task.id).join(', ')}`);

  const packDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qn-eval-pack-'));
  try {
    const binDir = await packCli(packDir);
    const results = [];
    for (const task of selected) {
      process.stderr.write(`› ${task.id}\n`);
      results.push(await runTask(task, binDir, values));
    }
    const outDir = path.join(ROOT, 'eval', 'results');
    await fs.mkdir(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(path.join(outDir, `${stamp}.json`), `${JSON.stringify(results, null, 2)}\n`);
    const report = summary(results);
    await fs.writeFile(path.join(outDir, `${stamp}.md`), report);
    process.stdout.write(report);
    return results.every((result) => result.success) ? 0 : 1;
  } finally {
    await fs.rm(packDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await run();
}
