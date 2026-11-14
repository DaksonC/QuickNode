#!/usr/bin/env node
/**
 * Serves docs/ locally the way GitHub Pages does: under /QuickNode/, with
 * directory index.html files and 404.html for unknown paths. Zero
 * dependencies, bound to 127.0.0.1. For Lighthouse and axe runs before
 * publishing (ADR-001, D7/D8).
 *
 *   node scripts/serve-docs.mjs [port]   default port 4000
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * robots.txt lives at the domain root, in the personal site's repository
 * (DaksonC.github.io). This is the version proposed there (ADR-001, D8), served
 * here so local SEO audits see the same file as production.
 */
const ROBOTS_TXT = `User-agent: *
Allow: /

# AI crawlers are explicitly welcome to read and cite the content.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://daksonc.github.io/sitemap.xml
Sitemap: https://daksonc.github.io/QuickNode/sitemap.xml
`;

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const BASE = '/QuickNode/';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

/** File under docs/ for a URL path, or undefined (never outside docs/). */
function resolveFile(urlPath) {
  if (!urlPath.startsWith(BASE)) return undefined;
  let relative;
  try {
    relative = decodeURIComponent(urlPath.slice(BASE.length));
  } catch {
    return undefined;
  }
  const file = path.join(DOCS, relative.endsWith('/') || relative === '' ? path.join(relative, 'index.html') : relative);
  if (file !== DOCS && !file.startsWith(DOCS + path.sep)) return undefined;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : undefined;
}

function send(res, status, file) {
  const stream = fs.createReadStream(file);
  stream.once('open', () => {
    res.writeHead(status, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    stream.pipe(res);
  });
  stream.once('error', () => {
    // e.g. no 404.html before the first "npm run docs:build"
    if (!res.headersSent) res.writeHead(status, { 'content-type': TYPES['.txt'] });
    res.end(status === 404 ? 'Not found. Run "npm run docs:build" first?\n' : '');
  });
}

const port = Number(process.argv[2] ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port "${process.argv[2]}". Usage: node scripts/serve-docs.mjs [port]`);
  process.exit(2);
}
http
  .createServer((req, res) => {
    const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (urlPath === '/robots.txt') {
      res.writeHead(200, { 'content-type': TYPES['.txt'] });
      res.end(ROBOTS_TXT);
      return;
    }
    if (urlPath === '/' || urlPath === '/QuickNode') {
      res.writeHead(302, { location: BASE });
      res.end();
      return;
    }
    // Like Pages: /QuickNode/start redirects to /QuickNode/start/.
    if (!path.extname(urlPath) && !urlPath.endsWith('/') && resolveFile(`${urlPath}/`)) {
      res.writeHead(301, { location: `${urlPath}/` });
      res.end();
      return;
    }
    const file = resolveFile(urlPath);
    if (file) send(res, 200, file);
    else send(res, 404, path.join(DOCS, '404.html'));
  })
  .listen(port, '127.0.0.1', () => console.log(`Docs at http://127.0.0.1:${port}${BASE}`));
