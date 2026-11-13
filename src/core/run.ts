import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export interface RunResult {
  ok: boolean;
  /** Why the command could not run or failed (exit code, missing binary...). */
  error?: string;
}

/**
 * Runs a program without a shell (arguments are never interpreted), sending
 * its output to stderr so stdout stays clean for `--json`.
 */
export function run(command: string, args: string[], cwd: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 2, 2] });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: `exited with code ${code}` }));
  });
}

/**
 * Command line for `npm <args>` without a shell. npm's JavaScript entry point
 * is run with the current Node binary whenever it can be found: Windows
 * refuses to spawn `npm.cmd` without a shell (EINVAL), so a bare `npm` is
 * only used on other platforms.
 */
export function npmCommand(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  execPath: string = process.execPath,
  fileExists: (file: string) => boolean = existsSync
): [string, string[]] | undefined {
  const execCli = env.npm_execpath;
  const candidates = [
    // Started by npm or npx: reuse the same npm (npx-cli.js sits next to npm-cli.js).
    execCli && /np[mx]-cli\.[cm]?js$/.test(execCli) ? path.join(path.dirname(execCli), 'npm-cli.js') : undefined,
    // npm bundled with this Node installation (Windows and Unix layouts).
    path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ];
  const npmCli = candidates.find((file) => file !== undefined && fileExists(file));
  if (npmCli) return [execPath, [npmCli, ...args]];
  return platform === 'win32' ? undefined : ['npm', args];
}
