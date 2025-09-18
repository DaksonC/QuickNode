# 🔄 Workflow de Desenvolvimento e Release

## 📋 Estratégia de Branches

```
main     ←── Produção (auto-publish NPM)
  ↑
develop  ←── Desenvolvimento
  ↑
feature/* ←── Features individuais
```

## 🛠️ Fluxo de Desenvolvimento

### 1. 🌟 Nova Feature
```bash
# Criar branch feature
git checkout develop
git pull origin develop
git checkout -b feature/minha-nova-feature

# Desenvolver e commitar
git add .
git commit -m "feat: adicionar nova feature"

# Push e criar PR
git push origin feature/minha-nova-feature
# Criar PR: feature/minha-nova-feature → develop
```

### 2. 🧪 Testing na Develop
```bash
# Merge da feature para develop
git checkout develop
git merge feature/minha-nova-feature
git push origin develop

# CI roda automaticamente:
# ✅ Testes em Node 18, 20, 22
# ✅ Linting e build
# ✅ Teste funcional do CLI
```

### 3. 🚀 Release para Produção

#### Opção A: Script de Release (Recomendado)
```bash
# Na branch develop
npm run release:patch    # 1.0.0 → 1.0.1
npm run release:minor    # 1.0.0 → 1.1.0
npm run release:major    # 1.0.0 → 2.0.0

# Depois merge develop → main
git checkout main
git merge develop
git push origin main
```

#### Opção B: Manual
```bash
# Bump version manualmente
npm version patch
git push origin develop

# Merge para main
git checkout main
git merge develop
git push origin main
```

#### Opção C: Via GitHub (UI)
1. Criar PR: develop → main
2. Review e merge
3. Publicação automática

## 🤖 Automação (GitHub Actions)

### CI Tests (`ci.yml`)
**Triggers:**
- Push em `develop` ou `feature/*`
- PRs para `main` ou `develop`

**Actions:**
- ✅ Testa em Node.js 18, 20, 22
- ✅ Executa `npm test`
- ✅ Executa `npm run lint`
- ✅ Faz build do projeto
- ✅ Testa funcionalidade do CLI

### Publish to NPM (`publish.yml`)
**Triggers:**
- Push para `main`
- Tags `v*`
- GitHub Releases

**Actions:**
- ✅ Executa todos os testes
- ✅ Verifica se versão mudou
- ✅ Publica no NPM (se versão nova)
- ✅ Cria tag Git
- ✅ Cria GitHub Release

## 📊 Monitoramento

### 🔍 Links Úteis
- **GitHub Actions**: https://github.com/daksonfilho/quicknode/actions
- **NPM Package**: https://www.npmjs.com/package/quicknode-cli
- **Releases**: https://github.com/daksonfilho/quicknode/releases

### 📈 Métricas
- Downloads NPM
- GitHub Stars
- Issues/PRs
- Build status

## 🔧 Comandos Úteis

```bash
# Desenvolvimento local
npm run dev                 # Dev server da CLI
npm run build              # Build completo
npm test                   # Rodar testes
npm run lint               # Verificar code style

# Testing local da CLI
node dist/cli.js create test-project --typescript

# Release (apenas develop/main)
npm run release:patch      # Patch release
npm run release:minor      # Minor release  
npm run release:major      # Major release

# Verificar status
git status
npm whoami                 # Verificar login NPM
npm view quicknode-cli     # Ver package no NPM
```

## 🚨 Troubleshooting

### ❌ CI Falhou
```bash
# Verificar logs no GitHub Actions
# Rodar localmente:
npm test
npm run lint
npm run build
```

### ❌ NPM Publish Falhou
```bash
# Verificar se está logado
npm whoami

# Verificar token (GitHub Secrets)
# Settings → Secrets → NPM_TOKEN

# Verificar versão
npm view quicknode-cli version
```

### ❌ Version Conflict
```bash
# Verificar versão atual
node -p "require('./package.json').version"

# Bump manualmente se necessário
npm version patch --no-git-tag-version
```

## ✅ Checklist Release

- [ ] Testes passando
- [ ] Linting OK
- [ ] Build OK
- [ ] Versão bumped
- [ ] CHANGELOG atualizado (se houver)
- [ ] NPM_TOKEN configurado
- [ ] Merge para main
- [ ] Verificar GitHub Actions
- [ ] Confirmar publicação NPM
- [ ] Testar instalação global

Agora o processo está 100% automatizado! 🎉
