import type { Style } from './style.js';

/** Pre-rendered "ANSI Shadow" banner (no figlet needed at runtime). */
const LOGO = String.raw`
 ██████╗ ██╗   ██╗██╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██████╗ ███████╗
██╔═══██╗██║   ██║██║██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██╔══██╗██╔════╝
██║   ██║██║   ██║██║██║     █████╔╝ ██╔██╗ ██║██║   ██║██║  ██║█████╗
██║▄▄ ██║██║   ██║██║██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║  ██║██╔══╝
╚██████╔╝╚██████╔╝██║╚██████╗██║  ██╗██║ ╚████║╚██████╔╝██████╔╝███████╗
 ╚══▀▀═╝  ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝`;

const DONATION_URL = 'https://www.paypal.com/donate/?hosted_button_id=EA36NAFVH6LDY';

export function renderBanner(version: string, style: Style): string {
  return [
    style.success(LOGO),
    '',
    `${style.muted('Bootstrap Node.js projects with clean architecture')}  ${style.accent(`v${version}`)}`,
    `${style.muted('Support this project:')} ${style.accent(DONATION_URL)}`,
    ''
  ].join('\n');
}
