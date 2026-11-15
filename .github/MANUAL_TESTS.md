# Testes manuais antes de um release

O que os testes automáticos não cobrem. Rode a partir do tarball, como um usuário instalaria:

```bash
npm run build && npm pack --ignore-scripts
mkdir -p /tmp/qn-manual && cd /tmp/qn-manual
npm install -g /caminho/para/10565-quicknode-cli-3.0.0.tgz   # ou: alias qn="node <pasta>/package/dist/cli.js"
```

Antes, os automáticos precisam estar verdes:

- [ ] `npm run verify` (lint, testes com cobertura, `npm audit signatures`, audit)
- [ ] `QN_E2E_DOCKER=1 QN_E2E_TEMPLATES=all npm run test:templates` (8 variantes; sobe a API e chama o CRUD; Postgres via Docker)
- [ ] `npm run docs:check`

## 1. Terminal interativo

- [ ] `qn create` sem argumentos: pergunta nome, template e banco; nome inválido mostra o erro e pergunta de novo.
- [ ] `qn create` e Ctrl+D numa pergunta: sai com `E_ABORTED`, sem deixar pasta pela metade.
- [ ] `qn create minha-api --preset api-minima`: não pergunta nada além do que falta.
- [ ] `qn upgrade` num projeto com algo a atualizar: mostra o plano, pergunta `(y/N)`; Enter ou `n` cancela sem gravar, `y` aplica.
- [ ] Cores: com `NO_COLOR=1` e com saída redirecionada (`| cat`) não há códigos ANSI.
- [ ] `qn --help` mostra o banner só no terminal.

## 2. Projeto gerado rodando de verdade

Para cada banco (`--db postgres`, `sqlite`, `none`), em TypeScript e em JavaScript:

- [ ] `npm install`, `npm run dev` (hot reload: editar um arquivo reinicia o servidor).
- [ ] Postgres: `npm run docker:up`, `npm run db:seed`, Adminer em http://localhost:8080 (só em 127.0.0.1).
- [ ] `curl` no CRUD de `/api/v1/users` (criar, listar, buscar, atualizar, apagar) e em uma feature gerada com `qn g crud product`.
- [ ] Swagger em http://localhost:3000/api-docs.
- [ ] Ctrl+C no servidor encerra limpo (com e sem `qn add graceful-shutdown`).
- [ ] SQLite: o arquivo `database.sqlite` aparece e não entra no git (`git status`).
- [ ] TypeScript: `npm run build && npm start`.
- [ ] `git init && npm install`: os hooks do Husky rodam o lint no commit e o commitlint barra uma mensagem fora do padrão.

## 3. Abrir a documentação

- [ ] `qn ui` abre o navegador (no WSL, via `xdg-open`/`wslview`); `qn ui structure --lang pt` abre a página em português.
- [ ] `qn ui --print` e `qn ui` via SSH ou com saída redirecionada só imprimem o link.

## 4. Agentes de IA

- [ ] `claude mcp add quicknode -- node <pasta>/package/dist/cli.js mcp` e, no Claude Code, pedir: "crie uma API com SQLite e um CRUD de produto". Ele deve planejar (dry run) antes de aplicar.
- [ ] `npm run eval:agents` (bateria em `eval/tasks.json`; nunca rodou): anotar taxa de sucesso, flags inventadas e violações do `qn check`.

## 5. Site de documentação

- [ ] `npm run docs:serve` e conferir as páginas novas: comandos (`env`, `upgrade`, `--db`, `--preset`), estrutura, changelog 3.0.0, agentes.
- [ ] Lighthouse > 95 (SEO = 100) e axe sem erros nas páginas que mudaram, nos dois temas.

## 6. Publicação (só depois do merge na main)

- [ ] O CI rodou verde pelo menos uma vez no GitHub (os workflows nunca rodaram lá).
- [ ] `npm run release:tag` na `main` (o `package.json` já está em 3.0.0; não rode `release:major`).
- [ ] No npm: provenance visível na página do pacote; `npx @10565/quicknode-cli@3 --version` imprime 3.0.0.
- [ ] `npm audit signatures` num projeto que instalou o pacote.
