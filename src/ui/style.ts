import { styleText } from 'node:util';

type Format = Parameters<typeof styleText>[0];

/**
 * Terminal palette shared with the documentation site: green for success,
 * amber (yellow) for highlights and links, gray for secondary text.
 */
export interface Style {
  success(text: string): string;
  accent(text: string): string;
  muted(text: string): string;
  error(text: string): string;
  bold(text: string): string;
}

/**
 * Colors are used only when `stream` is a terminal that supports them;
 * `hasColors()` already honors NO_COLOR, FORCE_COLOR and TERM=dumb.
 */
export function createStyle(stream: NodeJS.WritableStream & { isTTY?: boolean; hasColors?: () => boolean }): Style {
  const enabled = Boolean(stream.isTTY && stream.hasColors?.());
  const paint =
    (format: Format) =>
    (text: string): string =>
      enabled ? styleText(format, text, { validateStream: false }) : text;

  return {
    success: paint('green'),
    accent: paint('yellow'),
    muted: paint('gray'),
    error: paint('red'),
    bold: paint('bold')
  };
}
