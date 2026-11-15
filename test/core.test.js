import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { ChangePlan, ConflictError } from '../dist/core/changes.js';
import { unifiedDiff } from '../dist/core/diff.js';
import { findImports, stripComments } from '../dist/core/imports.js';
import { containsSnippet, insertBeforeMarker, replaceRegion } from '../dist/core/markers.js';
import { detectProject, NotQuickNodeProjectError } from '../dist/core/project.js';
import { adaptTestFile, formatImports } from '../dist/core/source-format.js';
import { rewriteForPackageManager } from '../dist/core/variants.js';
import { makeTmp, read, write } from './helpers.js';

describe('ChangePlan', () => {
  it('plans creates, unchanged files, conflicts and edits that compose', async (t) => {
    const root = await makeTmp(t);
    await write(path.join(root, 'same.txt'), 'same');
    await write(path.join(root, 'other.txt'), 'mine');
    await write(path.join(root, 'edit.txt'), 'a\n');
    const plan = new ChangePlan(root);

    assert.equal((await plan.write('new/file.txt', 'x')).action, 'create');
    assert.equal((await plan.write('same.txt', 'same')).action, 'unchanged');
    assert.equal((await plan.write('other.txt', 'theirs')).action, 'conflict');
    await plan.edit('edit.txt', (content) => `${content}b\n`);
    const edited = await plan.edit('edit.txt', (content) => `${content}c\n`);
    assert.equal(edited.action, 'update');
    assert.equal(edited.before, 'a\n');
    assert.equal(await plan.read('edit.txt'), 'a\nb\nc\n');
    assert.equal(await plan.edit('missing.txt', (content) => content), undefined);
    assert.deepEqual(plan.conflicts(), ['other.txt']);

    await assert.rejects(plan.apply(), (error) => error instanceof ConflictError && error.paths[0] === 'other.txt');
    assert.equal(await read(root, 'edit.txt'), 'a\n');
  });

  it('applies creates and updates; --force turns conflicts into updates', async (t) => {
    const root = await makeTmp(t);
    await write(path.join(root, 'other.txt'), 'mine');
    const plan = new ChangePlan(root, true);
    await plan.write('other.txt', 'theirs');
    await plan.write('dir/new.txt', 'new');
    assert.deepEqual(plan.summary(false).map((file) => file.action), ['create', 'update']);
    await plan.apply();
    assert.equal(await read(root, 'other.txt'), 'theirs');
    assert.equal(await read(root, 'dir', 'new.txt'), 'new');
  });

  it('refuses paths outside the project', async (t) => {
    const plan = new ChangePlan(await makeTmp(t));
    await assert.rejects(plan.write('../escape.txt', 'x'), /outside the project/);
  });
});

describe('markers', () => {
  const source = 'a\n  // qn:imports\nb\n';

  it('inserts before the marker with its indentation, once', () => {
    const first = insertBeforeMarker(source, 'imports', 'x();\ny();');
    assert.equal(first.status, 'inserted');
    assert.equal(first.content, 'a\n  x();\n  y();\n  // qn:imports\nb\n');
    assert.equal(insertBeforeMarker(first.content, 'imports', 'x();\ny();').status, 'present');
    assert.equal(insertBeforeMarker('no marker', 'imports', 'x();').status, 'missing');
  });

  it('replaces a whole region, markers included', () => {
    const region = 'top\n    // qn:shutdown:start\n    old();\n    // qn:shutdown:end\nend\n';
    const result = replaceRegion(region, 'shutdown', 'fresh();');
    assert.equal(result.content, 'top\n    fresh();\nend\n');
    assert.equal(replaceRegion(result.content, 'shutdown', 'fresh();').status, 'present');
    assert.equal(replaceRegion('top\n', 'shutdown', 'fresh();').status, 'missing');
  });

  it('matches snippets line by line, ignoring indentation', () => {
    assert.equal(containsSnippet('  a\n    b\n', 'a\nb'), true);
    assert.equal(containsSnippet('a\nc\nb\n', 'a\nb'), false);
    assert.equal(containsSnippet('a\n\n  b\n', 'a\n\nb'), true, 'blank lines inside a snippet do not matter');
  });
});

describe('unifiedDiff', () => {
  it('prints hunks with context, like diff -u', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].join('\n') + '\n';
    const after = before.replace('5\n', 'five\n');
    const diff = unifiedDiff('f.txt', before, after);
    assert.match(diff, /^--- a\/f\.txt\n\+\+\+ b\/f\.txt\n@@ -2,7 \+2,7 @@\n/);
    assert.match(diff, /\n-5\n\+five\n/);
    assert.equal(unifiedDiff('f.txt', before, before), '');
  });

  it('shows a new file against /dev/null', () => {
    assert.equal(unifiedDiff('n.txt', undefined, 'a\nb\n'), '--- /dev/null\n+++ b/n.txt\n@@ -0,0 +1,2 @@\n+a\n+b\n');
  });
});

describe('findImports', () => {
  it('finds static, dynamic, re-exports and require, with line numbers', () => {
    const source = [
      "import x from 'a';",
      "import type { T } from 'b';",
      'import {',
      '  one,',
      '  two,',
      "} from 'c';",
      "import 'd';",
      "export * from 'e';",
      "const f = require('f');",
      "const g = await import('g');",
      "obj.require('not-this');"
    ].join('\n');
    assert.deepEqual(
      findImports(source).map(({ specifier, line }) => `${line}:${specifier}`),
      ['1:a', '2:b', '6:c', '7:d', '8:e', '9:f', '10:g']
    );
  });

  it('ignores imports inside comments but keeps strings intact', () => {
    const source = "// import x from 'hidden';\n/* require('hidden') */\nconst s = '// not a comment';\nrequire('real');";
    assert.deepEqual(findImports(source), [{ specifier: 'real', line: 4 }]);
    assert.equal(stripComments('a // b\nc').length, 'a // b\nc'.length);
  });
});

describe('formatImports', () => {
  it('keeps short imports on one line and breaks long ones, like Prettier', () => {
    assert.equal(formatImports("import {\n  a,\n  b,\n} from 'x';"), "import { a, b } from 'x';");
    const long = `import { ${'Abcdefghij'.repeat(3)}One, ${'Abcdefghij'.repeat(3)}Two, ${'Abcdefghij'.repeat(3)}Three } from 'x';`;
    assert.match(formatImports(long), /^import \{\n {2}\w+One,\n {2}\w+Two,\n {2}\w+Three,\n\} from 'x';$/);
  });

  it('never breaks a single imported name, but breaks a long single-name require', () => {
    const name = 'A'.repeat(90);
    assert.equal(formatImports(`import { ${name} } from 'x';`), `import { ${name} } from 'x';`);
    assert.equal(formatImports(`const { ${name} } = require('x');`), `const {\n  ${name},\n} = require('x');`);
  });
});

describe('adaptTestFile', () => {
  const test = "describe('x', () => {\n  beforeEach(() => {});\n  it('y', () => {});\n});\n";

  it('imports the node:test functions the file uses', () => {
    assert.equal(adaptTestFile(test, 'jest', 'typescript'), test);
    assert.match(adaptTestFile(test, 'node', 'typescript'), /^import \{ beforeEach, describe, it \} from 'node:test';\n/);
    assert.match(adaptTestFile(test, 'node', 'javascript'), /^const \{ beforeEach, describe, it \} = require\('node:test'\);\n/);
  });
});

describe('rewriteForPackageManager', () => {
  it('rewrites npm commands for pnpm and yarn', () => {
    const text = 'npm run lint && npm test; npm install; npx --no-install commitlint; npm ci';
    assert.equal(rewriteForPackageManager(text, 'npm'), text);
    assert.equal(rewriteForPackageManager(text, 'pnpm'), 'pnpm run lint && pnpm test; pnpm install; pnpm exec commitlint; npm ci');
    assert.equal(rewriteForPackageManager(text, 'yarn'), 'yarn run lint && yarn test; yarn install; yarn commitlint; npm ci');
  });
});

describe('detectProject', () => {
  it('finds the project root from a subfolder and reads its setup', async (t) => {
    const root = await makeTmp(t);
    await write(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test', dev: 'pnpm run x' } }));
    await write(path.join(root, 'src', 'domain', 'a.js'));
    await write(path.join(root, 'src', 'infrastructure', 'b.js'));
    const project = detectProject(path.join(root, 'src', 'domain'));
    assert.equal(project.root, root);
    assert.equal(project.language, 'javascript');
    assert.equal(project.testRunner, 'node');
    assert.equal(project.packageManager, 'pnpm');

    await write(path.join(root, 'tsconfig.json'), '{}');
    await write(path.join(root, 'yarn.lock'), '');
    assert.equal(detectProject(root).language, 'typescript');
    assert.equal(detectProject(root).packageManager, 'yarn');
  });

  it('fails outside a QuickNode project', async (t) => {
    const outside = await makeTmp(t);
    assert.throws(() => detectProject(outside), NotQuickNodeProjectError);
  });
});
