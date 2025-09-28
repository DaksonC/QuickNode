#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from './commands/create.js';
import { getVersion, createBanner, createSimpleBanner } from './utils/banner.js';

async function showBanner() {
  try {
    const banner = await createBanner();
    console.log(banner);
  } catch (error) {
    // Fallback to simple banner if figlet fails
    console.log(createSimpleBanner());
  }
}

async function main() {
  const program = new Command();

  program
    .name('qn')
    .description('CLI tool to bootstrap Node.js projects with clean architecture')
    .version(getVersion());

  program
    .command('create')
    .description('Create a new QuickNode project')
    .argument('[project-name]', 'Project name (use "." for current directory)')
    .option('-ts, --typescript', 'Use TypeScript template', false)
    .option('-js, --javascript', 'Use JavaScript template', false)
    .action(async (projectName, options) => {
      try {
        // Show banner before creating project
        await showBanner();
        await createProject(projectName, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('Error creating project:'), errorMessage);
        process.exit(1);
      }
    });

  // Show banner if no command is provided
  const args = process.argv.slice(2);
  if (args.length === 0) {
    await showBanner();
  }

  program.parse();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
