/** Above this many line pairs the diff falls back to "remove all, add all". */
const MAX_CELLS = 4_000_000;
const CONTEXT = 3;

type Op = { kind: ' ' | '-' | '+'; line: string };

/** Line operations from a longest-common-subsequence table (files here are small). */
function operations(a: string[], b: string[]): Op[] {
  if (a.length * b.length > MAX_CELLS) {
    return [...a.map((line) => ({ kind: '-' as const, line })), ...b.map((line) => ({ kind: '+' as const, line }))];
  }
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: ' ', line: a[i++] });
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      ops.push({ kind: '-', line: a[i++] });
    } else {
      ops.push({ kind: '+', line: b[j++] });
    }
  }
  while (i < a.length) ops.push({ kind: '-', line: a[i++] });
  while (j < b.length) ops.push({ kind: '+', line: b[j++] });
  return ops;
}

const splitLines = (text: string) => (text === '' ? [] : text.replace(/\n$/, '').split('\n'));

/**
 * Unified diff of two versions of `file` (like `diff -u`), or an empty string
 * when they are equal. `before` undefined means a new file.
 */
export function unifiedDiff(file: string, before: string | undefined, after: string): string {
  if (before === after) return '';
  const ops = operations(splitLines(before ?? ''), splitLines(after));

  // Group changes into hunks with CONTEXT lines around them.
  const hunks: string[] = [];
  let index = 0;
  while (index < ops.length) {
    if (ops[index].kind === ' ') {
      index++;
      continue;
    }
    const start = Math.max(0, index - CONTEXT);
    let end = index;
    // Extend while the next change is close enough to share context.
    for (let next = index; next < ops.length; next++) {
      if (ops[next].kind !== ' ') end = next;
      else if (next - end > CONTEXT * 2) break;
    }
    const stop = Math.min(ops.length, end + CONTEXT + 1);
    let oldLine = 1;
    let newLine = 1;
    for (const op of ops.slice(0, start)) {
      if (op.kind !== '+') oldLine++;
      if (op.kind !== '-') newLine++;
    }
    const slice = ops.slice(start, stop);
    const oldCount = slice.filter((op) => op.kind !== '+').length;
    const newCount = slice.filter((op) => op.kind !== '-').length;
    hunks.push(
      `@@ -${oldCount === 0 ? oldLine - 1 : oldLine},${oldCount} +${newCount === 0 ? newLine - 1 : newLine},${newCount} @@`,
      ...slice.map((op) => `${op.kind}${op.line}`)
    );
    index = stop;
  }

  return [`--- ${before === undefined ? '/dev/null' : `a/${file}`}`, `+++ b/${file}`, ...hunks, ''].join('\n');
}
