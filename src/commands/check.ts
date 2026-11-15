import fs from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { findImports } from '../core/imports.js';
import { detectProject } from '../core/project.js';

/**
 * The dependency rule of clean architecture, as `qn check` applies it: code in
 * src/domain may import only other domain files and Node's built-in modules.
 * Frameworks, ORMs, other packages and src/infrastructure stay outside.
 */
export type Rule =
  | 'domain-imports-infrastructure'
  | 'domain-imports-http-framework'
  | 'domain-imports-orm'
  | 'domain-imports-package'
  | 'domain-imports-outside';

export interface Violation {
  /** Path relative to the project root, with "/" separators. */
  file: string;
  line: number;
  specifier: string;
  rule: Rule;
  message: string;
}

export interface CheckResult {
  ok: boolean;
  root: string;
  filesChecked: number;
  violations: Violation[];
}

const SOURCE_FILE = /\.(?:[cm]?[jt]s|tsx|jsx)$/;
const SKIPPED_FILE = /\.(?:test|spec)\.[^.]+$|\.d\.[cm]?ts$/;
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', 'dist', 'coverage']);

const HTTP_PACKAGES = new Set([
  'express',
  'fastify',
  'koa',
  'hapi',
  '@hapi/hapi',
  'restify',
  'helmet',
  'cors',
  'body-parser',
  'express-validator',
  'swagger-ui-express',
  'swagger-jsdoc'
]);
const ORM_PACKAGES = new Set([
  'typeorm',
  'sequelize',
  'prisma',
  '@prisma/client',
  'mongoose',
  'mongodb',
  'knex',
  'objection',
  'drizzle-orm',
  'pg',
  'pg-hstore',
  'mysql',
  'mysql2',
  'sqlite3',
  'better-sqlite3',
  'redis',
  'ioredis'
]);
const HTTP_SCOPES = ['@nestjs/', '@fastify/', '@koa/'];
const ORM_SCOPES = ['@mikro-orm/'];

const builtins = new Set(builtinModules);
const toPosix = (file: string) => file.split(path.sep).join('/');

/** "express/lib/router" -> "express", "@scope/pkg/sub" -> "@scope/pkg". */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** Why a domain file may not import `specifier`, or undefined when it may. */
export function classifyDomainImport(
  specifier: string,
  fromFile: string,
  srcDir: string
): { rule: Rule; message: string } | undefined {
  const domainDir = path.join(srcDir, 'domain');
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const target = path.resolve(path.dirname(fromFile), specifier);
    if (isInside(target, domainDir)) return undefined;
    if (isInside(target, path.join(srcDir, 'infrastructure'))) {
      return { rule: 'domain-imports-infrastructure', message: 'domain must not import infrastructure' };
    }
    return { rule: 'domain-imports-outside', message: 'domain must only import files inside src/domain' };
  }
  if (specifier.startsWith('node:') || builtins.has(specifier) || builtins.has(packageName(specifier))) return undefined;
  // Path aliases such as "@/infrastructure/..." or "src/infrastructure/...".
  if (/(^|\/)infrastructure(\/|$)/.test(specifier)) {
    return { rule: 'domain-imports-infrastructure', message: 'domain must not import infrastructure' };
  }
  const name = packageName(specifier);
  if (HTTP_PACKAGES.has(name) || HTTP_SCOPES.some((scope) => name.startsWith(scope))) {
    return { rule: 'domain-imports-http-framework', message: `domain must not depend on the HTTP layer ("${name}")` };
  }
  if (ORM_PACKAGES.has(name) || ORM_SCOPES.some((scope) => name.startsWith(scope))) {
    return { rule: 'domain-imports-orm', message: `domain must not depend on the database or ORM ("${name}")` };
  }
  return {
    rule: 'domain-imports-package',
    message: `domain must not depend on third-party packages ("${name}"); keep it in infrastructure`
  };
}

async function listSources(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) files.push(...(await listSources(full)));
    else if (entry.isFile() && SOURCE_FILE.test(entry.name) && !SKIPPED_FILE.test(entry.name)) files.push(full);
  }
  return files;
}

/** Checks the dependency rule in the QuickNode project that contains `cwd`. */
export async function checkProject(cwd: string): Promise<CheckResult> {
  const { root } = detectProject(cwd);
  const srcDir = path.join(root, 'src');
  const files = await listSources(path.join(srcDir, 'domain'));
  const violations: Violation[] = [];

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    for (const { specifier, line } of findImports(source)) {
      const problem = classifyDomainImport(specifier, file, srcDir);
      if (problem) violations.push({ file: toPosix(path.relative(root, file)), line, specifier, ...problem });
    }
  }

  return { ok: violations.length === 0, root, filesChecked: files.length, violations };
}
