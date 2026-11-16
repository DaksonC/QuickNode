import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { buildSite, OUT_DIR, outdatedFiles, pageUrl } from '../scripts/build-docs.mjs';
import { COMMANDS_PT, LANGS, PAGES, SITE } from '../docs-src/site.mjs';
import { COMMANDS, DOCS_TOPICS, GLOBAL_OPTIONS } from '../dist/spec.js';
import { DOCS_URL } from '../dist/commands/ui.js';
import { getVersion } from '../dist/main.js';

const files = await buildSite();
const pages = [...files].filter(([file]) => file.endsWith('index.html'));
const read = (file) => fs.readFileSync(path.join(OUT_DIR, ...file.split('/')));
/** Page weight budget (ADR-001, D7): HTML + CSS + JS, font not included. */
const BUDGET = 100 * 1024;

const attr = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);

describe('documentation site', () => {
  it('is in sync with the CLI (run "npm run docs:build" to fix)', () => {
    assert.deepEqual(outdatedFiles(files), []);
  });

  it('has an English and a Portuguese version of every page', () => {
    assert.equal(pages.length, PAGES.length * LANGS.length);
    for (const [file, html] of pages) {
      assert.match(html, file.startsWith('pt') ? /<html lang="pt-BR">/ : /<html lang="en">/, file);
    }
  });

  it('has a page for every qn ui topic, on the same base URL', () => {
    assert.equal(SITE.baseUrl, DOCS_URL);
    for (const target of Object.values(DOCS_TOPICS)) {
      const [slug, anchor] = target.split('#');
      for (const lang of LANGS) {
        const html = files.get(`${lang === 'pt' ? 'pt/' : ''}${slug}index.html`);
        assert.ok(html, `missing page for ${lang}/${slug}`);
        if (anchor) assert.match(html, new RegExp(`id="${anchor}"`), `missing #${anchor} in ${lang}/${slug}`);
      }
    }
  });

  it('documents every command and flag in both languages', () => {
    for (const lang of LANGS) {
      const html = files.get(`${lang === 'pt' ? 'pt/' : ''}commands/index.html`);
      for (const spec of Object.values(COMMANDS)) {
        assert.match(html, new RegExp(`<h2 id="${spec.name}"`));
        for (const name of Object.keys(spec.options)) assert.match(html, new RegExp(`id="${spec.name}-${name}"`));
        for (const example of spec.examples) assert.ok(html.includes(example.replace(/&/g, '&amp;')), example);
      }
      for (const name of Object.keys(GLOBAL_OPTIONS)) assert.match(html, new RegExp(`id="${name}"`));
    }
    for (const spec of Object.values(COMMANDS)) {
      assert.ok(COMMANDS_PT.commands[spec.name], `Portuguese text for ${spec.name}`);
      assert.deepEqual(Object.keys(COMMANDS_PT.commands[spec.name].options).sort(), Object.keys(spec.options).sort());
      assert.deepEqual(
        Object.keys(COMMANDS_PT.commands[spec.name].arguments ?? {}).sort(),
        (spec.arguments ?? []).map((argument) => argument.name).sort(),
        `Portuguese arguments of ${spec.name}`
      );
    }
    assert.deepEqual(Object.keys(COMMANDS_PT.global).sort(), Object.keys(GLOBAL_OPTIONS).sort());
  });

  it('gives every page a unique title, description and canonical URL with hreflang', () => {
    const titles = new Set();
    const descriptions = new Set();
    for (const [file, html] of pages) {
      const [title] = attr(html, /<title>([^<]+)<\/title>/g);
      const [description] = attr(html, /<meta name="description" content="([^"]+)">/g);
      assert.ok(title && description, file);
      assert.ok(description.length >= 70 && description.length <= 200, `${file}: description has ${description.length} chars`);
      titles.add(title);
      descriptions.add(description);
      const [canonical] = attr(html, /<link rel="canonical" href="([^"]+)">/g);
      assert.equal(canonical, `${SITE.baseUrl}${file.replace(/index\.html$/, '')}`);
      for (const hreflang of ['en', 'pt-BR', 'x-default']) assert.match(html, new RegExp(`hreflang="${hreflang}" href="https://`));
      assert.match(html, /<meta property="og:image" content="https:\/\/daksonc\.github\.io\/QuickNode\/assets\/img\/og\.png">/);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    }
    assert.equal(titles.size, pages.length);
    assert.equal(descriptions.size, pages.length);
  });

  it('describes the software and the breadcrumb in JSON-LD, with date and version', () => {
    for (const [file, html] of pages) {
      const [json] = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      const data = JSON.parse(json);
      const nodes = data['@graph'] ?? [data];
      const app = nodes.find((node) => node['@type'] === 'SoftwareApplication');
      assert.equal(app.softwareVersion, SITE.version, file);
      assert.ok(nodes.some((node) => /^\d{4}-\d{2}-\d{2}$/.test(node.dateModified ?? '')), file);
      if (file === 'index.html' || file === 'pt/index.html') continue;
      const crumbs = nodes.find((node) => node['@type'] === 'BreadcrumbList');
      assert.ok(crumbs.itemListElement.length >= 2, file);
      assert.equal(crumbs.itemListElement.at(-1).item, `${SITE.baseUrl}${file.replace(/index\.html$/, '')}`);
    }
  });

  it('shows the update date and the version each page applies to', () => {
    for (const [file, html] of pages) {
      assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">/, file);
      assert.ok(html.includes(SITE.appliesTo), file);
      assert.match(html, /<p class="answer">/, `${file} must open with a direct answer`);
    }
  });

  it('documents a version that is not older than the package (update SITE.version after a release)', () => {
    const [docs, installed] = [SITE.version, getVersion()].map((version) => version.split(/[.-]/).slice(0, 3).map(Number));
    const cmp = docs.map((part, index) => part - installed[index]).find((diff) => diff !== 0) ?? 0;
    assert.ok(cmp >= 0, `docs describe ${SITE.version} but package.json is ${getVersion()}`);
  });

  it('takes the Node.js requirement from package.json engines', () => {
    assert.match(SITE.node, /^\d+\.\d+(\.\d+)?$/);
    assert.ok(JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).engines.node.includes(SITE.node));
  });

  it('lists every page in the sitemap', () => {
    const sitemap = files.get('sitemap.xml');
    for (const page of PAGES) {
      for (const lang of LANGS) assert.ok(sitemap.includes(`<loc>${pageUrl(page.slug, lang)}</loc>`), page.slug);
    }
  });

  it('keeps every page under 100 KB of HTML, CSS and JavaScript', () => {
    for (const [file, html] of pages) {
      const dir = path.dirname(path.join(OUT_DIR, file));
      const assets = attr(html, /<(?:script src|link rel="stylesheet" href)="([^"]+)"/g);
      const size = Buffer.byteLength(html) + assets.reduce((sum, asset) => sum + fs.statSync(path.resolve(dir, asset)).size, 0);
      assert.ok(size < BUDGET, `${file}: ${size} bytes`);
    }
  });

  it('loads nothing from third parties and runs no inline script', () => {
    for (const [file, html] of [...pages, ['404.html', files.get('404.html')]]) {
      const resources = attr(html, /<(?:script|img|iframe|source)[^>]+src="([^"]+)"/g).concat(
        attr(html, /<link rel="(?:stylesheet|preload|icon)" href="([^"]+)"/g)
      );
      for (const url of resources) assert.doesNotMatch(url, /^(https?:)?\/\//, `${file}: ${url}`);
      assert.doesNotMatch(html, /<script>|<script (?!src=|type="application\/ld\+json")/i, file);
      assert.doesNotMatch(html, / style="| on[a-z]+="/, file);
      assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'/, file);
    }
    assert.match(files.get('404.html'), /<meta name="robots" content="noindex">/);
  });

  it('has no broken internal links or anchors', () => {
    for (const [file, html] of pages) {
      const dir = path.posix.dirname(file);
      for (const href of attr(html, /<a [^>]*href="([^"]+)"/g)) {
        if (/^(https?:|mailto:)/.test(href)) continue;
        const [target, anchor] = href.split('#');
        const resolved = target === '' ? file : path.posix.join(dir, target);
        const targetFile = resolved.endsWith('.txt') ? resolved : path.posix.join(resolved.replace(/index\.html$/, ''), 'index.html');
        const content = files.get(targetFile) ?? read(targetFile).toString();
        if (anchor) assert.match(content, new RegExp(`id="${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${file} -> ${href}`);
      }
    }
  });

  it('ships the self-hosted font with its license and the preview image', () => {
    assert.ok(read('assets/fonts/VT323-Regular.woff2').length > 0);
    assert.match(read('assets/fonts/OFL.txt').toString(), /SIL OPEN FONT LICENSE/i);
    const png = read('assets/img/og.png');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(fs.existsSync(path.join(OUT_DIR, '.nojekyll')));
  });
});
