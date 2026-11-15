import type { PackageManager, RECIPES } from '../spec.js';
import type { PackageJson, QuickNodeProject } from './project.js';
import { nodeTestScripts } from './variants.js';

export type RecipeName = (typeof RECIPES)[number];

export interface RecipeContext {
  project: QuickNodeProject;
  /** package.json of the project's template: the source of versions and scripts. */
  templatePackage: PackageJson;
}

/** A line inserted before a `// qn:<marker>` comment. */
export interface MarkerEdit {
  file: string;
  marker: string;
  snippet: string;
}

/** A `// qn:<region>:start ... end` block replaced as a whole. */
export interface RegionEdit {
  file: string;
  region: string;
  snippet: string;
}

/**
 * A recipe of `qn add`: data only. Files come from the project template
 * (`templateFiles`) or from templates/recipes/<name>/{common,<language>}
 * (`ownFiles`); versions and scripts come from the template package.json, so
 * Dependabot keeps everything in one place.
 */
export interface Recipe {
  summary: string;
  templateFiles?: (ctx: RecipeContext) => string[];
  ownFiles?: boolean;
  scripts?: (ctx: RecipeContext) => Record<string, string>;
  dependencies?: (ctx: RecipeContext) => string[];
  devDependencies?: (ctx: RecipeContext) => string[];
  markers?: (ctx: RecipeContext) => MarkerEdit[];
  regions?: (ctx: RecipeContext) => RegionEdit[];
  /** Variables added to .env.example when missing (no secrets). */
  env?: Record<string, string>;
  /** What the user does next, printed after applying. */
  notes?: (ctx: RecipeContext) => string[];
}

const isTs = (ctx: RecipeContext) => ctx.project.language === 'typescript';
const server = (ctx: RecipeContext) => `src/server.${ctx.project.ext}`;

/** `import { name } from 'path'` or `const { name } = require('path')`. */
function importLine(ctx: RecipeContext, name: string, from: string): string {
  return isTs(ctx) ? `import { ${name} } from '${from}';` : `const { ${name} } = require('${from}');`;
}

/** Scripts with the values the template uses. */
function templateScripts(ctx: RecipeContext, names: string[]): Record<string, string> {
  const scripts = ctx.templatePackage.scripts ?? {};
  return Object.fromEntries(names.filter((name) => scripts[name] !== undefined).map((name) => [name, scripts[name]]));
}

const db = (ctx: RecipeContext) => (isTs(ctx) ? 'databaseConnection' : 'sequelizeConnection');

export const RECIPE_DEFINITIONS: Record<Exclude<RecipeName, 'github-actions'>, Recipe> = {
  agents: {
    summary: 'AGENTS.md (and a copy in CLAUDE.md) for AI coding assistants',
    templateFiles: () => ['AGENTS.md', 'CLAUDE.md'],
    scripts: () => ({ check: 'npx @10565/quicknode-cli@2 check' }),
    notes: () => ['AI assistants read AGENTS.md (Copilot, Codex, Cursor) or CLAUDE.md (Claude Code); keep both equal.']
  },
  auth: {
    summary: 'JWT authentication (HS256 with node:crypto, secret from .env)',
    ownFiles: true,
    env: { JWT_SECRET: 'change-me' },
    notes: () => [
      "Protect routes with authenticate() from src/infrastructure/middleware/auth, e.g. router.post('/', authenticate(), controller.create).",
      'Issue tokens with signToken({ sub: user.id }, process.env.JWT_SECRET) after checking the credentials.'
    ]
  },
  ci: {
    summary: 'GitHub Actions workflow: lint, tests, qn check and npm audit',
    ownFiles: true,
    notes: () => ['Push to GitHub to run .github/workflows/ci.yml.']
  },
  docker: {
    summary: 'Multi-stage Dockerfile that runs the API without root',
    ownFiles: true,
    templateFiles: () => ['.dockerignore'],
    scripts: (ctx) => ({ 'docker:build': `docker build -t ${ctx.project.packageJson.name ?? 'app'} .` }),
    notes: (ctx) => [
      `Build and run: docker build -t ${ctx.project.packageJson.name ?? 'app'} . && docker run --env-file .env -p 3000:3000 ${ctx.project.packageJson.name ?? 'app'}`,
      'Inside a container, DB_HOST must point to the database host (for docker-compose, the service name), not localhost.'
    ]
  },
  eslint: {
    summary: 'ESLint (flat config) and Prettier',
    templateFiles: () => ['eslint.config.mjs', '.prettierrc.json', '.prettierignore'],
    scripts: (ctx) => templateScripts(ctx, ['lint', 'lint:fix', 'format']),
    devDependencies: (ctx) => [
      '@eslint/js',
      'eslint',
      'eslint-config-prettier',
      'eslint-plugin-prettier',
      'globals',
      'prettier',
      ...(isTs(ctx) ? ['typescript-eslint'] : [])
    ]
  },
  'graceful-shutdown': {
    summary: 'Close the server and the database cleanly on SIGTERM/SIGINT',
    ownFiles: true,
    env: { SHUTDOWN_TIMEOUT_MS: '10000' },
    markers: (ctx) => [
      { file: server(ctx), marker: 'imports', snippet: importLine(ctx, 'registerGracefulShutdown', './infrastructure/http/graceful-shutdown') }
    ],
    regions: (ctx) => [
      {
        file: server(ctx),
        region: 'shutdown',
        snippet: `registerGracefulShutdown(server, { logger, onShutdown: () => ${db(ctx)}.close() });`
      }
    ]
  },
  healthcheck: {
    summary: 'Liveness and readiness routes (/health/live, /health/ready)',
    ownFiles: true,
    markers: (ctx) => [
      { file: server(ctx), marker: 'imports', snippet: importLine(ctx, 'createHealthRoutes', './infrastructure/routes/health-routes') },
      {
        file: server(ctx),
        marker: 'modules',
        snippet: [
          isTs(ctx)
            ? "const databaseCheck = () => databaseConnection.getDataSource().query('SELECT 1');"
            : 'const databaseCheck = () => sequelizeConnection.getSequelize().authenticate();',
          "app.use('/health', createHealthRoutes({ database: databaseCheck }));"
        ].join('\n')
      }
    ],
    notes: () => ['Point liveness probes to /health/live and readiness probes to /health/ready.']
  },
  husky: {
    summary: 'Git hooks with Husky: lint before commits, commitlint for messages',
    templateFiles: () => ['.husky/pre-commit', '.husky/commit-msg', '.husky/install.mjs', 'commitlint.config.js'],
    scripts: (ctx) => templateScripts(ctx, ['prepare']),
    devDependencies: () => ['husky', '@commitlint/cli', '@commitlint/config-conventional'],
    notes: () => ['The hooks are installed by the next install inside a git repository.']
  },
  'rate-limit': {
    summary: 'Requests per client limit (in memory, no dependencies)',
    ownFiles: true,
    env: { RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_MAX: '100' },
    markers: (ctx) => [
      { file: server(ctx), marker: 'imports', snippet: importLine(ctx, 'rateLimit', './infrastructure/middleware/rate-limit') },
      { file: server(ctx), marker: 'middleware', snippet: 'app.use(rateLimit());' }
    ],
    notes: () => ["Behind a proxy or load balancer, add app.set('trust proxy', 1) so each client is counted by its own IP."]
  },
  swagger: {
    summary: 'OpenAPI 3 documentation with the UI at /api-docs',
    templateFiles: (ctx) => [`src/infrastructure/docs/swagger.${ctx.project.ext}`],
    dependencies: () => ['swagger-jsdoc', 'swagger-ui-express'],
    devDependencies: (ctx) => (isTs(ctx) ? ['@types/swagger-jsdoc', '@types/swagger-ui-express'] : []),
    markers: (ctx) => [
      { file: server(ctx), marker: 'imports', snippet: importLine(ctx, 'setupSwagger', './infrastructure/docs/swagger') },
      { file: server(ctx), marker: 'middleware', snippet: 'setupSwagger(app);' }
    ]
  },
  tests: {
    summary: 'Test runner setup (Jest, or node:test in projects created with --test node)',
    templateFiles: (ctx) => (ctx.project.testRunner === 'jest' ? ['jest.config.js'] : []),
    scripts: (ctx) =>
      ctx.project.testRunner === 'jest'
        ? templateScripts(ctx, ['test', 'test:watch', 'test:coverage'])
        : nodeTestScripts(ctx.project.language),
    devDependencies: (ctx) =>
      ctx.project.testRunner === 'jest' ? ['jest', 'jest-extended', ...(isTs(ctx) ? ['ts-jest', '@types/jest'] : [])] : [],
    notes: () => ['Generate tested code with "qn generate crud <name>": each use case gets a test.']
  }
};

/** github-actions is another name for ci. */
export function resolveRecipe(name: RecipeName): Exclude<RecipeName, 'github-actions'> {
  return name === 'github-actions' ? 'ci' : name;
}

/** Placeholders of recipe files that depend on the package manager. */
export function packageManagerTokens(pm: PackageManager): Record<string, string> {
  switch (pm) {
    case 'pnpm':
      return {
        pm,
        lockfile: 'pnpm-lock.yaml',
        installAll: 'pnpm install --frozen-lockfile --ignore-scripts',
        installProd: 'pnpm install --frozen-lockfile --prod --ignore-scripts',
        run: 'pnpm run',
        audit: 'pnpm audit --audit-level high'
      };
    case 'yarn':
      return {
        pm,
        lockfile: 'yarn.lock',
        installAll: 'yarn install --immutable --mode=skip-build',
        installProd: 'yarn workspaces focus --all --production',
        run: 'yarn run',
        audit: 'yarn npm audit --severity high'
      };
    case 'npm':
      return {
        pm,
        lockfile: 'package-lock.json',
        installAll: 'npm ci --ignore-scripts',
        installProd: 'npm ci --omit=dev --ignore-scripts',
        run: 'npm run',
        audit: 'npm audit --audit-level=high'
      };
  }
}

/**
 * Fills recipe placeholders. Whole-line placeholders (corepack and build
 * steps) disappear, line included, when they do not apply.
 */
export function fillRecipeTokens(text: string, ctx: RecipeContext): string {
  const pm = ctx.project.packageManager;
  const tokens: Record<string, string> = {
    ...packageManagerTokens(pm),
    package: ctx.project.packageJson.name ?? 'app'
  };
  const lines: Record<string, string | undefined> = {
    corepack: pm === 'npm' ? undefined : 'RUN corepack enable',
    corepackStep: pm === 'npm' ? undefined : '      - run: corepack enable',
    buildStep: isTs(ctx) ? `      - run: ${tokens.run} build` : undefined
  };
  return text
    .replace(/^__(corepack|corepackStep|buildStep)__\n/gm, (_, key: string) => (lines[key] === undefined ? '' : `${lines[key]}\n`))
    .replace(/__(pm|lockfile|installAll|installProd|run|audit|package)__/g, (_, key: string) => tokens[key]);
}
