import path from 'node:path';
import { createInterface } from 'node:readline';
import { describeError } from '../core/error-report.js';
import { QnError } from '../core/errors.js';
import { detectProject } from '../core/project.js';
import type { RecipeName } from '../core/recipes.js';
import { CRUD_PARTS, GENERATOR_TYPES, PACKAGE_MANAGERS, RECIPES, TEST_RUNNERS, UsageError } from '../spec.js';
import { addRecipes } from './add.js';
import { checkProject } from './check.js';
import { createProject } from './create.js';
import { doctor } from './doctor.js';
import { generate, type GeneratorType, type Part } from './generate.js';
import { buildSchema } from './schema.js';

/**
 * Model Context Protocol server over stdio (ADR-001, D9): JSON-RPC 2.0, one
 * message per line, no SDK. Rules: it acts only inside the folder it was
 * started in, never uses the network, never runs other programs, and every
 * tool that writes is a dry run unless called with `"apply": true`.
 */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  'QuickNode CLI creates and grows Node.js APIs with clean architecture. Call qn_schema first. ' +
  'Tools that write files (qn_create, qn_generate, qn_add) only plan the changes unless "apply" is true: ' +
  'show the planned files to the person before applying. Run qn_check after every change.';

interface ToolContext {
  /** Folder the server was started in; no tool reads or writes outside it. */
  root: string;
  version: string;
}

type Args = Record<string, unknown>;

interface Tool {
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  run: (args: Args, ctx: ToolContext) => Promise<object>;
}

const pathProperty = {
  path: { type: 'string', description: 'Folder of the project, relative to the server folder (default: the server folder)' }
};
const applyProperties = {
  apply: { type: 'boolean', default: false, description: 'Write the files. Without it the tool only returns the plan (dry run).' },
  force: { type: 'boolean', default: false, description: 'Overwrite existing files with different content' }
};

function stringArg(args: Args, name: string, required: true): string;
function stringArg(args: Args, name: string, required?: false): string | undefined;
function stringArg(args: Args, name: string, required = false): string | undefined {
  const value = args[name];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.length === 0) throw new UsageError(`"${name}" must be a non-empty string.`, 'mcp', 'call qn_schema to see the parameters');
  return value;
}

function choiceArg<T extends string>(args: Args, name: string, choices: readonly T[], fallback?: T): T {
  const value = args[name] ?? fallback;
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    throw new UsageError(`"${name}" must be one of: ${choices.join(', ')}.`, 'mcp', 'call qn_schema to see the accepted values');
  }
  return value as T;
}

function listArg<T extends string>(args: Args, name: string, choices: readonly T[]): T[] {
  const value = args[name];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !choices.includes(item))) {
    throw new UsageError(`"${name}" must be a non-empty list of: ${choices.join(', ')}.`, 'mcp', 'call qn_schema to see the accepted values');
  }
  return [...new Set(value as T[])];
}

const flag = (args: Args, name: string) => args[name] === true;

/** Resolves `path` inside the server folder; anything outside is refused. */
function insideRoot(ctx: ToolContext, relative: string | undefined): string {
  const target = path.resolve(ctx.root, relative ?? '.');
  const fromRoot = path.relative(ctx.root, target);
  if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) {
    throw new UsageError(`"${relative}" is outside the folder the MCP server runs in.`, 'mcp', 'use a path inside the project');
  }
  return target;
}

/** A project folder inside the server folder (detection walks up, so check the root found). */
function projectDir(args: Args, ctx: ToolContext): string {
  const cwd = insideRoot(ctx, stringArg(args, 'path'));
  insideRoot(ctx, path.relative(ctx.root, detectProject(cwd).root));
  return cwd;
}

export const TOOLS: Record<string, Tool> = {
  qn_schema: {
    description: 'Full specification of the QuickNode CLI: commands, flags, accepted values, defaults, error codes.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
    run: async (_args, ctx) => buildSchema(ctx.version)
  },
  qn_check: {
    description:
      'Check the clean architecture dependency rule: src/domain may import only domain files and Node.js built-ins. Returns every violation with file and line.',
    inputSchema: { type: 'object', properties: pathProperty },
    readOnly: true,
    run: async (args, ctx) => checkProject(projectDir(args, ctx))
  },
  qn_doctor: {
    description:
      'Diagnose the project: Node.js version, .env against .env.example (names only) and the dependency rule. Docker and npm audit are not checked here: the MCP server runs no programs and uses no network.',
    inputSchema: { type: 'object', properties: pathProperty },
    readOnly: true,
    run: async (args, ctx) => doctor({ cwd: projectDir(args, ctx), offline: true, runPrograms: false })
  },
  qn_generate: {
    description:
      'Generate a feature in the right layers, already wired: crud = entity, repository interface and implementation, use cases with a test, controller, route and module. Dry run unless apply is true.',
    inputSchema: {
      type: 'object',
      required: ['type', 'name'],
      properties: {
        type: { type: 'string', enum: [...GENERATOR_TYPES] },
        name: { type: 'string', description: 'Feature name, e.g. product or order-item' },
        only: { type: 'array', items: { type: 'string', enum: [...CRUD_PARTS] }, description: 'With crud, only these parts' },
        test: { type: 'boolean', default: true, description: 'Generate the use case test' },
        ...pathProperty,
        ...applyProperties
      }
    },
    readOnly: false,
    run: async (args, ctx) => {
      const type = choiceArg<GeneratorType>(args, 'type', GENERATOR_TYPES);
      if (args.only !== undefined && type !== 'crud') throw new UsageError('"only" works with type "crud" only.', 'mcp');
      const only = args.only === undefined ? undefined : listArg<Part>(args, 'only', CRUD_PARTS);
      return generate(
        { type, name: stringArg(args, 'name', true), only, test: args.test !== false, dryRun: !flag(args, 'apply'), force: flag(args, 'force') },
        projectDir(args, ctx)
      );
    }
  },
  qn_add: {
    description: `Add tools to the project, idempotently: ${RECIPES.join(', ')}. Returns the files with diffs. Dry run unless apply is true.`,
    inputSchema: {
      type: 'object',
      required: ['recipes'],
      properties: {
        recipes: { type: 'array', minItems: 1, items: { type: 'string', enum: [...RECIPES] } },
        ...pathProperty,
        ...applyProperties
      }
    },
    readOnly: false,
    run: async (args, ctx) => {
      const recipes: RecipeName[] = listArg(args, 'recipes', RECIPES);
      return addRecipes({ recipes, dryRun: !flag(args, 'apply'), force: flag(args, 'force') }, projectDir(args, ctx));
    }
  },
  qn_create: {
    description:
      'Create a new Node.js API with clean architecture (Express, PostgreSQL, tests, lint). Dependencies are not installed and git is not initialized: tell the person to run the install. Dry run unless apply is true.',
    inputSchema: {
      type: 'object',
      required: ['name', 'template'],
      properties: {
        name: { type: 'string', description: 'Project folder and package name, created inside the server folder ("." for the server folder)' },
        template: { type: 'string', enum: ['typescript', 'javascript'] },
        pm: { type: 'string', enum: [...PACKAGE_MANAGERS], default: 'npm' },
        test: { type: 'string', enum: [...TEST_RUNNERS], default: 'jest' },
        ...applyProperties
      }
    },
    readOnly: false,
    run: async (args, ctx) =>
      createProject(
        {
          name: stringArg(args, 'name', true),
          template: choiceArg(args, 'template', ['typescript', 'javascript'] as const),
          pm: choiceArg(args, 'pm', PACKAGE_MANAGERS, 'npm'),
          testRunner: choiceArg(args, 'test', TEST_RUNNERS, 'jest'),
          yes: true,
          dryRun: !flag(args, 'apply'),
          force: flag(args, 'force')
        },
        { cwd: ctx.root }
      )
  }
};

interface Request {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

class RpcError extends Error {
  constructor(
    readonly rpcCode: number,
    message: string
  ) {
    super(message);
  }
}

function listTools() {
  return Object.entries(TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { readOnlyHint: tool.readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }));
}

async function callTool(params: Record<string, unknown> | undefined, ctx: ToolContext) {
  const name = params?.name;
  const tool = typeof name === 'string' && Object.hasOwn(TOOLS, name) ? TOOLS[name] : undefined;
  if (!tool) throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  const args = (params?.arguments ?? {}) as Args;
  if (typeof args !== 'object' || args === null || Array.isArray(args)) throw new RpcError(-32602, 'arguments must be an object');
  try {
    const result = { ok: true, ...(await tool.run(args, ctx)) };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false };
  } catch (error) {
    // Tool failures are results the model can read and fix, not protocol errors.
    const report = { ok: false, error: describeError(error, []) };
    if (!(error instanceof QnError)) delete report.error.fix;
    return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }], structuredContent: report, isError: true };
  }
}

/** Handles one JSON-RPC message; returns the response, or undefined for notifications. */
export async function handleMessage(line: string, ctx: ToolContext): Promise<object | undefined> {
  let request: Request;
  try {
    request = JSON.parse(line);
  } catch {
    return { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };
  }
  const isNotification = request.id === undefined;
  try {
    if (typeof request.method !== 'string') throw new RpcError(-32600, 'Invalid request');
    let result: object;
    switch (request.method) {
      case 'initialize': {
        const asked = request.params?.protocolVersion;
        result = {
          protocolVersion: typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'quicknode', title: 'QuickNode CLI', version: ctx.version },
          instructions: INSTRUCTIONS
        };
        break;
      }
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: listTools() };
        break;
      case 'tools/call':
        result = await callTool(request.params, ctx);
        break;
      default:
        if (request.method.startsWith('notifications/')) return undefined;
        throw new RpcError(-32601, `Method not found: ${request.method}`);
    }
    return isNotification ? undefined : { jsonrpc: '2.0', id: request.id, result };
  } catch (error) {
    if (isNotification) return undefined;
    const code = error instanceof RpcError ? error.rpcCode : -32603;
    return { jsonrpc: '2.0', id: request.id ?? null, error: { code, message: (error as Error).message } };
  }
}

export interface McpOptions {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  cwd: string;
  version: string;
}

/** Serves MCP on stdio until stdin closes; messages are handled one at a time, in order. */
export async function runMcpServer({ stdin, stdout, cwd, version }: McpOptions): Promise<number> {
  const ctx: ToolContext = { root: path.resolve(cwd), version };
  const lines = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim() === '') continue;
    const response = await handleMessage(line, ctx);
    if (response) stdout.write(`${JSON.stringify(response)}\n`);
  }
  return 0;
}
