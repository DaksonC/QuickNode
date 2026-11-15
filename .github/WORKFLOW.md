# 🔄 Workflow de Desenvolvimento e Release

## 📋 Estratégia de Branches

```
main      ←── Produção (tags v* publicam no npm)
  ↑
develop   ←── Desenvolvimento
  ↑
feature/* ←── Features individuais
```

## 🛠️ Fluxo de Desenvolvimento

### 1. 🌟 Nova Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/minha-nova-feature

git add .
git commit -m "feat: adicionar nova feature"

git push origin feature/minha-nova-feature
# Criar PR: feature/minha-nova-feature → develop
```

### 2. 🧪 Antes de abrir o PR
```bash
npm run verify                                # lint, build + testes (cobertura >= 80%), audits
QN_E2E_TEMPLATES=all npm run test:templates   # gera os dois templates e roda install, audit, lint, test e build
```

### 3. 🚀 Release

Só uma tag `v*` na `main` publica. Detalhes e configuração única em [NPM_SETUP.md](NPM_SETUP.md).

```bash
# 1. Na develop: checagens (npm run verify) + bump + commit + push
git checkout develop && npm run release:minor   # patch / minor / major / prerelease
# PR develop → main e merge

# 2. Na main: checagens + tag vX.Y.Z da versão atual + push da tag → publica
git checkout main && npm run release:tag
```

> ⚠️ O `package.json` já está em `3.0.0` (primeira release depois da 1.1.1; a 2.0.0 nunca foi publicada): a primeira release é só `npm run release:tag` na `main`, sem bump.

## 🤖 Automação (GitHub Actions)

Todas as actions são fixadas por SHA de commit (o Dependabot mantém atualizadas) e cada
workflow pede só as permissões de que precisa.

### CI Tests (`ci.yml`)
**Gatilhos:** push em `main` e `develop`; PRs para `main`, `develop` e `feature/*` (PRs empilhados).
Runs de PR substituídos são cancelados; cada commit de `main`/`develop` mantém o próprio resultado.

- Node 22 e 24: `npm ci`, `npm audit signatures`, lint, testes com cobertura >= 80%
- Zero dependências de runtime, `npm audit` e orçamento de tamanho do pacote (300 KB)
- `generated-project`: `npm run test:templates` para TypeScript e JavaScript

### Publish to NPM (`publish.yml`)
**Gatilho:** push de tag `v*`.

- `verify`: tag = versão do `package.json`, tag na `main`, `npm run verify` e `npm pack`
- `publish`: publica o tarball testado com Trusted Publishing (OIDC) e `--provenance`,
  environment `npm`, sem checkout e sem `npm install`
- `release`: GitHub Release com notas geradas, tarball e SBOM CycloneDX

### CodeQL (`codeql.yml`) e OpenSSF Scorecard (`scorecard.yml`)
Análise estática do código e dos workflows, e nota de supply chain; resultados na aba
**Security → Code scanning**. Rodam em push/PR e semanalmente.

### Dependabot (`dependabot.yml`)
Semanal: dependências de desenvolvimento da CLI, dependências dos dois templates
(`templates/typescript`, `templates/javascript`) e GitHub Actions. O CI valida cada PR
gerando os templates.

## 🔧 Comandos Úteis

```bash
npm run dev                 # tsc --watch
npm run build               # Build
npm test                    # Build + testes
npm run lint                # Lint

node dist/cli.js create test-project --typescript   # Testar a CLI localmente

npm view @10565/quicknode-cli version               # Versão publicada
npm view @10565/quicknode-cli@latest dist.attestations --json   # Provenance
```

## 🚨 Troubleshooting

### ❌ CI falhou
```bash
npm run lint
npm run test:coverage
QN_E2E_TEMPLATES=typescript npm run test:templates
```

### ❌ Publicação falhou
Veja a tabela de problemas comuns em [NPM_SETUP.md](NPM_SETUP.md#problemas-comuns).

## ✅ Checklist de Release

- [ ] CI verde na `main`
- [ ] `QN_E2E_TEMPLATES=all npm run test:templates` passando
- [ ] Bump feito na `develop` (`npm run release:<tipo>`) e PR mergeado na `main`
- [ ] `npm run release:tag` na `main`
- [ ] Workflow `Publish to NPM` verde
- [ ] Provenance visível na página do npm
- [ ] GitHub Release criado com a SBOM
- [ ] `npx @10565/quicknode-cli@latest --version` mostra a versão nova
