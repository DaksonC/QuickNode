# Documentation site and discovery: manual setup

Steps that only the repository owner can do (ADR-001, D7 and D8). Nothing here is automated.

> GitHub Pages "Deploy from a branch" is built by GitHub Actions behind the scenes, so it will not
> publish while Actions is blocked by the account billing lock. Everything was validated locally
> (`npm run docs:serve`, Lighthouse, axe); do these steps once Actions is available again.

## 1. GitHub Pages

1. Merge the documentation into `main`.
2. Repository → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`,
   folder: `/docs` → **Save**.
3. Wait for the "pages build and deployment" run, then open
   <https://daksonc.github.io/QuickNode/> and <https://daksonc.github.io/QuickNode/pt/>.
4. Check **Enforce HTTPS** (on by default for `github.io`).
5. Open an unknown path (e.g. `/QuickNode/nope`) and confirm the terminal-style 404 page.

## 2. Repository details (About, gear icon on the repository home)

- **Description:** `Zero-dependency CLI to create Node.js APIs with clean architecture`
- **Website:** `https://daksonc.github.io/QuickNode/`
- **Topics:** `nodejs`, `cli`, `scaffold`, `generator`, `boilerplate`, `clean-architecture`,
  `express`, `typescript`, `typescript-template`, `api`, `postgresql`, `zero-dependencies`
- Uncheck "Packages" and "Deployments" if you do not want them on the home page (optional).

## 3. Social preview image

Settings → General → **Social preview** → upload `docs/assets/img/og.png` (1200×630).

## 4. robots.txt on the personal site (DaksonC/DaksonC.github.io)

`robots.txt` only works at the domain root, which belongs to the personal site repository.
Replace its content with (also served by `npm run docs:serve` for local audits):

```
User-agent: *
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
```

## 5. Google Search Console

1. <https://search.google.com/search-console> → **Add property** → **URL prefix** →
   `https://daksonc.github.io/` (covers the personal site and `/QuickNode/`).
2. Verify with the **HTML tag** method: it gives a `<meta name="google-site-verification" ...>`
   tag for the personal site's `index.html` (the HTML file method also works there). Verifying
   the root covers QuickNode; no tag is needed in this repository.
3. **Sitemaps** → submit `https://daksonc.github.io/QuickNode/sitemap.xml`.
4. **URL inspection** → request indexing of `/QuickNode/` and `/QuickNode/pt/`.
5. A few days later, check **Pages** (indexed) and **Enhancements → Breadcrumbs**.

## 6. npm

The new `description`, `keywords` and `homepage` in `package.json` reach npm with the next
release (`npm run release:major`, see `.github/NPM_SETUP.md`).

## 7. After each release

- Update the changelog page (`docs-src/content/{en,pt}/changelog.html`) with the date of the
  version, bump `updated` in `docs-src/site.mjs` and, for a new major, `SITE.version` and
  `SITE.appliesTo`; `npm run docs:build`.
- Ask a few AI assistants "how to create a Node.js API with clean architecture" and note whether
  QuickNode is cited with the right name, command and version (D8).
