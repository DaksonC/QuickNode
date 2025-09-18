# 🔐 Configuração do NPM Token para GitHub Actions

Para configurar a publicação automática no NPM, você precisa adicionar seu token NPM como secret no GitHub:

## 1. 🔑 Gerar Token NPM

1. Acesse: https://www.npmjs.com/settings/tokens
2. Clique em "Generate New Token"
3. Escolha "Automation" (recommended)
4. Copie o token gerado

## 2. 📝 Adicionar Secret no GitHub

1. Vá para seu repositório no GitHub
2. Acesse: Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Nome: `NPM_TOKEN`
5. Value: cole o token do NPM
6. Clique em "Add secret"

## 3. ✅ Verificar Configuração

Após configurar o secret, o workflow automaticamente:
- ✅ Executará testes em Node.js 18, 20, 22
- ✅ Fará build do projeto
- ✅ Verificará se a versão mudou
- ✅ Publicará no NPM se a versão for nova
- ✅ Criará uma tag Git
- ✅ Criará um GitHub Release

## 4. 🚀 Fluxo de Release

### Opção 1: Script Automático
```bash
# Bump patch version (1.0.0 → 1.0.1)
npm run release:patch

# Bump minor version (1.0.0 → 1.1.0)
npm run release:minor

# Bump major version (1.0.0 → 2.0.0)
npm run release:major
```

### Opção 2: Manual
```bash
# Bump version
npm version patch|minor|major

# Push para main (triggera CI/CD)
git push origin main
```

### Opção 3: Via GitHub UI
1. Merge PR da develop → main
2. GitHub Actions publican automaticamente

## 5. 📊 Monitoring

Após configurar, você pode monitorar:
- 🔍 **GitHub Actions**: https://github.com/daksonfilho/quicknode/actions
- 📦 **NPM Package**: https://www.npmjs.com/package/quicknode-cli
- 🏷️ **GitHub Releases**: https://github.com/daksonfilho/quicknode/releases

O processo está totalmente automatizado! 🎉
