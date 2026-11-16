/** Oldest Node.js release the CLI supports (see package.json "engines"). */
export const MIN_NODE = [22, 13] as const;

/**
 * True when `version` (e.g. "22.13.0") is at least MIN_NODE. This module must
 * stay free of recent Node APIs: it runs before anything else is loaded.
 */
export function isSupportedNode(version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  return major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1]);
}
