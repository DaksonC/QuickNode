import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Database, PackageManager } from '../spec.js';
import { CONFIG_FILE, DEFAULT_LAYERS, readConfig, type Layers, type QuickNodeConfig } from './config.js';
import { QnError } from './errors.js';
import type { TemplateName } from './paths.js';

export type TestRunner = 'jest' | 'node';

/** A project created by `qn create`, found from any folder inside it. */
export interface QuickNodeProject {
  root: string;
  language: TemplateName;
  /** Source file extension: "ts" or "js". */
  ext: 'ts' | 'js';
  testRunner: TestRunner;
  packageManager: PackageManager;
  db: Database;
  /** Folders of each layer, relative to the root. */
  layers: Layers;
  packageJson: PackageJson;
  /** quicknode.json, when the project has one (created with v3, or upgraded). */
  config?: QuickNodeConfig;
}

export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  [key: string]: unknown;
}

export class NotQuickNodeProjectError extends QnError {
  constructor(readonly cwd: string) {
    super(
      'E_NOT_A_PROJECT',
      `No QuickNode project found in ${cwd} or its parent folders (expected package.json, src/domain and src/infrastructure).`,
      'cd into the project folder, or create one: qn create my-api --typescript --yes'
    );
  }
}

/**
 * The lockfile tells the package manager; before the first install, the
 * scripts written by `qn create --pm` do.
 */
function detectPackageManager(dir: string, packageJson: PackageJson): PackageManager {
  if (existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  const scripts = Object.values(packageJson.scripts ?? {}).join('\n');
  if (/\bpnpm run\b/.test(scripts)) return 'pnpm';
  if (/\byarn run\b/.test(scripts)) return 'yarn';
  return 'npm';
}

const isDirectory = (dir: string) => existsSync(dir) && statSync(dir).isDirectory();

/** A project root: quicknode.json, or (projects created before it) the layout. */
function isQuickNodeRoot(dir: string): boolean {
  if (existsSync(path.join(dir, CONFIG_FILE)) && existsSync(path.join(dir, 'package.json'))) return true;
  return (
    existsSync(path.join(dir, 'package.json')) &&
    isDirectory(path.join(dir, DEFAULT_LAYERS.domain)) &&
    isDirectory(path.join(dir, DEFAULT_LAYERS.infrastructure))
  );
}

/** Database of a project without quicknode.json, from its connection file. */
function detectDatabase(dir: string, language: TemplateName): Database {
  const connection = path.join(dir, 'src/infrastructure/database', `connection.${language === 'typescript' ? 'ts' : 'js'}`);
  if (!existsSync(connection)) return 'none';
  const source = readFileSync(connection, 'utf8');
  if (/node:sqlite/.test(source)) return 'sqlite';
  return /typeorm|sequelize/.test(source) ? 'postgres' : 'none';
}

/**
 * Finds the QuickNode project that contains `cwd`. quicknode.json says how
 * the project was created; projects without it (created by v2) are detected
 * by their layout.
 */
export function detectProject(cwd: string): QuickNodeProject {
  let dir = path.resolve(cwd);
  while (!isQuickNodeRoot(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new NotQuickNodeProjectError(cwd);
    dir = parent;
  }

  const packageJson = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as PackageJson;
  const config = readConfig(dir);
  if (config) {
    return {
      root: dir,
      language: config.template,
      ext: config.template === 'typescript' ? 'ts' : 'js',
      testRunner: config.test,
      packageManager: config.pm,
      db: config.db,
      layers: config.layers,
      packageJson,
      config
    };
  }

  const language: TemplateName = existsSync(path.join(dir, 'tsconfig.json')) ? 'typescript' : 'javascript';
  const testScript = packageJson.scripts?.test ?? '';
  return {
    root: dir,
    language,
    ext: language === 'typescript' ? 'ts' : 'js',
    testRunner: /\bjest\b/.test(testScript) || !/--test\b/.test(testScript) ? 'jest' : 'node',
    packageManager: detectPackageManager(dir, packageJson),
    db: detectDatabase(dir, language),
    layers: DEFAULT_LAYERS,
    packageJson
  };
}

/** Throws when a command that writes into the default folders runs in a project with other layers. */
export function assertDefaultLayers(project: QuickNodeProject, command: string): void {
  const { domain, infrastructure } = project.layers;
  if (domain !== DEFAULT_LAYERS.domain || infrastructure !== DEFAULT_LAYERS.infrastructure) {
    throw new QnError(
      'E_CONFIG_INVALID',
      `qn ${command} writes into ${DEFAULT_LAYERS.domain} and ${DEFAULT_LAYERS.infrastructure}, but quicknode.json sets other layer folders.`,
      `use the default "layers" in quicknode.json for qn ${command}; qn check works with any folders`
    );
  }
}
