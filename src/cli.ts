#!/usr/bin/env node
import { isSupportedNode, MIN_NODE } from './node-version.js';

if (isSupportedNode(process.versions.node)) {
  // Loaded lazily so older Node versions get a clear message instead of a
  // SyntaxError about missing exports (e.g. util.styleText).
  const { main } = await import('./main.js');
  process.exitCode = await main(process.argv.slice(2));
} else {
  console.error(`QuickNode CLI requires Node.js ${MIN_NODE.join('.')} or newer (current: ${process.version}).`);
  process.exitCode = 1;
}
