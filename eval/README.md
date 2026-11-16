# Agent evaluation

Real tasks an AI coding agent should finish with QuickNode CLI and no human help (ADR-001, D9).
Each task runs in a new temporary folder, with the CLI packed from this checkout and installed
as `qn`. The report counts:

- **success**: the expected files and contents exist and `qn check` passes (target: 90%);
- **invented flags**: `qn` commands the agent ran that the real parser rejects (target: 0);
- **violations**: dependency rule violations left in the project.

```bash
npm run eval:agents                        # every task in tasks.json
npm run eval:agents -- --task add-auth     # one task (repeat --task for more)
npm run eval:agents -- --model sonnet --keep
```

It uses Claude Code in headless mode (`claude -p`), limited to `qn`, `ls`, `cat` and file edits,
so it needs Claude Code installed and logged in, and it costs tokens: it never runs in CI. Set
`QN_EVAL_AGENT` to use another command that accepts the same flags. Reports are written to
`eval/results/` (git-ignored) as JSON and Markdown.

To add a task, append it to `tasks.json`: `prompt`, optional `setup` (qn commands run first),
`inject` (text prepended to files, e.g. to plant a violation), `cwd`, `project` and `expect`
(`files` that must exist and `contains` per file).
