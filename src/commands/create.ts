import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { createEnvFile } from '../core/env.js';
import { templateDir, type TemplateName } from '../core/paths.js';
import { resolveProject, validateProjectName } from '../core/project-name.js';
import { scaffold, TargetNotEmptyError } from '../core/scaffold.js';

export interface CreateOptions {
  typescript?: boolean;
  javascript?: boolean;
  force?: boolean;
}

const MAX_LISTED_FILES = 10;
const ENV_FILE = '.env';

async function askProjectName(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (use "." for current directory):',
      default: 'my-quicknode-app',
      validate: (value: string) => value === '.' || validateProjectName(value) || true
    }
  ]);
  return answers.projectName;
}

async function chooseTemplate(options: CreateOptions): Promise<TemplateName> {
  if (options.typescript && options.javascript) {
    throw new Error('Choose only one template: --typescript or --javascript.');
  }
  if (options.typescript) return 'typescript';
  if (options.javascript) return 'javascript';

  const answers = await inquirer.prompt([
    { type: 'confirm', name: 'useTypeScript', message: 'Use TypeScript?', default: true }
  ]);
  return answers.useTypeScript ? 'typescript' : 'javascript';
}

async function setPackageName(projectDir: string, name: string): Promise<void> {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  packageJson.name = name;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function describeNotEmpty(error: TargetNotEmptyError): string {
  const files = error.conflicts.length > 0 ? error.conflicts : error.entries;
  const label = error.conflicts.length > 0 ? 'Files that would be overwritten' : 'Existing entries';
  const listed = files.slice(0, MAX_LISTED_FILES).map((file) => `  - ${file}`);
  if (files.length > MAX_LISTED_FILES) listed.push(`  ... and ${files.length - MAX_LISTED_FILES} more`);
  return [error.message, `${label}:`, ...listed].join('\n');
}

export async function createProject(projectName?: string, options: CreateOptions = {}): Promise<void> {
  const name = projectName ?? (await askProjectName());
  const project = resolveProject(name);
  const template = await chooseTemplate(options);

  console.log(chalk.blue(`Creating QuickNode project in ${project.targetDir}`));
  // An existing .env is never replaced (it may hold the user's real secrets).
  const envExisted = existsSync(path.join(project.targetDir, ENV_FILE));
  const spinner = ora('Setting up project...').start();
  let envGenerated = false;

  try {
    await scaffold({
      templateDir: templateDir(template),
      targetDir: project.targetDir,
      force: options.force,
      preserve: [ENV_FILE],
      transform: async (stagingDir) => {
        await setPackageName(stagingDir, project.packageName);
        envGenerated = await createEnvFile(stagingDir);
      }
    });
  } catch (error) {
    spinner.fail('Failed to create project');
    if (error instanceof TargetNotEmptyError) throw new Error(describeNotEmpty(error));
    throw error;
  }

  spinner.succeed('Project created successfully!');

  console.log(chalk.green('\n✅ QuickNode project created!'));
  if (envExisted) {
    console.log(chalk.yellow('Your existing .env was kept: compare it with .env.example.'));
  } else if (envGenerated) {
    console.log(chalk.gray('A .env file with random secrets was generated (it is git-ignored).'));
  }
  console.log(chalk.yellow('\nNext steps:'));
  if (!project.inCurrentDir) console.log(chalk.white(`  cd ${name}`));
  console.log(chalk.white('  npm install'));
  console.log(chalk.white('  npm run dev'));

  console.log(chalk.gray('\nAvailable scripts:'));
  console.log(chalk.gray('  npm run dev     - Start development server'));
  console.log(chalk.gray('  npm run build   - Build for production'));
  console.log(chalk.gray('  npm test        - Run tests'));
  console.log(chalk.gray('  npm run lint    - Lint code'));
}
