# Getting started

To start a Node.js API with clean architecture, run `npx @10565/quicknode-cli create my-api` with Node.js 22.13 or newer, then `npm install`, `npm run docker:up` and `npm run dev`.

## What do I need?

- Node.js 22.13 or newer (check with `node --version`). Older versions get a clear error instead of a crash.
- Docker with Docker Compose, for the PostgreSQL database of the generated project (or a PostgreSQL server of your own, set in `.env`). Not needed with `--db sqlite` (`node:sqlite`, built into Node.js) or `--db none` (in-memory repositories).
- Git, only if you want `--git` to initialize a repository.

## How do I create my first API?

1. Preview what will be created. Nothing is written:
   
   ```
   $ npx @10565/quicknode-cli create my-api --typescript --dry-run
   ```
2. Create the project. Use `--javascript` for the JavaScript template, or leave the flag out to be asked:
   
   ```
   $ npx @10565/quicknode-cli create my-api --typescript --git
   ```
3. Install the project's dependencies:
   
   ```
   $ cd my-api
   $ npm install
   ```
4. Start PostgreSQL. It listens only on 127.0.0.1 and uses the random password written to `.env`:
   
   ```
   $ npm run docker:up
   ```
5. Run the API with hot reload and open `http://localhost:3000/api-docs` for the Swagger UI:
   
   ```
   $ npm run dev
   ```

## Can I install it globally?

Yes. A global install gives you the short `qn` command:

```
$ npm install -g @10565/quicknode-cli
$ qn create my-api -ts
```

## How do I run it in CI or from a script?

Pass every choice as a flag. Without a terminal, the CLI never asks questions: it uses `--yes` defaults or fails with the flag that is missing. `--json` prints a machine-readable result.

```
$ npx @10565/quicknode-cli create my-api --yes --json
```

## What should I read next?

- [Project structure](https://daksonc.github.io/QuickNode/structure/): what each folder does.
- [Add an entity and a use case](https://daksonc.github.io/QuickNode/tutorial/).
- [Every flag of qn create](https://daksonc.github.io/QuickNode/commands/#create).

---

Updated on 2026-11-14 · valid for v3.x · https://daksonc.github.io/QuickNode/start/

> Install nothing: run npx @10565/quicknode-cli create my-api, start PostgreSQL with Docker and run the API. Step-by-step guide for Node.js 22.13+.
