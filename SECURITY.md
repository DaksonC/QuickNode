# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | ✅ Security fixes |
| < 2.0   | ❌ Upgrade to 2.x (Node.js 22.13+) |

Only the latest 2.x release receives fixes. Projects that were already generated are
yours to maintain: re-check them with `npm audit` and update their dependencies.

## Reporting a vulnerability

**Do not open a public issue.** Report privately through GitHub:

1. Go to the [Security tab](https://github.com/DaksonC/QuickNode/security) of the repository.
2. Click **Report a vulnerability** ([direct link](https://github.com/DaksonC/QuickNode/security/advisories/new)).
3. Describe the issue, the affected version (`qn --version`), steps to reproduce and the impact.

What to expect:

- Acknowledgement within **3 business days**.
- An assessment and a fix plan within **10 business days**.
- A coordinated release and a GitHub Security Advisory (with CVE when applicable) crediting
  you, unless you prefer to stay anonymous.

## Scope

In scope:

- The `qn` CLI (`@10565/quicknode-cli`): path traversal, overwriting user files, command
  execution, anything that breaks the "safe by default" guarantees of the CLI.
- The project templates: insecure defaults, hard-coded secrets, vulnerable dependency ranges.
- The release pipeline: anything that could let a tarball reach npm without coming from
  this repository.

Out of scope: vulnerabilities in third-party packages of a generated project that already
have a fix available upstream (update them, or open a regular issue so the template range is
raised), and issues that require a compromised local machine.

## How releases are protected

- **Zero runtime dependencies**: installing the CLI installs a single package.
- **No install scripts**: the published package has no `preinstall`, `install` or `postinstall`.
- **Trusted Publishing**: versions are published only by the
  [`publish.yml`](.github/workflows/publish.yml) workflow, from a `v*` tag on `main`, using
  npm OIDC — there is no long-lived npm token.
- **Provenance**: every version carries a signed [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
  attestation that links the tarball to the commit and the workflow run that built it.
- **SBOM**: each GitHub Release has a CycloneDX SBOM attached.
- **CI**: actions pinned by commit SHA, `npm audit`, `npm audit signatures`, CodeQL,
  OpenSSF Scorecard, and an end-to-end run of both templates (install, audit, lint, test).

### Verifying a release

```bash
# In a project that installed the CLI: checks registry signatures and provenance attestations
npm audit signatures

# Inspect the provenance of a specific version
npm view @10565/quicknode-cli@latest dist.attestations --json
```

The npm package page also shows a **Provenance** section linking to the source commit and
the build run.
