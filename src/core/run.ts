import { spawn } from 'node:child_process';

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
 * Command line for `npm <args>` without a shell. When the CLI was started by
 * npm/npx, npm's own entry point is reused (this also works on Windows, where
 * `npm` is a .cmd file that cannot be spawned without a shell).
 */
export function npmCommand(args: string[], env: NodeJS.ProcessEnv = process.env): [string, string[]] {
  const npmCli = env.npm_execpath;
  if (npmCli && /npm-cli\.[cm]?js$/.test(npmCli)) return [process.execPath, [npmCli, ...args]];
  return [process.platform === 'win32' ? 'npm.cmd' : 'npm', args];
}
