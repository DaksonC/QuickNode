import type { TestRunner } from './project.js';
import type { TemplateName } from './paths.js';

/**
 * Small, deterministic formatting helpers for generated code. Projects lint
 * with Prettier (printWidth 100, trailingComma es5), so code written by the
 * CLI must already look like Prettier's output, without running it.
 */
const PRINT_WIDTH = 100;

function layout(open: string, names: string[], close: string, indent: string, keepSingleName: boolean): string {
  const single = `${indent}${open}{ ${names.join(', ')} }${close}`;
  // Prettier never breaks an import of a single name, however long the line
  // (destructuring a require() is broken like any other object pattern).
  if (single.length <= PRINT_WIDTH || (keepSingleName && names.length === 1)) return single;
  return [`${indent}${open}{`, ...names.map((name) => `${indent}  ${name},`), `${indent}}${close}`].join('\n');
}

const splitNames = (list: string) =>
  list
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

/**
 * Lays out `import { a, b } from '...'` (and CommonJS `const { a, b } =
 * require('...')`) on one line when it fits, else one name per line, as
 * Prettier does. Other code is left untouched.
 */
export function formatImports(source: string): string {
  return source
    .replace(
      /^([ \t]*)import (type )?\{([^}]*)\} from ('[^'\n]+');$/gm,
      (_, indent: string, type = '', list: string, from: string) =>
        layout(`import ${type}`, splitNames(list), ` from ${from};`, indent, true)
    )
    .replace(/^([ \t]*)const \{([^}]*)\} = require\(('[^'\n]+')\);$/gm, (_, indent: string, list: string, from: string) =>
      layout('const ', splitNames(list), ` = require(${from});`, indent, false)
    );
}

const TEST_GLOBALS = ['after', 'afterEach', 'before', 'beforeEach', 'describe', 'it'];

/**
 * Test files are written for Jest's globals (describe, it, beforeEach) and
 * node:assert, so the same file runs on both runners: for node:test only the
 * import of those functions is added.
 */
export function adaptTestFile(source: string, runner: TestRunner, language: TemplateName): string {
  if (runner === 'jest') return source;
  const used = TEST_GLOBALS.filter((name) => new RegExp(`(?<![\\w$.])${name}\\(`).test(source));
  if (used.length === 0) return source;
  const line =
    language === 'typescript'
      ? `import { ${used.join(', ')} } from 'node:test';`
      : `const { ${used.join(', ')} } = require('node:test');`;
  return `${line}\n${source}`;
}
