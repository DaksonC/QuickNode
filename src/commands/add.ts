import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangePlan, type PlannedFile } from '../core/changes.js';
import { ENV_EXAMPLE_FILE } from '../core/env.js';
import { isNotFound } from '../core/fs.js';
import { packageRoot, templateDir } from '../core/paths.js';
import { detectProject, type PackageJson } from '../core/project.js';
import {
  fillRecipeTokens,
  RECIPE_DEFINITIONS,
  resolveRecipe,
  type Recipe,
  type RecipeContext,
  type RecipeName
} from '../core/recipes.js';
import { listTemplateFiles } from '../core/scaffold.js';
import { adaptTestFile, formatImports } from '../core/source-format.js';
import { rewriteForPackageManager } from '../core/variants.js';
import { RECIPES, UsageError } from '../spec.js';

export interface AddInput {
  recipes: RecipeName[];
  dryRun: boolean;
  force: boolean;
}

export interface RecipeOutcome {
  recipe: RecipeName;
  /** applied (or would be, on a dry run), or already in place: nothing to do. */
  status: 'applied' | 'already-applied';
  notes: string[];
}

export interface AddResult {
  dryRun: boolean;
  root: string;
  recipes: RecipeOutcome[];
  files: PlannedFile[];
  /** Manual steps: markers that were removed, scripts kept with other values... */
  notes: string[];
}

export function addInputFromFlags(positionals: string[], values: Record<string, boolean | string | undefined>): AddInput {
  if (positionals.length === 0) {
    throw new UsageError(`Name at least one recipe: ${RECIPES.join(', ')}.`, 'add');
  }
  return {
    // The parser already checked the closed list; drop repeated names.
    recipes: [...new Set(positionals)] as RecipeName[],
    dryRun: Boolean(values['dry-run']),
    force: Boolean(values.force)
  };
}

const recipeDir = (name: string) => path.join(packageRoot(), 'templates', 'recipes', name);

async function listIfExists(dir: string): Promise<string[]> {
  try {
    return await listTemplateFiles(dir);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

/** Template files may be stored without their dot (see scaffold.ts). */
async function readTemplateFile(dir: string, file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(dir, file), 'utf8');
  } catch (error) {
    if (!isNotFound(error) || !path.basename(file).startsWith('.')) throw error;
    return fs.readFile(path.join(dir, path.dirname(file), path.basename(file).slice(1)), 'utf8');
  }
}

/** Adds the missing entries of `wanted` to `current`; never changes a value that exists. */
function mergeMissing(
  current: Record<string, string> | undefined,
  wanted: Record<string, string>,
  kept: (name: string) => void
): Record<string, string> | undefined {
  const entries = Object.entries(wanted);
  if (entries.length === 0) return current;
  const merged = { ...current };
  for (const [name, value] of entries) {
    if (merged[name] === undefined) merged[name] = value;
    else if (merged[name] !== value) kept(name);
  }
  return merged;
}

/** Versions from the template package.json (dependencies first for dev tools that live there). */
function versionsOf(names: string[], ...sources: (Record<string, string> | undefined)[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => {
      const version = sources.map((source) => source?.[name]).find(Boolean);
      if (!version) throw new Error(`Recipe dependency ${name} has no version in the template package.json.`);
      return [name, version];
    })
  );
}

/** Recipe file content adapted to the project: tokens, package manager, imports, test runner. */
function prepareContent(content: string, file: string, ctx: RecipeContext): string {
  const { project } = ctx;
  let text = rewriteForPackageManager(fillRecipeTokens(content, ctx), project.packageManager);
  if (/\.[cm]?[jt]s$/.test(file)) text = formatImports(text);
  if (/\.test\.[jt]s$/.test(file)) text = adaptTestFile(text, project.testRunner, project.language);
  return text;
}

/**
 * Plans one recipe. Each step reports whether it changed (or could not do)
 * something, so a recipe already in place is told apart from one applied now.
 */
class RecipePlanner {
  changed = false;

  constructor(
    private readonly plan: ChangePlan,
    private readonly ctx: RecipeContext,
    private readonly name: RecipeName,
    private readonly recipe: Recipe
  ) {}

  /** Runs a step and records whether it changed the planned content of `file`. */
  private async track(file: string, step: () => Promise<unknown>): Promise<void> {
    const before = await this.plan.read(file);
    await step();
    if ((await this.plan.read(file)) !== before || this.plan.conflicts().includes(file)) this.changed = true;
  }

  async files(): Promise<void> {
    const { ctx, recipe } = this;
    const sourceTemplate = templateDir(ctx.project.language);
    const sources: [string, string][] = (recipe.templateFiles?.(ctx) ?? []).map((file) => [sourceTemplate, file]);
    if (recipe.ownFiles) {
      const dir = recipeDir(resolveRecipe(this.name));
      for (const base of [path.join(dir, 'common'), path.join(dir, ctx.project.language)]) {
        for (const file of await listIfExists(base)) sources.push([base, file]);
      }
    }
    for (const [base, file] of sources) {
      const content = prepareContent(await readTemplateFile(base, file), file, ctx);
      await this.track(file, () => this.plan.write(file, content));
    }
  }

  async wiring(): Promise<void> {
    const { ctx, recipe, name } = this;
    const edits = [
      ...(recipe.markers?.(ctx) ?? []).map((edit) => ({
        file: edit.file,
        target: { marker: edit.marker },
        snippet: formatImports(edit.snippet),
        manual: `${name}: add to ${edit.file} by hand (no "// qn:${edit.marker}" marker found):`
      })),
      ...(recipe.regions?.(ctx) ?? []).map((edit) => ({
        file: edit.file,
        target: { region: edit.region },
        snippet: edit.snippet,
        manual: `${name}: in ${edit.file}, replace your own ${edit.region} code with (no "// qn:${edit.region}:start/end" block found):`
      }))
    ];
    for (const edit of edits) {
      switch (await this.plan.wire(edit.file, edit.target, edit.snippet)) {
        case 'present':
          break;
        case 'inserted':
          this.changed = true;
          break;
        case 'missing':
        case 'file-missing':
          this.plan.notes.push(`${edit.manual}\n${edit.snippet}`);
          this.changed = true;
      }
    }
  }

  async packageJson(): Promise<void> {
    const { ctx, recipe, name, plan } = this;
    const template = ctx.templatePackage;
    const scripts = recipe.scripts?.(ctx) ?? {};
    const dependencies = versionsOf(recipe.dependencies?.(ctx) ?? [], template.dependencies);
    const devDependencies = versionsOf(recipe.devDependencies?.(ctx) ?? [], template.devDependencies, template.dependencies);
    await this.track('package.json', () =>
      plan.edit('package.json', (content) => {
        const json = JSON.parse(content) as PackageJson;
        const keep = (field: string) => (key: string) =>
          plan.notes.push(`${name}: kept your "${key}" in package.json ${field} (the recipe uses a different value).`);
        const next: PackageJson = {
          ...json,
          scripts: mergeMissing(json.scripts, scripts, keep('scripts')),
          dependencies: mergeMissing(json.dependencies, dependencies, keep('dependencies')),
          devDependencies: mergeMissing(json.devDependencies, devDependencies, keep('devDependencies'))
        };
        for (const field of ['scripts', 'dependencies', 'devDependencies'] as const) {
          if (next[field] === undefined) delete next[field];
        }
        // Keep the user's formatting when nothing is added.
        return JSON.stringify(next) === JSON.stringify(json) ? content : `${JSON.stringify(next, null, 2)}\n`;
      })
    );
  }

  async env(): Promise<void> {
    const env = Object.entries(this.recipe.env ?? {});
    if (env.length === 0 || !(await this.plan.exists(ENV_EXAMPLE_FILE))) return;
    await this.track(ENV_EXAMPLE_FILE, () =>
      this.plan.edit(ENV_EXAMPLE_FILE, (content) => {
        const missing = env.filter(([key]) => !new RegExp(`^#?\\s*${key}=`, 'm').test(content));
        if (missing.length === 0) return content;
        const block = [`# ${this.name} (qn add ${this.name})`, ...missing.map(([key, value]) => `${key}=${value}`)].join('\n');
        return `${content.replace(/\n*$/, '\n')}\n${block}\n`;
      })
    );
  }
}

/**
 * Applies recipes to the QuickNode project that contains `cwd`, or plans them
 * with dryRun. Running a recipe twice changes nothing the second time.
 */
export async function addRecipes(input: AddInput, cwd: string): Promise<AddResult> {
  const project = detectProject(cwd);
  const ctx: RecipeContext = {
    project,
    templatePackage: JSON.parse(await fs.readFile(path.join(templateDir(project.language), 'package.json'), 'utf8')) as PackageJson
  };
  const plan = new ChangePlan(project.root, input.force);
  const outcomes: RecipeOutcome[] = [];

  for (const name of input.recipes) {
    const recipe = RECIPE_DEFINITIONS[resolveRecipe(name)];
    const planner = new RecipePlanner(plan, ctx, name, recipe);
    await planner.files();
    await planner.wiring();
    await planner.packageJson();
    await planner.env();
    outcomes.push({
      recipe: name,
      status: planner.changed ? 'applied' : 'already-applied',
      notes: planner.changed ? (recipe.notes?.(ctx) ?? []) : []
    });
  }

  const packageJson = plan.list().find((change) => change.path === 'package.json');
  if (packageJson && packageJson.action !== 'unchanged') {
    plan.notes.push(`Run "${project.packageManager} install" to install what changed in package.json.`);
  }

  const files = plan.summary(input.dryRun);
  if (!input.dryRun) await plan.apply();
  return { dryRun: input.dryRun, root: project.root, recipes: outcomes, files, notes: plan.notes };
}
