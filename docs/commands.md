# Command reference

QuickNode CLI creates a project with `qn create`, grows it with `qn generate` and `qn add`, checks it with `qn check` and `qn doctor`, describes itself with `qn schema`, serves AI assistants with `qn mcp` and opens this documentation with `qn ui`; run `qn help <command>` for the same reference offline.

This page is generated from the definition the CLI parses (`src/spec.ts`), so it always matches the installed version.

## qn create

Create a new project with clean architecture.

### Usage

```
$ qn create [name] [options]
```

### Argument

- **`[name]`**: Project folder and package name ("." for the current directory)

### Options

- **`-t, --typescript`**: Use the TypeScript template (also -ts)
- **`-j, --javascript`**: Use the JavaScript template (also -js)
- **`-f, --force`**: Write into a non-empty directory, overwriting conflicting files
- **`-y, --yes`**: Accept defaults without prompting (name, TypeScript)
- **`--dry-run`**: Show what would be created without writing anything
- **`--install`**: Run npm install after creating the project
- **`--git`**: Initialize a git repository
- **`--no-credits`**: Leave the "Generated with QuickNode" line out of the README
- **`--pm <npm|pnpm|yarn>`**: Package manager used in scripts, docs and --install (default: npm)
- **`--test <jest|node>`**: Test runner (default: jest; node uses the built-in node:test)

### Examples

```
$ qn create my-api
$ qn create my-api -ts --git --install
$ qn create my-api --pm pnpm --test node
$ qn create . --javascript --force
$ qn create my-api --dry-run
$ qn create my-api --yes --json
```

Same text as `qn help create`

```
$ qn help create
qn create [name] [options]

Create a new project with clean architecture

Arguments:
  name  Project folder and package name ("." for the current directory)

Options:
  -t, --typescript          Use the TypeScript template (also -ts)
  -j, --javascript          Use the JavaScript template (also -js)
  -f, --force               Write into a non-empty directory, overwriting conflicting files
  -y, --yes                 Accept defaults without prompting (name, TypeScript)
      --dry-run             Show what would be created without writing anything
      --install             Run npm install after creating the project
      --git                 Initialize a git repository
      --no-credits          Leave the "Generated with QuickNode" line out of the README
      --pm <npm|pnpm|yarn>  Package manager used in scripts, docs and --install (default: npm)
      --test <jest|node>    Test runner (default: jest; node uses the built-in node:test)
  -h, --help                Show help
  -v, --version             Show the version
      --json                Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn create my-api
  qn create my-api -ts --git --install
  qn create my-api --pm pnpm --test node
  qn create . --javascript --force
  qn create my-api --dry-run
  qn create my-api --yes --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn generate

Generate a feature in the clean architecture layers, already wired.

### Usage

```
$ qn generate <type> <name> [options]
```

Alias: `qn g`

### Arguments

- **`[type]`**: What to generate (crud = all the parts) (accepted values: `crud`, `entity`, `usecase`, `repository`, `controller`)
- **`[name]`**: Feature name, e.g. product or order-item

### Options

- **`--only <parts>`**: With crud, generate only these parts (comma-separated: entity, repository, usecase, controller)
- **`--no-test`**: Do not generate the use case test
- **`--dry-run`**: Show the files to create or change without writing anything
- **`-f, --force`**: Overwrite existing files with different content

### Examples

```
$ qn generate crud product
$ qn g crud order-item --dry-run
$ qn g crud product --only entity,repository
$ qn g usecase product --no-test
$ qn g crud product --json
```

Same text as `qn help generate`

```
$ qn help generate
qn generate <type> <name> [options]

Generate a feature in the clean architecture layers, already wired (alias: qn g)

Arguments:
  type  What to generate (crud = all the parts) (crud, entity, usecase, repository, controller)
  name  Feature name, e.g. product or order-item

Options:
      --only <parts>  With crud, generate only these parts (comma-separated: entity, repository, usecase, controller)
      --no-test       Do not generate the use case test
      --dry-run       Show the files to create or change without writing anything
  -f, --force         Overwrite existing files with different content
  -h, --help          Show help
  -v, --version       Show the version
      --json          Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn generate crud product
  qn g crud order-item --dry-run
  qn g crud product --only entity,repository
  qn g usecase product --no-test
  qn g crud product --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn check

Check the dependency rule: domain must not import infrastructure, frameworks or ORMs.

### Usage

```
$ qn check [options]
```

### Examples

```
$ qn check
$ qn check --json
```

Same text as `qn help check`

```
$ qn help check
qn check [options]

Check the dependency rule: domain must not import infrastructure, frameworks or ORMs

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn check
  qn check --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn add

Add a tool to an existing project (idempotent).

### Usage

```
$ qn add <recipe...> [options]
```

### Argument

- **`[recipe...]`**: Recipes to apply (accepted values: `agents`, `auth`, `ci`, `docker`, `eslint`, `github-actions`, `graceful-shutdown`, `healthcheck`, `husky`, `rate-limit`, `swagger`, `tests`)

### Options

- **`--dry-run`**: Show the diff without writing anything
- **`-f, --force`**: Overwrite existing files with different content

### Examples

```
$ qn add docker
$ qn add auth rate-limit --dry-run
$ qn add ci --json
$ qn add agents
```

Same text as `qn help add`

```
$ qn help add
qn add <recipe...> [options]

Add a tool to an existing project (idempotent)

Arguments:
  recipe...  Recipes to apply (agents, auth, ci, docker, eslint, github-actions, graceful-shutdown, healthcheck, husky, rate-limit, swagger, tests)

Options:
      --dry-run  Show the diff without writing anything
  -f, --force    Overwrite existing files with different content
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn add docker
  qn add auth rate-limit --dry-run
  qn add ci --json
  qn add agents

Docs: https://daksonc.github.io/QuickNode/
```

## qn doctor

Check Node.js, .env, Docker, vulnerabilities and the dependency rule.

### Usage

```
$ qn doctor [options]
```

### Options

- **`--offline`**: Skip npm audit (no network)

### Examples

```
$ qn doctor
$ qn doctor --offline
$ qn doctor --json
```

Same text as `qn help doctor`

```
$ qn help doctor
qn doctor [options]

Check Node.js, .env, Docker, vulnerabilities and the dependency rule

Options:
      --offline  Skip npm audit (no network)
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn doctor
  qn doctor --offline
  qn doctor --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn schema

Print the full specification of commands, flags, values and error codes as JSON.

### Usage

```
$ qn schema
```

### Examples

```
$ qn schema
$ qn --help --json
$ qn help generate --json
```

Same text as `qn help schema`

```
$ qn help schema
qn schema

Print the full specification of commands, flags, values and error codes as JSON

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn schema
  qn --help --json
  qn help generate --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn mcp

Run a Model Context Protocol server on stdio for AI assistants (dry run by default).

### Usage

```
$ qn mcp
```

### Examples

```
$ qn mcp
$ npx @10565/quicknode-cli@2 mcp
```

Same text as `qn help mcp`

```
$ qn help mcp
qn mcp

Run a Model Context Protocol server on stdio for AI assistants (dry run by default)

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn mcp
  npx @10565/quicknode-cli@2 mcp

Docs: https://daksonc.github.io/QuickNode/
```

## qn ui

Open the documentation in the browser.

### Usage

```
$ qn ui [topic] [options]
```

Alias: `qn docs`

### Argument

- **`[topic]`**: Page to open (accepted values: `start`, `commands`, `create`, `ui`, `structure`, `tutorial`, `generate`, `agents`, `when`, `errors`, `check`, `add`, `doctor`, `faq`, `compare`, `changelog`, `adr`)

### Options

- **`-p, --print`**: Only print the link, do not open the browser
- **`--lang <en|pt>`**: Language of the page (default: from LANG)

### Examples

```
$ qn ui
$ qn docs create
$ qn ui structure --lang pt
$ qn ui faq --print
```

Same text as `qn help ui`

```
$ qn help ui
qn ui [topic] [options]

Open the documentation in the browser (alias: qn docs)

Arguments:
  topic  Page to open (start, commands, create, ui, structure, tutorial, generate, agents, when, errors, check, add, doctor, faq, compare, changelog, adr)

Options:
  -p, --print         Only print the link, do not open the browser
      --lang <en|pt>  Language of the page (default: from LANG)
  -h, --help          Show help
  -v, --version       Show the version
      --json          Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn ui
  qn docs create
  qn ui structure --lang pt
  qn ui faq --print

Docs: https://daksonc.github.io/QuickNode/
```

## Global options

Accepted by every command.

- **`-h, --help`**: Show help
- **`-v, --version`**: Show the version
- **`--json`**: Print a JSON result to stdout (no prompts, no colors)

## Exit codes

- **`0`**: success
- **`1`**: the command failed (for example, the target folder is not empty, or qn check found violations)
- **`2`**: invalid usage: unknown command, flag or value

## Error codes

Every error has a stable code, a short message and, when known, a fix. With --json it goes to stdout as below; without it, to stderr with a "Fix:" line. Codes never change within a major version.

```
$ qn create my-api --json
{
  "schemaVersion": 1,
  "ok": false,
  "error": {
    "code": "E_USAGE",
    "message": "Choose a template with --typescript or --javascript (or pass --yes).",
    "fix": "qn create my-api --typescript"
  }
}
```

- **`E_USAGE` (exit 2)**: Invalid usage: unknown command, flag or value, or a missing argument
- **`E_DIR_NOT_EMPTY` (exit 1)**: qn create: the target folder is not empty (use --force to write into it)
- **`E_PATH_BLOCKED` (exit 1)**: qn create: a project path is taken by a file or folder of another type
- **`E_FILES_EXIST` (exit 1)**: qn generate / qn add: files exist with other content (use --force to overwrite)
- **`E_NOT_A_PROJECT` (exit 1)**: The command must run inside a project created with qn create
- **`E_ABORTED` (exit 1)**: An interactive prompt was cancelled
- **`E_INTERNAL` (exit 1)**: Unexpected error (rerun with DEBUG=1 and report it)

---

Updated on 2026-11-15 · valid for v2.x · https://daksonc.github.io/QuickNode/commands/

> Every QuickNode CLI command and flag, generated from the same definition the CLI parses: qn create, generate, check, add, doctor, schema, mcp, ui, --dry-run, --json, exit and error codes.
