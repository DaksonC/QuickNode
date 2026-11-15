# Changelog

A versão 2.0.0 reescreve o QuickNode CLI sem dependências de runtime, torna o `qn create` seguro por padrão, publica com provenance e traz o `qn generate`, o `qn check`, o `qn add`, o `qn doctor`, o `qn ui` e este site; ela exige Node.js 22.13+.

As versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/). As notas de versão com a procedência do build ficam nas [Releases do GitHub](https://github.com/DaksonC/QuickNode/releases).

## 2.0.0 // em breve

### Mudanças incompatíveis

- Exige Node.js 22.13 ou mais novo, na CLI e nos projetos gerados.
- Sem terminal, o `qn create` não pergunta mais: passe o nome e `--typescript`/`--javascript`, ou `--yes`.
- Uma pasta de destino não vazia é recusada, a menos que se passe `--force`.

### Adicionado

- `qn generate <tipo> <nome>` (apelido `qn g`): entidade, repositório, casos de uso com teste, controller e rota de uma funcionalidade nas camadas certas, já ligados; `--only`, `--no-test`, `--dry-run`.
- `qn check`: falha quando `src/domain` importa infrastructure, Express, um ORM ou outro pacote; saída legível ou `--json`, código de saída 1 para o CI.
- `qn add <receita>`: auth (JWT com `node:crypto`), healthcheck, rate-limit, graceful-shutdown, docker, ci, agents, eslint, husky, swagger e tests, idempotentes, com `--dry-run` mostrando o diff.
- `qn doctor`: verifica Node.js, `.env`, Docker, `npm audit` e a regra de dependência.
- `AGENTS.md` e `CLAUDE.md` nos projetos novos, para assistentes de código com IA; script `npm run check`; `docs/adr/` com um modelo para as decisões de arquitetura.
- Para agentes de IA: `qn schema` (também `qn --help --json`) com a especificação completa; códigos de erro estáveis (`E_USAGE`, `E_DIR_NOT_EMPTY`…) com `fix`; `schemaVersion` em toda saída JSON; `qn mcp`, um servidor MCP no stdio que só planeja por padrão; `llms.txt`, `llms-full.txt` e cada página em Markdown.
- `--dry-run`, `--yes`, `--force`, `--json`, `--git`, `--install`, `--no-credits`, `--pm npm|pnpm|yarn` e `--test jest|node` no `qn create`.
- `qn ui [tópico]` (apelido `qn docs`) abre esta documentação; `qn help <comando>` com exemplos.
- `DB_PASSWORD` e `JWT_SECRET` aleatórios num `.env` ignorado pelo git.
- Site de documentação bilíngue, com a referência de comandos gerada a partir da CLI.
- Publicação pelo GitHub Actions com provenance do npm e SBOM; `SECURITY.md`.

### Alterado

- Zero dependências de runtime: chalk, commander, figlet, fs-extra, inquirer e ora trocados por APIs do Node.js (de 56 pacotes instalados para 1).
- Templates sem lockfiles congelados e com dependências atualizadas: 0 vulnerabilidades altas ou críticas na data da versão; ESLint 10, Husky 9, Postgres preso a 127.0.0.1.
- Pacote publicado de 1,6 MB para menos de 300 KB.
- Projetos gerados: cada funcionalidade é ligada em `infrastructure/modules`; os DTOs do TypeScript saíram do domínio para `infrastructure/http/dtos`; os testes usam repositórios em memória e `node:assert`, então rodam no Jest e no `node:test`.

### Corrigido

- Arquivos existentes (como o seu README) eram sobrescritos sem aviso.
- Nomes como `../escaped` criavam o projeto fora da pasta atual.

## 1.1.1 // 2025-09-28

- Informação de financiamento no npm; `.gitignore` incluído nos projetos novos.

## 1.1.0 // 2025-09-28

- Templates independentes de banco com TypeORM (TypeScript) e Sequelize (JavaScript); revisão da injeção de dependência.

## 1.0.1 // 2025-09-21

- Pacote renomeado para @10565/quicknode-cli com o comando `qn`; banner novo.

## 1.0.0 // 2025-09-18

- Primeira versão: `create` com templates TypeScript e JavaScript.

---

Atualizado em 2026-11-15 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/changelog/

> Notas de versão do QuickNode CLI da v1.0.0 à v2: zero dependências de runtime, geração segura de projetos, publicação verificável e o site de documentação.
