import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreateOptions {
  typescript?: boolean;
  javascript?: boolean;
}

export async function createProject(projectName?: string, options: CreateOptions = {}) {
  // Se não foi especificado um nome, perguntar
  if (!projectName) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name (use "." for current directory):',
        default: 'my-quicknode-app'
      }
    ]);
    projectName = answers.projectName;
  }

  // Garantir que projectName não seja undefined
  if (!projectName) {
    throw new Error('Project name is required');
  }

  // Determinar se deve usar TypeScript ou JavaScript
  let useTypeScript = options.typescript;
  
  if (!options.typescript && !options.javascript) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useTypeScript',
        message: 'Use TypeScript?',
        default: true
      }
    ]);
    useTypeScript = answers.useTypeScript;
  }

  const targetDir = projectName === '.' ? process.cwd() : path.resolve(process.cwd(), projectName);
  const templateDir = path.join(__dirname, '..', 'templates', useTypeScript ? 'typescript' : 'javascript');

  console.log(chalk.blue(`Creating QuickNode project in ${targetDir}`));
  
  const spinner = ora('Setting up project...').start();

  try {
    // Criar diretório se necessário
    if (projectName !== '.') {
      await fs.ensureDir(targetDir);
    }

    // Copiar template
    await fs.copy(templateDir, targetDir);

    // Renomear gitignore para .gitignore
    const gitignorePath = path.join(targetDir, 'gitignore');
    const dotGitignorePath = path.join(targetDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      await fs.rename(gitignorePath, dotGitignorePath);
    }

    // Atualizar package.json com o nome do projeto
    if (projectName !== '.') {
      const packageJsonPath = path.join(targetDir, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = projectName;
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    spinner.succeed('Project created successfully!');

    console.log(chalk.green('\n✅ QuickNode project created!'));
    console.log(chalk.yellow('\nNext steps:'));
    
    if (projectName !== '.') {
      console.log(chalk.white(`  cd ${projectName}`));
    }
    
    console.log(chalk.white('  npm install'));
    console.log(chalk.white('  npm run dev'));
    
    console.log(chalk.gray('\nAvailable scripts:'));
    console.log(chalk.gray('  npm run dev     - Start development server'));
    console.log(chalk.gray('  npm run build   - Build for production'));
    console.log(chalk.gray('  npm test        - Run tests'));
    console.log(chalk.gray('  npm run lint    - Lint code'));

  } catch (error) {
    spinner.fail('Failed to create project');
    throw error;
  }
}
