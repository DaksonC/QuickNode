import figlet from 'figlet';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageRoot } from '../core/paths.js';

/**
 * Get the version from package.json dynamically
 */
export function getVersion(): string {
  try {
    const packagePath = join(packageRoot(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch {
    return '1.0.0'; // fallback version
  }
}

/**
 * Create ASCII art banner for QuickNode CLI
 */
export async function createBanner(): Promise<string> {
  return new Promise((resolve, reject) => {
    figlet.text('QuickNode', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    }, (err, data) => {
      if (err) {
        // Fallback to a simpler font if ANSI Shadow is not available
        figlet.text('QuickNode', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default',
          width: 80,
          whitespaceBreak: true
        }, (err2, data2) => {
          if (err2) {
            reject(err2);
            return;
          }
          
          const version = getVersion();
          const banner = createStyledBanner(data2 || 'QuickNode', version);
          resolve(banner);
        });
        return;
      }
      
      const version = getVersion();
      const banner = createStyledBanner(data || 'QuickNode', version);
      resolve(banner);
    });
  });
}

/**
 * Style the banner with colors and additional info
 */
function createStyledBanner(asciiText: string, version: string): string {
  const styledText = chalk.cyan(asciiText);
  const tagline = chalk.magenta.bold('                    10-5-6-5');
  const versionText = chalk.yellow(`v${version}`);
  const description = chalk.gray('🚀 Bootstrap Node.js projects with clean architecture');
  const divider = chalk.gray('─'.repeat(60));
  
  const donationMessage = chalk.blue('💖 Support this project:');
  const donationLink = chalk.underline.blue('https://www.paypal.com/donate/?hosted_button_id=EA36NAFVH6LDY');
  
  return `
${styledText}
${tagline}

${divider}
${description}
Version: ${versionText}
${chalk.green('Ready to create amazing projects!')}

${donationMessage}
${donationLink}
${divider}
`;
}

/**
 * Create a simple banner without figlet (fallback)
 */
export function createSimpleBanner(): string {
  const version = getVersion();
  
  const title = chalk.cyan.bold(`
 ██████╗ ██╗   ██╗██╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██████╗ ███████╗
██╔═══██╗██║   ██║██║██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██╔══██╗██╔════╝
██║   ██║██║   ██║██║██║     █████╔╝ ██╔██╗ ██║██║   ██║██║  ██║█████╗  
██║▄▄ ██║██║   ██║██║██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║  ██║██╔══╝  
╚██████╔╝╚██████╔╝██║╚██████╗██║  ██╗██║ ╚████║╚██████╔╝██████╔╝███████╗
 ╚══▀▀═╝  ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝
`);

  const tagline = chalk.magenta.bold('                               10-5-6-5');
  const versionText = chalk.yellow(`v${version}`);
  const description = chalk.gray('🚀 Bootstrap Node.js projects with clean architecture');
  const divider = chalk.gray('─'.repeat(80));
  
  const donationMessage = chalk.blue('💖 Support this project:');
  const donationLink = chalk.underline.blue('https://www.paypal.com/donate/?hosted_button_id=EA36NAFVH6LDY');
  
  return `
${title}
${tagline}

${divider}
${description}
Version: ${versionText}
${chalk.green('Ready to create amazing projects!')}

${donationMessage}
${donationLink}
${divider}
`;
}
