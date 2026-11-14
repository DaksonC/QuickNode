#!/usr/bin/env node
/**
 * Builds the documentation site (ADR-001, D7 and D8) into docs/, with no
 * dependencies. The command reference, the help texts of the terminal
 * simulator and the `qn ui` topics come from the compiled CLI (dist/), so the
 * site never diverges from what the CLI parses. The output is committed: GitHub
 * Pages serves docs/ as is, without a build step.
 *
 *   node scripts/build-docs.mjs          write docs/
 *   node scripts/build-docs.mjs --check  fail if docs/ is out of date
 *
 * Requires `npm run build` first (it imports dist/).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { EXIT_ERROR, EXIT_OK, EXIT_USAGE, main, renderHelp } from '../dist/main.js';
import { COMMANDS, DOCS_TOPICS, GLOBAL_OPTIONS } from '../dist/spec.js';
import { createStyle } from '../dist/ui/style.js';
import { COMMANDS_PT, LANGS, PAGES, REFERENCE_TEXT, SITE, UI } from '../docs-src/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'docs-src', 'content');
export const OUT_DIR = path.join(ROOT, 'docs');
const MENU_PROMPT = 'C:\\QUICKNODE&gt;';

/** Minimal HTML escaping for text and attribute values. */
export const esc = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/** Absolute URL of a page in a language. */
export const pageUrl = (slug, lang) => `${SITE.baseUrl}${lang === 'pt' ? 'pt/' : ''}${slug}`;

/** Output file of a page, relative to docs/. */
const pageFile = (slug, lang) => path.join(lang === 'pt' ? 'pt' : '', slug, 'index.html');

/** "../" repeated up to the site root, from a page in a language. */
function rootPrefix(slug, lang) {
  const depth = slug.split('/').filter(Boolean).length + (lang === 'pt' ? 1 : 0);
  return '../'.repeat(depth) || './';
}

/** Relative link from one page to another page in the same language. */
function linkTo(fromSlug, toSlug) {
  const up = '../'.repeat(fromSlug.split('/').filter(Boolean).length);
  return `${up}${toSlug}` || './';
}

/** JSON for a <script type="application/ld+json"> block, safe against "</script>". */
const jsonLd = (data) => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');

/** Help text exactly as the CLI prints it, without colors. */
const plainHelp = (command) => renderHelp(command, createStyle(new PassThrough()), false).trimEnd();

/* ---------- Command reference (generated from spec.ts) ---------- */

function optionText(lang, scope, command, name, spec) {
  if (lang === 'en') return spec.description;
  const text = scope === 'global' ? COMMANDS_PT.global[name] : COMMANDS_PT.commands[command]?.options[name];
  if (!text) throw new Error(`Missing Portuguese text for ${scope === 'global' ? '' : `${command} `}--${name}`);
  return text;
}

function commandText(lang, command, key) {
  if (lang === 'en') return key === 'argument' ? COMMANDS[command].argument.description : COMMANDS[command][key];
  const text = COMMANDS_PT.commands[command]?.[key];
  if (!text) throw new Error(`Missing Portuguese ${key} for command ${command}`);
  return text;
}

function renderOptions(options, lang, scope, command) {
  const rows = Object.entries(options).map(([name, spec]) => {
    const flag = `${spec.short ? `-${spec.short}, ` : ''}--${name}${spec.type === 'string' ? ` &lt;${esc(spec.choices?.join('|') ?? 'value')}&gt;` : ''}`;
    return `  <dt id="${scope === 'global' ? '' : `${command}-`}${esc(name)}"><code>${flag}</code></dt>\n  <dd>${esc(optionText(lang, scope, command, name, spec))}</dd>`;
  });
  return `<dl class="opts">\n${rows.join('\n')}\n</dl>`;
}

const terminal = (lines) =>
  `<pre class="term"><code>${lines.map((line) => (line.startsWith('$ ') ? `${prompt()}${esc(line.slice(2))}` : esc(line))).join('\n')}</code></pre>`;

const prompt = () => '<span class="ps" aria-hidden="true">C:\\&gt; </span>';

export function renderReference(lang) {
  const t = REFERENCE_TEXT[lang];
  const sections = Object.values(COMMANDS).map((spec) => {
    const parts = [
      `<section aria-labelledby="${spec.name}">`,
      `<h2 id="${spec.name}" tabindex="-1">qn ${esc(spec.name)}</h2>`,
      `<p>${esc(commandText(lang, spec.name, 'summary'))}.</p>`,
      `<h3>${t.usage}</h3>`,
      terminal([`$ ${spec.usage}`])
    ];
    if (spec.aliases) {
      parts.push(`<p><span class="key">${t.alias}:</span> ${spec.aliases.map((alias) => `<code>qn ${esc(alias)}</code>`).join(', ')}</p>`);
    }
    if (spec.argument) {
      const choices = spec.argument.choices
        ? ` <span class="dim">(${t.values}: ${spec.argument.choices.map((choice) => `<code>${esc(choice)}</code>`).join(', ')})</span>`
        : '';
      parts.push(
        `<h3>${t.argument}</h3>`,
        `<dl class="opts">\n  <dt><code>[${esc(spec.argument.name)}]</code></dt>\n  <dd>${esc(commandText(lang, spec.name, 'argument'))}${choices}</dd>\n</dl>`
      );
    }
    parts.push(`<h3>${t.options}</h3>`, renderOptions(spec.options, lang, 'command', spec.name));
    parts.push(`<h3>${t.examples}</h3>`, terminal(spec.examples.map((example) => `$ ${example}`)));
    parts.push(
      '<details>',
      `<summary>${t.help} <code>qn help ${esc(spec.name)}</code></summary>`,
      terminal([`$ qn help ${spec.name}`, ...plainHelp(spec.name).split('\n')]),
      '</details>',
      '</section>'
    );
    return parts.join('\n');
  });

  return [
    ...sections,
    '<section aria-labelledby="global">',
    `<h2 id="global" tabindex="-1">${t.global}</h2>`,
    `<p>${t.globalText}</p>`,
    renderOptions(GLOBAL_OPTIONS, lang, 'global'),
    '</section>',
    '<section aria-labelledby="exit-codes">',
    `<h2 id="exit-codes" tabindex="-1">${t.exit}</h2>`,
    '<dl class="opts">',
    ...[EXIT_OK, EXIT_ERROR, EXIT_USAGE].map((code, index) => `  <dt><code>${code}</code></dt>\n  <dd>${esc(t.exitCodes[index])}</dd>`),
    '</dl>',
    '</section>'
  ].join('\n');
}

/* ---------- Content fragments ---------- */

/**
 * Reads a fragment and expands its placeholders:
 * {{home}} (language root), {{root}} (site root), {{version}}, {{appliesTo}},
 * {{node}}, {{package}}, {{repo}}, {{npm}}, <!-- qn:reference --> and
 * "$ " prompts at the start of lines inside <pre class="term">.
 */
function renderContent(page, lang) {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, lang, `${page.file}.html`), 'utf8');
  const home = linkTo(page.slug, '');
  const values = {
    home,
    root: rootPrefix(page.slug, lang),
    version: SITE.version,
    appliesTo: SITE.appliesTo,
    node: SITE.node,
    package: SITE.packageName,
    repo: SITE.repo,
    npm: SITE.npm
  };
  return raw
    .replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (!(key in values)) throw new Error(`Unknown placeholder ${match} in ${lang}/${page.file}.html`);
      return values[key];
    })
    .replace('<!-- qn:reference -->', () => renderReference(lang))
    .replace(
      /<pre class="term"><code>([\s\S]*?)<\/code><\/pre>/g,
      (_block, body) => `<pre class="term"><code>${body.replace(/^\$ /gm, prompt)}</code></pre>`
    )
    .trim();
}

/* ---------- Layout ---------- */

function structuredData(page, lang, ui) {
  const url = pageUrl(page.slug, lang);
  const app = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE.baseUrl}#software`,
    name: SITE.name,
    alternateName: SITE.packageName,
    description: SITE.positioning[lang],
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    softwareRequirements: `Node.js ${SITE.node}+`,
    softwareVersion: SITE.version,
    license: 'https://opensource.org/licenses/MIT',
    url: SITE.baseUrl,
    downloadUrl: SITE.npm,
    installUrl: SITE.npm,
    sameAs: [SITE.npm, SITE.repo],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url }
  };
  if (page.slug === '') {
    return { '@context': 'https://schema.org', ...app, dateModified: page.updated, inLanguage: ui.htmlLang };
  }
  const trail = [PAGES[0], ...(page.parent ? [PAGES.find((p) => p.slug === page.parent)] : []), page];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: page[lang].crumb,
        name: page[lang].title,
        description: page[lang].description,
        url,
        inLanguage: ui.htmlLang,
        dateModified: page.updated,
        author: app.author,
        about: { '@id': app['@id'] },
        proficiencyLevel: 'Beginner'
      },
      app,
      {
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item[lang].crumb,
          item: pageUrl(item.slug, lang)
        }))
      }
    ]
  };
}

function head({ title, description, canonical, alternates, root, ui, ld, noindex }) {
  const links = alternates
    ? [
        `<link rel="alternate" hreflang="en" href="${alternates.en}">`,
        `<link rel="alternate" hreflang="pt-BR" href="${alternates.pt}">`,
        `<link rel="alternate" hreflang="x-default" href="${alternates.en}">`
      ]
    : [];
  return `<!doctype html>
<html lang="${ui.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
${noindex ? '  <meta name="robots" content="noindex">\n' : ''}${canonical ? `  <link rel="canonical" href="${canonical}">\n` : ''}${links.map((link) => `  ${link}\n`).join('')}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
${canonical ? `  <meta property="og:url" content="${canonical}">\n` : ''}  <meta property="og:image" content="${SITE.baseUrl}assets/img/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(ui.ogAlt)}">
  <meta property="og:locale" content="${ui.ogLocale}">
  <meta property="og:locale:alternate" content="${ui.ogLocale === 'en_US' ? 'pt_BR' : 'en_US'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE.baseUrl}assets/img/og.png">
  <meta name="twitter:image:alt" content="${esc(ui.ogAlt)}">

  <meta name="theme-color" content="#000000">
  <link rel="icon" href="${root}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${root}assets/fonts/VT323-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}assets/css/site.css">
  <link rel="stylesheet" href="${root}assets/css/docs.css">
  <script src="${root}assets/js/theme.js"></script>
  <script src="${root}assets/js/qn-data.js" defer></script>
  <script src="${root}assets/js/docs.js" defer></script>
${ld ? `  <script type="application/ld+json">\n${ld}\n  </script>\n` : ''}</head>`;
}

function header({ page, lang, ui, home, other }) {
  const menu = PAGES.filter((p) => p.menu).map((p) => {
    const current = page && (p.slug === page.slug || p.slug === page.parent);
    const aria = current ? (p.slug === page.slug ? ' aria-current="page"' : ' aria-current="true"') : '';
    return `          <li><a href="${home}${p.slug}"${aria}>[${p.menu}]</a></li>`;
  });
  const langLink = (target) => {
    const active = target === lang;
    const href = active ? (page ? './' : home) : other;
    const label = target === 'en' ? ui.english : ui.portuguese;
    return `          <li><a href="${href}" hreflang="${target === 'pt' ? 'pt-BR' : 'en'}" lang="${target === 'pt' ? 'pt-BR' : 'en'}"${active ? ' aria-current="page"' : ''}>[${target.toUpperCase()}]<span class="sr-only"> ${label}</span></a></li>`;
  };
  return `<body id="top">
  <a class="skip" href="#main">${ui.skip}</a>

  <header class="wrap site-header">
    <p class="title"><a href="${home}" class="home"><span aria-hidden="true">${MENU_PROMPT}</span><span class="sr-only">${ui.siteLabel}</span></a></p>
    <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="header-panel">[${ui.menu}]</button>

    <div class="panel" id="header-panel">
      <div class="controls">
        <ul class="lang" role="list" aria-label="${ui.language}">
${langLink('en')}
${langLink('pt')}
        </ul>
        <button type="button" id="fx-toggle" hidden>[FX: <span id="fx-state">ON</span>]<span class="sr-only"> ${ui.fxHint}</span></button>
        <button type="button" id="theme-toggle" hidden>[<span id="theme-state">LIGHT</span>]<span class="sr-only" id="theme-hint"> ${ui.themeHint}</span></button>
      </div>

      <nav class="menu" aria-label="${ui.sections}">
        <ul>
${menu.join('\n')}
        </ul>
      </nav>

      <section class="cli-wrap" id="cli-wrap" aria-label="${ui.cliLabel}" hidden>
        <form class="cli" id="cli">
          <label for="cli-input"><span class="prompt" aria-hidden="true">C:\\QUICKNODE&gt;</span><span class="sr-only">${ui.cliLabel}</span></label>
          <input id="cli-input" name="command" type="text" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ui.cliPlaceholder}">
        </form>
        <div class="cli-output" id="cli-output" role="log" aria-live="polite" aria-label="${ui.cliOutput}"></div>
      </section>
    </div>

    <span class="sr-only" role="status" id="status"></span>
  </header>`;
}

function footer(ui, root) {
  return `  <footer class="wrap">
    <p>© 2026 <a href="${SITE.author.url}">${SITE.author.name}</a>. MIT License. ${ui.footer}</p>
    <ul class="list" role="list">
      <li><a href="${SITE.repo}" rel="noopener noreferrer">${ui.source}</a></li>
      <li><a href="${SITE.npm}" rel="noopener noreferrer">${ui.npm}: <code>${SITE.packageName}</code></a></li>
    </ul>
    <p class="dim"><a href="${root}assets/fonts/OFL.txt">VT323</a>: SIL Open Font License.</p>
  </footer>

  <a class="to-top" id="to-top" href="#top"><span aria-hidden="true">[^]</span> ${ui.top}</a>
</body>
</html>
`;
}

function breadcrumb(page, lang, ui) {
  if (page.slug === '') return '';
  const trail = [PAGES[0], ...(page.parent ? [PAGES.find((p) => p.slug === page.parent)] : [])];
  const items = trail.map((item) => `<li><a href="${linkTo(page.slug, item.slug)}">${esc(item[lang].crumb)}</a></li>`);
  items.push(`<li aria-current="page">${esc(page[lang].crumb)}</li>`);
  return `    <nav aria-label="${ui.breadcrumb}"><ol class="crumbs" role="list">${items.join('')}</ol></nav>\n`;
}

function pager(page, lang, ui) {
  const flow = PAGES.filter((p) => p.menu);
  const index = flow.findIndex((p) => p.slug === page.slug);
  if (index === -1) return '';
  const prev = flow[index - 1];
  const next = flow[index + 1];
  const link = (target, label, rel) =>
    `<li><a href="${linkTo(page.slug, target.slug)}" rel="${rel}"><span class="dim">${label}:</span> ${esc(target[lang].crumb)}</a></li>`;
  return `    <nav class="pager" aria-label="${ui.pager}"><ul class="list" role="list">${[prev && link(prev, ui.previous, 'prev'), next && link(next, ui.next, 'next')].filter(Boolean).join('')}</ul></nav>\n`;
}

function renderPage(page, lang) {
  const ui = UI[lang];
  const root = rootPrefix(page.slug, lang);
  const home = linkTo(page.slug, '');
  const otherHref = `${'../'.repeat(page.slug.split('/').filter(Boolean).length)}${lang === 'en' ? 'pt/' : '../'}${page.slug}`;
  const topic = Object.entries(DOCS_TOPICS).find(([, target]) => target === page.slug)?.[0];
  const meta = page[lang];

  return [
    head({
      title: meta.title,
      description: meta.description,
      canonical: pageUrl(page.slug, lang),
      alternates: { en: pageUrl(page.slug, 'en'), pt: pageUrl(page.slug, 'pt') },
      root,
      ui,
      ld: jsonLd(structuredData(page, lang, ui))
    }),
    header({ page, lang, ui, home, other: otherHref }),
    '',
    `  <main id="main" class="wrap" tabindex="-1">`,
    breadcrumb(page, lang, ui) +
      `    <p class="prompt" aria-hidden="true">C:\\QUICKNODE&gt; qn ui${topic ? ` ${topic}` : ''}</p>`,
    `    <p class="meta">${ui.updated} <time datetime="${page.updated}">${page.updated}</time> · ${ui.validFor} ${SITE.appliesTo}</p>`,
    renderContent(page, lang),
    pager(page, lang, ui) + '  </main>',
    '',
    footer(ui, root)
  ].join('\n');
}

function renderNotFound() {
  const ui = UI.en;
  const root = SITE.basePath;
  return [
    head({ title: ui.notFoundTitle, description: ui.notFoundDescription, root, ui, noindex: true }),
    header({ page: undefined, lang: 'en', ui, home: root, other: `${root}pt/` }),
    '',
    '  <main id="main" class="wrap" tabindex="-1">',
    '    <p class="prompt" aria-hidden="true">C:\\QUICKNODE&gt; cd ???</p>',
    `    <h1>${ui.notFoundHeading}</h1>`,
    `    <p>${ui.notFoundText} <a href="${root}">${ui.notFoundHome}</a>.</p>`,
    `    <p lang="pt-BR">Esta página não existe. Veja o <a href="${root}pt/">início da documentação</a>.</p>`,
    '  </main>',
    '',
    footer(ui, root)
  ].join('\n');
}

function renderSitemap() {
  const urls = PAGES.flatMap((page) =>
    LANGS.map(
      (lang) => `  <url>
    <loc>${pageUrl(page.slug, lang)}</loc>
    <lastmod>${page.updated}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl(page.slug, 'en')}"/>
    <xhtml:link rel="alternate" hreflang="pt-BR" href="${pageUrl(page.slug, 'pt')}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(page.slug, 'en')}"/>
  </url>`
    )
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/* ---------- Data for the terminal simulator (docs.js) ---------- */

const NAME_PLACEHOLDER = 'qn-docs-project-name';

/** Real `qn create <name> --dry-run` output, with "NAME" in place of the project name. */
async function dryRunOutput(flag) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'qn-docs-'));
  try {
    const stdout = new PassThrough();
    let text = '';
    stdout.on('data', (chunk) => (text += chunk));
    const code = await main(['create', NAME_PLACEHOLDER, flag, '--dry-run'], { stdin: new PassThrough(), stdout, stderr: new PassThrough(), cwd });
    if (code !== EXIT_OK) throw new Error(`qn create --dry-run failed while building the docs (exit ${code})`);
    return text.split(path.join(cwd, NAME_PLACEHOLDER)).join(`./${NAME_PLACEHOLDER}`).split(NAME_PLACEHOLDER).join('NAME').trimEnd();
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

async function renderSimulatorData() {
  const data = {
    version: SITE.version,
    commands: Object.fromEntries(
      Object.values(COMMANDS).map((spec) => [spec.name, { aliases: spec.aliases ?? [], help: plainHelp(spec.name) }])
    ),
    help: plainHelp(undefined),
    topics: DOCS_TOPICS,
    dryRun: { typescript: await dryRunOutput('--typescript'), javascript: await dryRunOutput('--javascript') }
  };
  return `/* Generated by scripts/build-docs.mjs from the CLI itself: do not edit. */
window.QN_DATA = Object.freeze(${JSON.stringify(data, null, 2)});
`;
}

/* ---------- Build ---------- */

/** Every generated file, as a map of path (relative to docs/) to content. */
export async function buildSite() {
  const files = new Map();
  for (const page of PAGES) {
    for (const lang of LANGS) files.set(pageFile(page.slug, lang), renderPage(page, lang));
  }
  files.set('404.html', renderNotFound());
  files.set('sitemap.xml', renderSitemap());
  files.set(path.join('assets', 'js', 'qn-data.js'), await renderSimulatorData());
  return files;
}

/** Generated files that are missing or differ from docs/, plus stray HTML pages. */
export function outdatedFiles(files, outDir = OUT_DIR) {
  const stale = [...files].filter(([file, content]) => {
    try {
      return fs.readFileSync(path.join(outDir, file), 'utf8') !== content;
    } catch {
      return true;
    }
  });
  const html = fs
    .readdirSync(outDir, { recursive: true })
    .filter((file) => file.endsWith('.html') && !files.has(file));
  return [...stale.map(([file]) => file), ...html];
}

async function run(argv) {
  const files = await buildSite();
  if (argv.includes('--check')) {
    const outdated = outdatedFiles(files);
    if (outdated.length > 0) {
      console.error(`docs/ is out of date; run "npm run docs:build":\n${outdated.map((file) => `  - ${file}`).join('\n')}`);
      return 1;
    }
    console.log(`docs/ is up to date (${files.size} generated files).`);
    return 0;
  }
  for (const [file, content] of files) {
    fs.mkdirSync(path.dirname(path.join(OUT_DIR, file)), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, file), content);
  }
  console.log(`Wrote ${files.size} files to docs/.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await run(process.argv.slice(2));
}
