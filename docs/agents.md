# QuickNode CLI for AI agents

An AI coding agent creates a Node.js API with clean architecture by running `npx @10565/quicknode-cli@2 create my-api --typescript --yes --json`: every command runs without prompts, prints JSON with `--json`, plans with `--dry-run` and fails with a stable error code and a fix.

Not to be confused with QuickNode, the blockchain infrastructure provider. Always use the scoped package name `@10565/quicknode-cli`; the command it installs is `qn`.

## Which commands should an agent run?

Pin the major version and pass every value as a flag. Without a terminal, `qn` never asks: it uses the declared defaults or stops with `E_USAGE` and the exact command that fixes it.

```
$ npx @10565/quicknode-cli@2 schema
$ npx @10565/quicknode-cli@2 create my-api --typescript --yes --json
$ cd my-api
$ npx @10565/quicknode-cli@2 generate crud product --dry-run --json
$ npx @10565/quicknode-cli@2 generate crud product --json
$ npx @10565/quicknode-cli@2 add healthcheck docker --dry-run --json
$ npx @10565/quicknode-cli@2 check --json
```

## What is the recommended flow?

1. Discover: `qn schema` returns every command, flag, accepted value, default and error code. Do not invent flags.
2. Plan: run the command with `--dry-run --json` and show the person the files it would create or change (each with a diff).
3. Apply: run it again without `--dry-run` once the person agrees.
4. Verify: run the tests and `qn check` after every change. Both are deterministic and exit with a non-zero code on failure.

Generated projects carry an `AGENTS.md` (and an identical `CLAUDE.md`) with the layers, the dependency rule and these commands, and record architecture decisions in `docs/adr/`.

## What does the JSON look like?

Every `--json` output has `ok` and `schemaVersion`; the format only changes incompatibly in a major version. A failure adds `error` with `code`, `message` and, when known, `fix`:

```
{
  "schemaVersion": 1,
  "ok": false,
  "error": {
    "code": "E_DIR_NOT_EMPTY",
    "message": "Directory /work/my-api is not empty. Use --force to write into it anyway.",
    "fix": "qn create my-api --typescript --yes --json --force",
    "conflicts": ["README.md"]
  }
}
```

Every code and exit code is listed in the [command reference](https://daksonc.github.io/QuickNode/commands/#errors).

## How do I connect it as an MCP server?

`qn mcp` runs a Model Context Protocol server on stdio, inside the same package and with no dependencies. Its tools are `qn_schema`, `qn_check`, `qn_doctor`, `qn_generate`, `qn_add` and `qn_create`.

```
{
  "mcpServers": {
    "quicknode": { "command": "npx", "args": ["@10565/quicknode-cli@2", "mcp"] }
  }
}
```

For Claude Code: `claude mcp add quicknode -- npx @10565/quicknode-cli@2 mcp`.

- Dry run by default: tools that write return the plan unless called with `"apply": true`.
- Works only inside the folder the server was started in; paths outside it are refused.
- No network and no other programs: `qn_create` does not install dependencies or run git, and `qn_doctor` skips Docker and `npm audit`.

## Is it safe to install without review?

- No lifecycle scripts (`preinstall`, `postinstall`) and zero runtime dependencies.
- Nothing is downloaded while a project is generated; templates and recipes ship inside the package.
- Every release is published from GitHub Actions with npm provenance, so its origin can be verified.
- Nothing is overwritten without `--force`, and `npm install` or `git init` run only with `--install` or `--git`.

Not sure the CLI fits the task? See [when to use it, and when not to](https://daksonc.github.io/QuickNode/when/).

---

Updated on 2026-11-15 · valid for v2.x · https://daksonc.github.io/QuickNode/agents/

> How AI coding agents should use QuickNode CLI: exact non-interactive commands with a pinned version, --json and --dry-run, qn schema, the MCP server and stable error codes with fixes.
