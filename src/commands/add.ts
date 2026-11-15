import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangePlan, type ChangeAction } from '../core/changes.js';
import { unifiedDiff } from '../core/diff.js';
import { ENV_EXAMPLE_FILE } from '../core/env.js';
import { insertBeforeMarker, replaceRegion } from '../core/markers.js';
import { packageRoot, templateDir } from '../core/paths.js';
import { detectProject, type PackageJson } from '../core/project.js';
import {
  fillRecipeTokens,
  RECIPE_DEFINITIONS,
  resolveRecipe,
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
  /** applied (or would be, on a dry run), or already present: nothing to do. */
  status: 'applied' | 'already-applied';
  notes: string[];
}

export interface AddResult {
  dryRun: boolean;
  root: string;
  recipes: RecipeOutcome[];
  files: { path: string; action: ChangeAction; diff?: string }[];
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Template files may be stored without their dot (see scaffold.ts). */
async function readTemplateFile(dir: string, file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(dir, file), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !path.basename(file).startsWith('.')) throw error;
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

function versionsOf(names: string[], source: Record<string, string> | undefined, fallback: Record<string, string> | undefined) {
  return Object.fromEntries(
    names.map((name) => {
      const version = source?.[name] ?? fallback?.[name];
      if (!version) throw new Error(`Recipe dependency ${name} has no version in the template package.json.`);
      return [name, version];
    })
  );
}

/**
 * Applies recipes to the QuickNode project that contains `cwd`, or plans them
 * with dryRun. Running a recipe twice changes nothing the second time.
 */
export async function addRecipes(input: AddInput, cwd: string): Promise<AddResult> {
  const project = detectProject(cwd);
  const sourceTemplate = templateDir(project.language);
  const ctx: RecipeContext = {
    project,
    templatePackage: JSON.parse(await fs.readFile(path.join(sourceTemplate, 'package.json'), 'utf8')) as PackageJson
  };
  const plan = new ChangePlan(project.root, input.force);
  const outcomes: RecipeOutcome[] = [];

  /** Runs a planning step and tells whether it changed the planned content of `file`. */
  const changes = async (file: string, step: () => Promise<unknown>): Promise<boolean> => {
    const before = await plan.read(file);
    await step();
    return (await plan.read(file)) !== before || plan.conflicts().includes(file);
  };

  for (const name of input.recipes) {
    const recipe = RECIPE_DEFINITIONS[resolveRecipe(name)];
    let changed = false;
    const prepare = (content: string, file: string) => {
      let text = rewriteForPackageManager(fillRecipeTokens(content, ctx), project.packageManager);
      if (/\.[cm]?[jt]s$/.test(file)) text = formatImports(text);
      if (/\.test\.[jt]s$/.test(file)) text = adaptTestFile(text, project.testRunner, project.language);
      return text;
    };

    for (const file of recipe.templateFiles?.(ctx) ?? []) {
      const content = prepare(await readTemplateFile(sourceTemplate, file), file);
      changed = (await changes(file, () => plan.write(file, content))) || changed;
    }
    if (recipe.ownFiles) {
      const dir = recipeDir(resolveRecipe(name));
      for (const base of [path.join(dir, 'common'), path.join(dir, project.language)]) {
        for (const file of await listIfExists(base)) {
          const content = prepare(await fs.readFile(path.join(base, file), 'utf8'), file);
          changed = (await changes(file, () => plan.write(file, content))) || changed;
        }
      }
    }

    for (const edit of recipe.markers?.(ctx) ?? []) {
      const snippet = formatImports(edit.snippet);
      const current = await plan.read(edit.file);
      const result = current === undefined ? undefined : insertBeforeMarker(current, edit.marker, snippet);
      if (result?.status === 'inserted') {
        await plan.edit(edit.file, () => result.content);
        changed = true;
      } else if (result?.status !== 'present') {
        plan.notes.push(`${name}: add to ${edit.file} by hand (no "// qn:${edit.marker}" marker found):\n${snippet}`);
        changed = true;
      }
    }
    for (const edit of recipe.regions?.(ctx) ?? []) {
      const current = await plan.read(edit.file);
      const result = current === undefined ? undefined : replaceRegion(current, edit.region, edit.snippet);
      if (result?.status === 'inserted') {
        await plan.edit(edit.file, () => result.content);
        changed = true;
      } else if (result?.status !== 'present') {
        plan.notes.push(
          `${name}: in ${edit.file}, replace your own ${edit.region} code with (no "// qn:${edit.region}:start/end" block found):\n${edit.snippet}`
        );
        changed = true;
      }
    }

    const scripts = recipe.scripts?.(ctx) ?? {};
    const dependencies = versionsOf(recipe.dependencies?.(ctx) ?? [], ctx.templatePackage.dependencies, undefined);
    const devDependencies = versionsOf(
      recipe.devDependencies?.(ctx) ?? [],
      ctx.templatePackage.devDependencies,
      ctx.templatePackage.dependencies
    );
    changed =
      (await changes('package.json', () =>
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
        const serialized = `${JSON.stringify(next, null, 2)}\n`;
        return JSON.stringify(next) === JSON.stringify(json) ? content : serialized;
      })
    )) || changed;

    const env = Object.entries(recipe.env ?? {});
    if (env.length > 0 && (await plan.exists(ENV_EXAMPLE_FILE))) {
      changed =
        (await changes(ENV_EXAMPLE_FILE, () =>
          plan.edit(ENV_EXAMPLE_FILE, (content) => {
            const missing = env.filter(([key]) => !new RegExp(`^#?\\s*${key}=`, 'm').test(content));
            if (missing.length === 0) return content;
            const block = [`# ${name} (qn add ${name})`, ...missing.map(([key, value]) => `${key}=${value}`)].join('\n');
            return `${content.replace(/\n*$/, '\n')}\n${block}\n`;
          })
        )) || changed;
    }

    outcomes.push({ recipe: name, status: changed ? 'applied' : 'already-applied', notes: changed ? (recipe.notes?.(ctx) ?? []) : [] });
  }

  const packageJson = plan.list().find((change) => change.path === 'package.json');
  if (packageJson && packageJson.action !== 'unchanged') {
    plan.notes.push(`Run "${project.packageManager} install" to install what changed in package.json.`);
  }

  const files = plan.list().map((change) => ({
    path: change.path,
    action: change.action,
    ...(input.dryRun && (change.action === 'create' || change.action === 'update')
      ? { diff: unifiedDiff(change.path, change.before, change.after) }
      : {})
  }));

  if (!input.dryRun) await plan.apply();
  return { dryRun: input.dryRun, root: project.root, recipes: outcomes, files, notes: plan.notes };
}
