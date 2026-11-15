/**
 * Wiring points in generated projects. Templates carry comments such as
 * `// qn:imports`; `qn generate` and `qn add` insert lines right before them,
 * so the user's own code around the marker is never rewritten. A region
 * (`// qn:name:start` ... `// qn:name:end`) can be replaced as a whole.
 */
export type MarkerStatus = 'inserted' | 'present' | 'missing';

export interface MarkerResult {
  content: string;
  status: MarkerStatus;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function markerLine(name: string): RegExp {
  return new RegExp(`^([ \\t]*)(?://|#)[ \\t]*qn:${escape(name)}[ \\t]*$`, 'm');
}

const trimmedLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** True when every line of `snippet` already appears, in order and together, in `content`. */
export function containsSnippet(content: string, snippet: string): boolean {
  const wanted = trimmedLines(snippet);
  if (wanted.length === 0) return true;
  const lines = content.split('\n').map((line) => line.trim());
  return lines.some((_, start) => wanted.every((line, offset) => lines[start + offset] === line));
}

/** Indents every non-empty line of `snippet` with `indent`. */
function indentSnippet(snippet: string, indent: string): string {
  return snippet
    .split('\n')
    .map((line) => (line.length > 0 ? indent + line : line))
    .join('\n');
}

/**
 * Inserts `snippet` (one or more lines, without indentation) before the marker
 * line, with the marker's indentation. Idempotent: an already present snippet
 * is left alone.
 */
export function insertBeforeMarker(content: string, name: string, snippet: string): MarkerResult {
  if (containsSnippet(content, snippet)) return { content, status: 'present' };
  const match = markerLine(name).exec(content);
  if (!match) return { content, status: 'missing' };
  const insertion = `${indentSnippet(snippet, match[1])}\n`;
  return { content: content.slice(0, match.index) + insertion + content.slice(match.index), status: 'inserted' };
}

/**
 * Replaces a whole `qn:<name>:start` ... `qn:<name>:end` region (markers
 * included) with `snippet`, indented like the start marker.
 */
export function replaceRegion(content: string, name: string, snippet: string): MarkerResult {
  if (containsSnippet(content, snippet)) return { content, status: 'present' };
  const start = markerLine(`${name}:start`).exec(content);
  const end = markerLine(`${name}:end`).exec(content);
  if (!start || !end || end.index < start.index) return { content, status: 'missing' };
  const endOfRegion = end.index + end[0].length;
  return {
    content: content.slice(0, start.index) + indentSnippet(snippet, start[1]) + content.slice(endOfRegion),
    status: 'inserted'
  };
}
