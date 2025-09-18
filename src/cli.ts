#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from './commands/create.js';

const program = new Command();

program
  .name('quicknode')
  .description('CLI tool to bootstrap Node.js projects with clean architecture')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new QuickNode project')
  .argument('[project-name]', 'Project name (use "." for current directory)')
  .option('-t, --typescript', 'Use TypeScript template', false)
  .option('-js, --javascript', 'Use JavaScript template', false)
  .action(async (projectName, options) => {
    try {
      await createProject(projectName, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('Error creating project:'), errorMessage);
      process.exit(1);
    }
  });

program.parse();
