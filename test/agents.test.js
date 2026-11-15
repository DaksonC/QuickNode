import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import { handleMessage, runMcpServer, TOOLS } from '../dist/commands/mcp.js';
import { buildSchema } from '../dist/commands/schema.js';
import { ERROR_CODES, shellQuote, withFlag } from '../dist/core/errors.js';
import { COMMANDS } from '../dist/spec.js';
import { htmlToMarkdown } from '../scripts/docs-markdown.mjs';
import { exists, makeProject, makeTmp, read, runQn, write } from './helpers.js';

describe('actionable errors', () => {
  it('suggest the same command with --force when the folder is not empty', async (t) => {
    const cwd = await makeTmp(t);
    await write(path.join(cwd, 'app', 'README.md'), 'mine');
    const json = await runQn(cwd, 'create', 'app', '--javascript', '--json');
    assert.equal(json.code, 1);
    assert.deepEqual(JSON.parse(json.stdout).error, {
      code: 'E_DIR_NOT_EMPTY',
      message: `Directory ${path.join(cwd, 'app')} is not empty. Use --force to write into it anyway.`,
      fix: 'qn create app --javascript --json --force',
      conflicts: ['README.md'],
      entries: ['README.md']
    });

    const text = await runQn(cwd, 'create', 'app', '--javascript');
    assert.match(text.stderr, /Fix: qn create app --javascript --force\n\[E_DIR_NOT_EMPTY\]/);
  });

  it('tell an agent the exact flag that is missing, without prompting', async (t) => {
    const cwd = await makeTmp(t);
    const noTemplate = JSON.parse((await runQn(cwd, 'create', 'shop-api', '--json')).stdout).error;
    assert.equal(noTemplate.code, 'E_USAGE');
    assert.equal(noTemplate.fix, 'qn create shop-api --typescript');
    const badName = JSON.parse((await runQn(cwd, 'create', '../escaped', '-ts', '--json')).stdout).error;
    assert.deepEqual([badName.code, badName.fix], ['E_USAGE', 'qn create my-api --typescript']);
    const noName = await runQn(cwd, 'create', '--javascript', '--json');
    assert.equal(noName.code, 2);
    assert.equal(JSON.parse(noName.stdout).error.fix, 'qn create my-api --javascript');
    const unknown = JSON.parse((await runQn(cwd, 'generate', '--nope', '--json')).stdout).error;
    assert.deepEqual([unknown.code, unknown.fix], ['E_USAGE', 'qn generate --help']);
  });

  it('point to qn create outside a project', async (t) => {
    const { code, stdout } = await runQn(await makeTmp(t), 'check', '--json');
    assert.equal(code, 1);
    const { error } = JSON.parse(stdout);
    assert.equal(error.code, 'E_NOT_A_PROJECT');
    assert.match(error.fix, /qn create my-api --typescript --yes/);
  });

  it('quote arguments only when needed', () => {
    assert.equal(shellQuote('my-api'), 'my-api');
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
    assert.equal(withFlag(['create', 'a b', '--force', '--', '--json'], '--force'), "qn create 'a b' --force");
  });
});

describe('qn schema', () => {
  it('describes every command, flag, default and error code', async (t) => {
    const { code, stdout } = await runQn(await makeTmp(t), 'schema');
    assert.equal(code, 0);
    const schema = JSON.parse(stdout);
    assert.equal(schema.schemaVersion, 1);
    assert.deepEqual(schema.commands.map((command) => command.name), Object.keys(COMMANDS));
    const create = schema.commands.find((command) => command.name === 'create');
    assert.deepEqual(create.options.pm, {
      type: 'string',
      description: COMMANDS.create.options.pm.description,
      choices: ['npm', 'pnpm', 'yarn'],
      default: 'npm'
    });
    assert.equal(create.options.force.default, false);
    const generate = schema.commands.find((command) => command.name === 'generate');
    assert.deepEqual(generate.arguments.map((argument) => [argument.name, argument.required]), [['type', true], ['name', true]]);
    assert.deepEqual(schema.errors.map((error) => error.code), Object.keys(ERROR_CODES));
  });

  it('is what qn --help --json prints', async (t) => {
    const cwd = await makeTmp(t);
    const help = JSON.parse((await runQn(cwd, '--help', '--json')).stdout);
    const { ok, ...rest } = help;
    assert.equal(ok, true);
    assert.deepEqual(rest, buildSchema(rest.version));
    assert.equal(JSON.parse((await runQn(cwd, 'help', 'g', '--json')).stdout).command.name, 'generate');
  });
});

/** Runs JSON-RPC messages through the MCP server and returns the responses by id. */
async function mcpSession(cwd, messages) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let text = '';
  stdout.on('data', (chunk) => (text += chunk));
  const done = runMcpServer({ stdin, stdout, cwd, version: '9.9.9' });
  stdin.end(messages.map((message) => (typeof message === 'string' ? message : JSON.stringify(message))).join('\n'));
  assert.equal(await done, 0);
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const call = (id, name, args = {}) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

describe('qn mcp', () => {
  it('initializes, lists the tools and ignores notifications', async (t) => {
    const responses = await mcpSession(await makeTmp(t), [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {} } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'ping' }
    ]);
    assert.deepEqual(responses.map((response) => response.id), [1, 2, 3]);
    assert.equal(responses[0].result.protocolVersion, '2025-03-26');
    assert.equal(responses[0].result.serverInfo.version, '9.9.9');
    assert.deepEqual(responses[1].result.tools.map((tool) => tool.name), Object.keys(TOOLS));
    for (const tool of responses[1].result.tools) assert.equal(tool.annotations.openWorldHint, false);
    assert.deepEqual(responses[2].result, {});
  });

  it('answers protocol errors as JSON-RPC errors', async (t) => {
    const ctx = { root: await makeTmp(t), version: '1' };
    assert.equal((await handleMessage('{not json', ctx)).error.code, -32700);
    assert.equal((await handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'nope' }), ctx)).error.code, -32601);
    assert.equal((await handleMessage(JSON.stringify(call(2, 'qn_rm_rf')), ctx)).error.code, -32602);
  });

  it('plans by default and writes only with apply: true', async (t) => {
    const root = await makeTmp(t);
    const [planned, applied] = await mcpSession(root, [
      call(1, 'qn_create', { name: 'api', template: 'javascript' }),
      call(2, 'qn_create', { name: 'api', template: 'javascript', apply: true })
    ]);
    assert.equal(planned.result.isError, false);
    assert.equal(planned.result.structuredContent.dryRun, true);
    assert.deepEqual(planned.result.structuredContent.steps, []);
    assert.equal(applied.result.structuredContent.dryRun, false);
    assert.ok(await exists(root, 'api', 'package.json'));

    const project = path.join(root, 'api');
    const [plan, check] = await mcpSession(root, [
      call(3, 'qn_generate', { type: 'crud', name: 'product', path: 'api' }),
      call(4, 'qn_check', { path: 'api' })
    ]);
    assert.equal(plan.result.structuredContent.dryRun, true);
    assert.equal(await exists(project, 'src', 'domain', 'entities', 'product.js'), false);
    assert.equal(check.result.structuredContent.ok, true);

    const [add] = await mcpSession(project, [call(5, 'qn_add', { recipes: ['healthcheck'], apply: true })]);
    assert.equal(add.result.isError, false);
    assert.ok(await exists(project, 'src', 'infrastructure', 'routes', 'health-routes.js'));
  });

  it('refuses paths outside its folder and returns tool errors the model can read', async (t) => {
    const project = await makeProject(t, 'javascript');
    const inner = path.join(project, 'src');
    const [outside, above, invalid, doctor] = await mcpSession(inner, [
      call(1, 'qn_check', { path: '..' }),
      call(2, 'qn_check'),
      call(3, 'qn_generate', { type: 'page', name: 'x' }),
      call(4, 'qn_doctor', { path: '../..' })
    ]);
    for (const response of [outside, above, invalid, doctor]) {
      assert.equal(response.result.isError, true);
      assert.equal(response.result.structuredContent.error.code, 'E_USAGE');
    }
    assert.match(above.result.structuredContent.error.message, /outside the folder/);

    const [diagnosis] = await mcpSession(project, [call(5, 'qn_doctor')]);
    const statuses = Object.fromEntries(diagnosis.result.structuredContent.checks.map((check) => [check.name, check.status]));
    assert.equal(statuses.docker, 'skip');
    assert.equal(statuses.audit, 'skip');
  });
});

describe('docs for LLMs', () => {
  it('converts the HTML of the pages to Markdown with absolute links', () => {
    const html = [
      '<h2 id="x"><span class="prompt" aria-hidden="true">C:\\&gt; </span>How?</h2>',
      '<p>Run <code>qn &lt;cmd&gt;</code>, see <a href="../commands/">commands</a>.</p>',
      '<pre class="term"><code><span class="ps" aria-hidden="true">C:\\&gt; </span>npx qn</code></pre>',
      '<ol>\n  <li>One</li>\n  <li>Two</li>\n</ol>',
      '<dl class="opts">\n  <dt>auth</dt>\n  <dd>JWT</dd>\n</dl>',
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2 | 3</td></tr></tbody></table>'
    ].join('\n');
    assert.equal(
      htmlToMarkdown(html, 'https://example.com/docs/tutorial/'),
      [
        '## How?',
        'Run `qn <cmd>`, see [commands](https://example.com/docs/commands/).',
        '```\n$ npx qn\n```',
        '1. One\n2. Two',
        '- **auth**: JWT',
        '| A | B |\n| --- | --- |\n| 1 | 2 \\| 3 |'
      ].join('\n\n') + '\n'
    );
  });

  it('publishes llms.txt, llms-full.txt and a .md of every page', async () => {
    const docs = path.resolve('docs');
    const llms = await fs.readFile(path.join(docs, 'llms.txt'), 'utf8');
    assert.match(llms, /^# QuickNode CLI\n\n> /);
    assert.match(llms, /Not related to QuickNode, the blockchain infrastructure provider/);
    for (const [, url] of llms.matchAll(/\]\((https:\/\/daksonc\.github\.io\/QuickNode\/[^)]+\.md)\)/g)) {
      assert.ok(await exists(docs, url.replace('https://daksonc.github.io/QuickNode/', '')), url);
    }
    assert.match(await fs.readFile(path.join(docs, 'llms-full.txt'), 'utf8'), /# QuickNode CLI for AI agents/);
  });
});

describe('generated project for AI agents', () => {
  it('has docs/adr with a template and tells agents to use it', async (t) => {
    for (const template of ['typescript', 'javascript']) {
      const project = await makeProject(t, template);
      for (const file of ['README.md', '0000-template.md', '0001-clean-architecture.md']) {
        assert.ok(await exists(project, 'docs', 'adr', file), `${template}: ${file}`);
      }
      assert.match(await read(project, 'AGENTS.md'), /docs\/adr\//);
    }
  });
});

describe('agent evaluation runner', async () => {
  const { inventedFlags, qnInvocations, shellWords } = await import('../scripts/eval-agents.mjs');
  const tasks = JSON.parse(await fs.readFile(new URL('../eval/tasks.json', import.meta.url), 'utf8')).tasks;

  it('finds the qn calls inside shell commands', () => {
    assert.deepEqual(shellWords(`qn g crud 'order item' --json`), ['qn', 'g', 'crud', 'order item', '--json']);
    assert.deepEqual(qnInvocations('cd api && qn generate crud product --dry-run | head; npx @10565/quicknode-cli@2 check'), [
      ['generate', 'crud', 'product', '--dry-run'],
      ['check']
    ]);
    assert.deepEqual(qnInvocations('npm test && ls'), []);
  });

  it('counts only commands the parser rejects as invented', () => {
    assert.deepEqual(inventedFlags([['create', 'api', '--typescript'], ['create', 'api', '--db', 'mongo'], ['add', 'kafka']]), [
      ['create', 'api', '--db', 'mongo'],
      ['add', 'kafka']
    ]);
  });

  it('has tasks whose setup commands are valid', () => {
    assert.ok(tasks.length >= 5);
    assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
    for (const task of tasks) {
      assert.ok(task.prompt && task.project && task.expect, task.id);
      assert.deepEqual(inventedFlags(task.setup ?? []), [], task.id);
    }
  });
});
