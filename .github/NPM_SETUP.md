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

A `main` só muda por PR, então a release tem dois passos. Os dois rodam `npm run verify`
(lint, testes com cobertura >= 80%, `npm audit signatures` e `npm audit`), as mesmas
checagens do job `verify` do workflow: uma tag que passou localmente não fica "queimada"
por falhar no CI.

```bash
# 1. Na develop: bump + commit + push, depois PR develop → main
git checkout develop && npm run release:minor   # ou release:patch / release:major / release:prerelease

# 2. Depois do merge, na main: cria e envia a tag vX.Y.Z da versão atual
git checkout main && npm run release:tag
```

> ⚠️ **Primeira release da v2:** o `package.json` ainda está em `1.1.0`, mas o código já é a
> v2 (Node 22.13+, quebra de compatibilidade). A primeira release depois do merge das fases
> do ADR-001 precisa ser `npm run release:major` (→ `2.0.0`); `minor`/`patch` publicariam a
> quebra como `1.x` para quem usa `^1.1.0`.

O push da tag dispara o workflow, que:

1. confere se a tag é igual à versão do `package.json` e se aponta para a `main`;
2. roda `npm ci --ignore-scripts` e `npm run verify`, e empacota esse build com `npm pack`;
3. publica **esse mesmo tarball** com `npm publish --provenance`, num job sem checkout e sem
   `npm install` (nada da árvore de dependências roda enquanto existe o token OIDC);
   prerelease vai para a dist-tag `next`;
4. cria o GitHub Release com notas geradas, o tarball e a SBOM CycloneDX anexados.

## 5. Verificar

- A página do pacote no npm mostra a seção **Provenance**, com o commit e a execução do CI.
- `npm view @10565/quicknode-cli@latest dist.attestations --json`
- Em qualquer projeto que instalou a CLI: `npm audit signatures`

## 6. Reservar nomes próximos (ADR-001, D9)

LLMs às vezes sugerem nomes sem escopo ou parecidos. Para que ninguém publique um pacote
malicioso com esses nomes (typosquatting), reserve-os na sua conta, uma única vez:

| Nome | Uso |
| --- | --- |
| `create-quicknode` | `npm create quicknode` → repassa para `@10565/quicknode-cli create` (ADR, seção 4: "a avaliar") |
| `quicknode-cli` | sem escopo; só aponta para o pacote com escopo |

Os dois estavam livres em 15/11/2026 (`npm view <nome>` devolvia 404). Para cada um:

1. Crie uma pasta só com um `package.json` mínimo (`name`, `version: 0.0.1`, `description:
   "Use @10565/quicknode-cli"`, `repository`) e um `README.md` que manda instalar
   `@10565/quicknode-cli`.
2. Publique uma vez com `npm publish --access public` (2FA pedido pelo npm).
3. Marque como obsoleto, para quem instalar ver o nome certo:
   `npm deprecate <nome> "Use @10565/quicknode-cli (npx @10565/quicknode-cli create my-api)"`.

`quicknode` e `qn-cli` já existem no npm e são de terceiros: a documentação e o `llms.txt`
sempre usam o nome com escopo. Os pacotes reservados não têm código nem scripts, e não entram
no Trusted Publishing.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| `404`/`ENEEDAUTH` no `npm publish` | Campos do Trusted Publisher diferentes do workflow (nome do arquivo, environment `npm`, maiúsculas em owner/repo). |
| `npm >= 11.5.1 is required` | O job de publicação precisa rodar em Node 24 (que traz o npm 11). |
| `Tag … does not match package.json` | Tag criada à mão sem bump. Use `npm run release:tag`, que sempre usa a versão do `package.json`. |
| `Tag vX.Y.Z already exists` (release:tag) | A versão já foi publicada (ou tentada); faça um novo bump na `develop`. |
| `points to a commit that is not on main` | Tag criada em outra branch; só tags da `main` são publicadas. |
