# Frequently asked questions

Short answers about installing, running and trusting QuickNode CLI; each heading is a question.

## Which Node.js version do I need?

Node.js 22.13 or newer, for both the CLI and the generated projects. Node 18 and 20 are out of support; on them the CLI prints the required version and exits.

## Can I create a project in a folder that already has files?

Only with `--force`. Without it, `qn create` stops and lists what is in the folder. With it, files with the same name are overwritten (run `--dry-run --force` first to see which), an existing `.env` is always kept, and `.git` is ignored.

## Where do the database password and the JWT secret come from?

`qn create` writes `.env` from `.env.example` with a random `DB_PASSWORD` and `JWT_SECRET` (Node's `crypto.randomBytes`). The file is git-ignored, readable only by you (permission 600), and the secrets are never printed. Docker Compose reads the password from it.

## Does it work offline?

Yes, once the package is installed. Templates ship inside the package; nothing is downloaded while a project is generated. Only `--install` (which runs `npm install`) needs the network.

## Does QuickNode collect any data?

No. There is no telemetry in the CLI and no analytics, cookies or third-party resources on this site.

## Is this the QuickNode blockchain platform?

No. QuickNode CLI (@10565/quicknode-cli) is an open source scaffolding tool for Node.js APIs and has no relation to QuickNode, the blockchain infrastructure provider. Always install it by its full scoped name, `@10565/quicknode-cli`.

## Is it safe to run with npx?

The package has zero runtime dependencies and no install scripts (no `preinstall`, `postinstall` or `prepare`). Versions are published from GitHub Actions with npm provenance, so you can check that a tarball was built from this repository: `npm audit signatures`. External programs run only when you ask for them (`--git`, `--install`), without a shell.

## Will it hang in CI or when an AI agent runs it?

No. Without a terminal it never prompts: pass `--yes` or the flags you need, and add `--json` for a structured result. `qn ui` only prints the link in CI, over SSH and inside containers.

## Can I remove the "Generated with QuickNode" line?

Yes: it is a single line at the end of the generated README. Delete it, or create the project with `--no-credits`. It never appears in code, HTTP headers or API responses.

## Which databases are supported?

PostgreSQL works out of the box, through TypeORM (TypeScript) or Sequelize (JavaScript), with Docker Compose for development. `.env.example` also lists MySQL and SQLite: in the JavaScript template they need only their driver (`npm install mysql2` or `sqlite3`); in the TypeScript template their repositories are not implemented yet.

## How do I report a bug or a vulnerability?

Bugs and ideas: [GitHub issues](https://github.com/DaksonC/QuickNode/issues). Vulnerabilities: privately, as described in [SECURITY.md](https://github.com/DaksonC/QuickNode/blob/main/SECURITY.md).

---

Updated on 2026-11-14 · valid for v3.x · https://daksonc.github.io/QuickNode/faq/

> Answers about QuickNode CLI: required Node.js version, writing into existing folders, generated secrets, offline use, telemetry and the QuickNode name.
