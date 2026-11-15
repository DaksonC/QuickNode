# Documentation site

Source of <https://daksonc.github.io/QuickNode/> (ADR-001, D7 and D8). GitHub Pages serves the
committed `docs/` folder as is: plain HTML, CSS and JavaScript, no framework, no build step on
the server and no third-party resources.

```
docs-src/
  site.mjs               facts, page list (titles, descriptions, dates), interface strings,
                         Portuguese text of the command reference
  content/en/*.html      page bodies in English
  content/pt/*.html      page bodies in Portuguese (same files, same structure)
  og.html                source of docs/assets/img/og.png
scripts/
  build-docs.mjs         generator (zero dependencies): layout, metadata, JSON-LD, sitemap,
                         command reference and simulator data from dist/ (the CLI itself)
  serve-docs.mjs         local server that mimics GitHub Pages under /QuickNode/
docs/                    output, committed
  assets/css/site.css    verbatim copy of the personal site's CSS (tokens and terminal look)
  assets/css/docs.css    documentation-only rules
  assets/js/theme.js     verbatim copy from the personal site (theme before first paint)
  assets/js/docs.js      progressive enhancement: [FX], theme, [MENU], terminal simulator
  assets/js/qn-data.js   generated: help texts and dry-run output of the real CLI
  assets/fonts/          VT323 (SIL Open Font License, OFL.txt)
```

## Editing

1. Change `docs-src/content/en/<page>.html` **and** `docs-src/content/pt/<page>.html`.
   Each page starts with `<h1>` and a `<p class="answer">` sentence that answers the page's
   question; headings are questions (D8).
2. Bump `updated` of that page in `site.mjs` (it feeds the visible date, JSON-LD and sitemap).
3. `npm run docs:build` and commit `docs/`. `npm test` fails while `docs/` is out of date.

Placeholders in the fragments: `{{home}}` (language root), `{{root}}` (site root),
`{{package}}`, `{{version}}`, `{{appliesTo}}`, `{{node}}`, `{{repo}}`, `{{npm}}`.
Lines starting with `$ ` inside `<pre class="term"><code>` get the `C:\>` prompt.
`<!-- qn:reference -->` is replaced by the generated command reference.

The command reference comes from `src/spec.ts`. A new command or flag needs its Portuguese text
in `COMMANDS_PT` (`site.mjs`); the build fails without it. A new `qn ui` topic needs a page.

`content/*/adr-001.html` are copies of the ADR (the original lives in Google Docs, in
Portuguese); update both when the ADR changes.

The preview image: render `docs-src/og.html` at 1200×630 with any local Chromium, as described
in that file.

## Checks before publishing

```sh
npm run docs:build && npm test
npm run docs:serve            # http://127.0.0.1:4000/QuickNode/
```

- Lighthouse (mobile and desktop) on a few pages: > 95 in every category, SEO = 100.
  `npx lighthouse http://127.0.0.1:4000/QuickNode/ --chrome-flags=--headless`
  (the local server also answers `/robots.txt` with the version proposed for the personal site).
- axe (DevTools extension or axe-core) on every page, both themes, 1280 px and 320 px: 0 violations.
- Keyboard only: skip link, `[MENU]`, `[EN] [PT]`, `[FX]`, theme, terminal; focus always visible.
- With JavaScript disabled, every page is complete.
- `prefers-reduced-motion: reduce` and `[FX: OFF]`: nothing moves.
- DevTools console: no CSP violations.

`npm test` already checks: sync with the CLI, one page per `qn ui` topic, unique titles and
descriptions, canonical/hreflang/Open Graph, JSON-LD (dateModified, softwareVersion), sitemap,
the 100 KB budget per page, no third-party resources or inline scripts, and internal links.

## Keeping in sync with the personal site

`site.css` and `theme.js` are copies (header comment in `site.css` names the commit). When the
personal site changes its tokens, copy the files again. The theme and FX choices share
`localStorage` with the personal site, since both live on `daksonc.github.io`.
