import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { DOCS_LANGUAGES, DOCS_TOPICS, UsageError, type DocsTopic } from '../spec.js';

/** Fixed base of every documentation link. User input never becomes part of a URL. */
export const DOCS_URL = 'https://daksonc.github.io/QuickNode/';

export type DocsLanguage = (typeof DOCS_LANGUAGES)[number];

export interface UiInput {
  topic?: DocsTopic;
  lang?: DocsLanguage;
  /** Only print the link. */
  print?: boolean;
}

export interface UiResult {
  url: string;
  /** Whether a browser was asked to open the link. */
  opened: boolean;
}

export interface UiContext {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  /** stdout is a terminal (someone is looking at it). */
  interactive: boolean;
  /** Starts the system program that opens links; resolves to whether it started. Must never reject. */
  open?: (command: string, args: string[]) => Promise<boolean>;
  /** Used to detect containers; injectable for tests. */
  fileExists?: (file: string) => boolean;
}

/** Converts parsed arguments into a UiInput (the parser already checked the closed lists). */
export function uiInputFromFlags(positionals: string[], values: Record<string, boolean | string | undefined>): UiInput {
  if (positionals.length > 1) throw new UsageError('Only one topic can be given.', 'ui');
  return {
    topic: positionals[0] as DocsTopic | undefined,
    lang: values.lang as DocsLanguage | undefined,
    print: Boolean(values.print)
  };
}

/**
 * Portuguese when the locale says so, English otherwise. POSIX variables win
 * (LC_ALL > LC_MESSAGES > LANG); without them (as on Windows) the system
 * locale reported by Intl is used.
 */
export function languageFromEnv(
  env: NodeJS.ProcessEnv,
  systemLocale: () => string = () => Intl.DateTimeFormat().resolvedOptions().locale
): DocsLanguage {
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || systemLocale();
  return /^pt([_.@-]|$)/i.test(locale) ? 'pt' : 'en';
}

/** Builds the link from the fixed base, a language and a topic, all from closed lists. */
export function docsUrl(topic?: DocsTopic, lang: DocsLanguage = 'en'): string {
  if (topic !== undefined && !Object.hasOwn(DOCS_TOPICS, topic)) throw new UsageError(`Unknown topic "${topic}".`, 'ui');
  return `${DOCS_URL}${lang === 'pt' ? 'pt/' : ''}${topic ? DOCS_TOPICS[topic] : ''}`;
}

/**
 * Reasons not to launch a browser: CI, a remote (SSH) session, a container,
 * or nobody watching the terminal. In those cases the printed link is enough.
 */
export function canOpenBrowser(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  interactive: boolean,
  fileExists: (file: string) => boolean = existsSync
): boolean {
  if (!interactive) return false;
  if (env.CI && env.CI !== 'false' && env.CI !== '0') return false;
  if (env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY) return false;
  if (platform === 'darwin' || platform === 'win32') return true;
  if (fileExists('/.dockerenv') || fileExists('/run/.containerenv')) return false;
  // Other systems use xdg-open: without a graphical session it would only start a text browser.
  return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
}

/**
 * System program that opens a link, called with the URL as a separate
 * argument and no shell. Windows uses explorer.exe, never `cmd /c start`,
 * which would interpret characters such as "&".
 */
export function openerCommand(platform: NodeJS.Platform): string | undefined {
  if (platform === 'darwin') return 'open';
  if (platform === 'win32') return 'explorer.exe';
  if (platform === 'linux' || platform === 'freebsd' || platform === 'openbsd') return 'xdg-open';
  return undefined;
}

/**
 * Launches `command` detached, without a shell, and resolves once it either
 * started (true) or could not start (false, e.g. the program is missing).
 * The process is unref'd so the CLI exits right away. Never rejects.
 */
export function launchDetached(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false, windowsHide: true });
      child.once('spawn', () => resolve(true));
      // Nothing to open links with: the link printed by the caller is enough.
      child.once('error', () => resolve(false));
      child.unref();
    } catch {
      resolve(false);
    }
  });
}

/** Resolves the documentation link and, when it makes sense, opens it. */
export async function openDocs(input: UiInput, ctx: UiContext): Promise<UiResult> {
  const url = docsUrl(input.topic, input.lang ?? languageFromEnv(ctx.env));
  const command = openerCommand(ctx.platform);
  if (input.print || !command || !canOpenBrowser(ctx.env, ctx.platform, ctx.interactive, ctx.fileExists)) {
    return { url, opened: false };
  }
  const opened = await (ctx.open ?? launchDetached)(command, [url]);
  return { url, opened };
}
