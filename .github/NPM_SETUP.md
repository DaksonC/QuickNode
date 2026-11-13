# 🔐 Publicação no npm: Trusted Publishing (OIDC)

Desde a v2 (ADR-001, D5) o pacote é publicado **somente** pelo workflow
[`.github/workflows/publish.yml`](workflows/publish.yml), quando é enviada uma tag `v*` que
aponta para um commit da `main`. O npm autentica o workflow por OIDC (Trusted Publishing):
**não existe `NPM_TOKEN`** e toda versão sai com atestado de provenance.

Os passos abaixo são feitos uma única vez, pelo dono do pacote.

## 1. npmjs.com: conta

1. **Account → Two-Factor Authentication**: ativar 2FA com app autenticador ou chave de
   segurança, no modo **Authorization and writes**.
2. **Access Tokens**: revogar qualquer token clássico/automation usado para publicar
   (inclusive o que está como `NPM_TOKEN` no GitHub).

## 2. npmjs.com: Trusted Publisher

Na [página de configurações do pacote](https://www.npmjs.com/package/@10565/quicknode-cli/access):

1. **Trusted Publisher → GitHub Actions**, com:
   | Campo | Valor |
   | --- | --- |
   | Organization or user | `DaksonC` |
   | Repository | `QuickNode` |
   | Workflow filename | `publish.yml` |
   | Environment name | `npm` |
2. **Publishing access**: escolher **Require two-factor authentication and disallow tokens**.
   O Trusted Publishing continua funcionando; um token vazado deixa de funcionar.

## 3. GitHub: repositório

1. **Settings → Secrets and variables → Actions**: apagar o secret `NPM_TOKEN`.
2. **Settings → Environments → New environment** `npm` (o workflow cria no primeiro uso se
   não existir). Recomendado: **Deployment branches and tags → Selected** com a regra de tag
   `v*` e você como **Required reviewer**, para aprovar manualmente cada publicação.
3. **Settings → Advanced Security** (ou *Code security*): ativar **Private vulnerability
   reporting**, **Dependabot alerts**, **Dependabot security updates** e **CodeQL** (o
   `codeql.yml` é o *advanced setup*, então deixe o *default setup* desligado).
4. **Settings → Rules → Rulesets** (recomendado, também melhora o Scorecard):
   - Branch `main`: exigir PR, exigir os checks do `CI Tests`, bloquear force push e exclusão.
   - Tag `v*`: criação só por admins, bloquear atualização e exclusão.

## 4. Publicar uma versão

```bash
git checkout main && git pull --ff-only
npm run release:patch   # ou release:minor / release:major / release:prerelease
```

O script faz o bump, cria a tag anotada `vX.Y.Z` e envia as duas coisas. O workflow então:

1. confere se a tag é igual à versão do `package.json` e se aponta para a `main`;
2. roda `npm ci`, `npm audit signatures`, lint, testes com cobertura e `npm audit`;
3. publica com `npm publish --provenance` (prerelease vai para a dist-tag `next`);
4. cria o GitHub Release com notas geradas e a SBOM CycloneDX anexada.

Se o bump foi feito na `develop`, depois do merge na `main` basta criar a tag:

```bash
git checkout main && git pull --ff-only
git tag -a v2.1.0 -m "Release v2.1.0" && git push origin v2.1.0
```

## 5. Verificar

- A página do pacote no npm mostra a seção **Provenance**, com o commit e a execução do CI.
- `npm view @10565/quicknode-cli@latest dist.attestations --json`
- Em qualquer projeto que instalou a CLI: `npm audit signatures`

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| `404`/`ENEEDAUTH` no `npm publish` | Campos do Trusted Publisher diferentes do workflow (nome do arquivo, environment `npm`, maiúsculas em owner/repo). |
| `npm >= 11.5.1 is required` | O job de publicação precisa rodar em Node 24 (que traz o npm 11). |
| `Tag … does not match package.json` | Tag criada sem bump; apague a tag, faça o bump e crie de novo. |
| `points to a commit that is not on main` | Tag criada em outra branch; só tags da `main` são publicadas. |
