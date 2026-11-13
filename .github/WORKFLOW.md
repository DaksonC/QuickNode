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
npm run lint
npm run test:coverage                         # build + testes, cobertura >= 80%
QN_E2E_TEMPLATES=all npm run test:templates   # gera os dois templates e roda install, audit, lint, test e build
```

### 3. 🚀 Release

Só uma tag `v*` na `main` publica. Detalhes e configuração única em [NPM_SETUP.md](NPM_SETUP.md).

```bash
# Opção A (recomendada): na main
git checkout main && git pull --ff-only
npm run release:minor     # bump + commit + tag vX.Y.Z + push → publica

# Opção B: bump na develop, tag depois do merge
npm run release:minor     # na develop: bump + commit + push
# PR develop → main, merge, e então:
git checkout main && git pull --ff-only
git tag -a v2.1.0 -m "Release v2.1.0" && git push origin v2.1.0
```

## 🤖 Automação (GitHub Actions)

Todas as actions são fixadas por SHA de commit (o Dependabot mantém atualizadas) e cada
workflow pede só as permissões de que precisa.

### CI Tests (`ci.yml`)
**Gatilhos:** push em `main`, `develop`, `feature/*`; PRs para `main` e `develop`.

- Node 22 e 24: `npm ci`, `npm audit signatures`, lint, testes com cobertura >= 80%
- Zero dependências de runtime, `npm audit` e orçamento de tamanho do pacote (300 KB)
- `generated-project`: `npm run test:templates` para TypeScript e JavaScript

### Publish to NPM (`publish.yml`)
**Gatilho:** push de tag `v*`.

- `verify`: tag = versão do `package.json`, tag na `main`, lint, testes, audits
- `publish`: Trusted Publishing (OIDC) com `--provenance`, environment `npm`
- `release`: GitHub Release com notas geradas e SBOM CycloneDX

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
- [ ] Versão com bump e tag `vX.Y.Z` na `main`
- [ ] Workflow `Publish to NPM` verde
- [ ] Provenance visível na página do npm
- [ ] GitHub Release criado com a SBOM
- [ ] `npx @10565/quicknode-cli@latest --version` mostra a versão nova
