/**
 * Simple import analysis for `qn check` (no parser, no dependencies): comments
 * are blanked out, then static and dynamic `import`, `export ... from` and
 * `require()` with a string literal are collected. Specifiers built at runtime
 * (`require(name)`) are not visible to this analysis.
 */
export interface ImportRef {
  specifier: string;
  /** 1-based line of the specifier. */
  line: number;
}

/** Replaces comments with spaces (keeping line breaks), leaving strings intact. */
export function stripComments(source: string): string {
  let out = '';
  let index = 0;
  let quote: string | undefined;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        index += 2;
        continue;
      }
      if (char === quote) quote = undefined;
      index++;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      index++;
    } else if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        out += ' ';
        index++;
      }
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
    } else {
      out += char;
      index++;
    }
  }
  return out;
}

const SPECIFIER = String.raw`(['"])([^'"\n]+)\1`;
const PATTERNS = [
  // import x from '...', import { a, b } from '...', import type T from '...'
  new RegExp(String.raw`(?<![\w$.])import\s+(?:type\s+)?[\w$*{}\s,]+?\s+from\s*${SPECIFIER}`, 'g'),
  // export { a } from '...', export * from '...'
  new RegExp(String.raw`(?<![\w$.])export\s+(?:type\s+)?[\w$*{}\s,]*?\s*from\s*${SPECIFIER}`, 'g'),
  // import '...'
  new RegExp(String.raw`(?<![\w$.])import\s*${SPECIFIER}`, 'g'),
  // import('...')
  new RegExp(String.raw`(?<![\w$.])import\s*\(\s*${SPECIFIER}\s*\)`, 'g'),
  // require('...'), also `import x = require('...')`
  new RegExp(String.raw`(?<![\w$.])require\s*\(\s*${SPECIFIER}\s*\)`, 'g')
];

/** Every module specifier a source file imports, in source order. */
export function findImports(source: string): ImportRef[] {
  const code = stripComments(source);
  const found = new Map<number, ImportRef>();
  for (const pattern of PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      const offset = match.index + match[0].lastIndexOf(match[2]);
      if (found.has(offset)) continue;
      const line = code.slice(0, offset).split('\n').length;
      found.set(offset, { specifier: match[2], line });
    }
  }
  return [...found.entries()].sort(([a], [b]) => a - b).map(([, ref]) => ref);
}
