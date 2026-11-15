# Receitas do qn add

Para adicionar uma ferramenta a um projeto QuickNode existente, rode `qn add <receita>` dentro dele, por exemplo `qn add docker`: a receita grava os arquivos, mescla o `package.json` e liga o código, e rodar de novo não muda nada.

## Como ele se comporta?

1. Veja antes: `qn add auth rate-limit --dry-run` mostra o diff unificado de cada arquivo que seria criado ou alterado, sem gravar nada.
2. Aplique: `qn add auth rate-limit`. Dá para passar várias receitas de uma vez.
3. Instale o que mudou: a saída avisa quando o `package.json` ganhou dependências novas (`npm install`).

- Idempotente: uma receita já aplicada aparece como `already in place, nothing to do`.
- Não destrutivo: um arquivo que você alterou não é sobrescrito sem `--force`, e um valor do `package.json` que você mudou é mantido (a saída avisa).
- O código entra antes dos comentários-marcadores do template, como `// qn:middleware`. Se você apagou um marcador, a saída mostra as linhas para colar à mão.
- As receitas são dados dentro do pacote da CLI: nenhum download durante a execução, e nenhuma dependência nova no seu projeto para `auth` e `rate-limit`, que usam só APIs do Node.js.
- Funciona sem perguntas, também com `--json`, no CI e para agentes de IA.

## Quais receitas existem?

- **auth**: Autenticação JWT (HS256) escrita com `node:crypto`: `signToken`, `verifyToken` e um middleware `authenticate()`; o segredo vem do `JWT_SECRET` no `.env` e segredos fracos são recusados. Com testes.
- **healthcheck**: Rotas de saúde (`/health/live`) e de prontidão (`/health/ready`, 503 quando o banco não responde), ligadas no servidor.
- **rate-limit**: Limite de requisições por cliente e janela de tempo, em memória, com os cabeçalhos `RateLimit-*` e `Retry-After`; `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW_MS` no `.env`.
- **graceful-shutdown**: No SIGTERM/SIGINT: para de aceitar conexões, termina as requisições em andamento e fecha o banco, com tempo limite (`SHUTDOWN_TIMEOUT_MS`).
- **docker**: `Dockerfile` em etapas que instala só as dependências de produção e roda com o usuário sem privilégios `node`, com healthcheck; `npm run docker:build`.
- **ci (também github-actions)**: Workflow do GitHub Actions com lint, testes, build, `qn check` e `npm audit`, com as actions fixadas por SHA de commit.
- **agents**: `AGENTS.md` e a cópia `CLAUDE.md`, que explicam aos assistentes de código com IA as camadas, a regra de dependência e os comandos a rodar.
- **eslint, husky, swagger, tests**: Já vêm em todo projeto novo; as receitas os devolvem a um projeto de onde foram removidos, com os arquivos e versões do template.

As receitas seguem o gerenciador de pacotes do projeto (npm, pnpm ou yarn) e o executor de testes (Jest ou `node:test`). Próximo: a [referência de comandos](https://daksonc.github.io/QuickNode/pt/commands/#add) e [como adicionar uma funcionalidade com o qn generate](https://daksonc.github.io/QuickNode/pt/tutorial/).

---

Atualizado em 2026-11-14 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/add/

> Receitas do qn add para projetos QuickNode: autenticação JWT, healthcheck, rate limit, encerramento gracioso, Docker, GitHub Actions e instruções para agentes de IA, idempotentes e com --dry-run.
