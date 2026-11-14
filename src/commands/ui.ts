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
  /** Starts the system program that opens links; must never throw. */
  open?: (command: string, args: string[]) => void;
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

/** Portuguese when the locale says so (LC_ALL > LC_MESSAGES > LANG, as in POSIX), English otherwise. */
export function languageFromEnv(env: NodeJS.ProcessEnv): DocsLanguage {
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
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
  if (platform === 'linux') {
    if (fileExists('/.dockerenv') || fileExists('/run/.containerenv')) return false;
    // No graphical session: xdg-open would only fall back to a text browser.
    if (!env.DISPLAY && !env.WAYLAND_DISPLAY) return false;
  }
  return true;
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

/** Launches `command` detached and forgets about it; a missing program is silently ignored. */
export function launchDetached(command: string, args: string[]): void {
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false, windowsHide: true });
    child.on('error', () => {
      // Nothing to open links with: the link printed by the caller is enough.
    });
    child.unref();
  } catch {
    // Same as above: never fail because a browser could not be launched.
  }
}

/** Resolves the documentation link and, when it makes sense, opens it. */
export function openDocs(input: UiInput, ctx: UiContext): UiResult {
  const url = docsUrl(input.topic, input.lang ?? languageFromEnv(ctx.env));
  const command = openerCommand(ctx.platform);
  if (input.print || !command || !canOpenBrowser(ctx.env, ctx.platform, ctx.interactive, ctx.fileExists)) {
    return { url, opened: false };
  }
  (ctx.open ?? launchDetached)(command, [url]);
  return { url, opened: true };
}
