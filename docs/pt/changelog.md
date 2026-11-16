# Changelog

A versão 3.1.0 registra como cada projeto foi criado no `quicknode.json`, traz `--db postgres|sqlite|none` e presets no `qn create`, e os comandos `qn env` e `qn upgrade`; ela também traz a reescrita planejada como 2.0.0, que nunca foi publicada: zero dependências de runtime e um `qn create` seguro. Exige Node.js 22.13+.

As versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/). As notas de versão com a procedência do build ficam nas [Releases do GitHub](https://github.com/DaksonC/QuickNode/releases).

## 3.2.0 // 2026-11-16

### Alterado

- Projetos novos usam helmet 8 (o `Strict-Transport-Security` passa a durar um ano, eram 180 dias), pino 10 e jest-extended 7; também express-validator, swagger-jsdoc, Jest e tsx mais novos. O `qn upgrade` oferece essas versões a projetos existentes.

### Corrigido

- Template TypeScript: quando o servidor não conseguia iniciar, o erro sumia do log (`logger.error(mensagem, erro)` não é como o pino recebe um erro); agora ele é registrado como `err`.

## 3.1.0 // 2026-11-16

### Alterado

- Projetos novos usam Express 5 e, com PostgreSQL em TypeScript, TypeORM 1; também pg, Sequelize, class-validator 0.15, reflect-metadata 0.2, pino-pretty, Prettier e swagger-ui-express mais novos.
- O `qn upgrade` oferece essas versões a projetos existentes. O Express 5 muda os padrões de rota (o curinga `*` precisa de nome, ex.: `/*splat`) e deixa `req.body` indefinido quando não há corpo JSON: revise o plano antes de aplicar.

### Corrigido

- As APIs geradas respondiam 500 a JSON malformado; agora respondem 400 (413 para corpo grande demais).
- TypeScript: uma rota do `qn generate` responde 400, e não 500, a um POST ou PUT sem corpo.

## 3.0.0 // 2026-11-16

### Mudanças incompatíveis

- O código de banco gerado tem o mesmo formato em todos os bancos: `src/infrastructure/database/connection` exporta `databaseConnection` com `initialize()`, `ping()` e `close()`. Nos projetos JavaScript ele substitui o export padrão `sequelizeConnection`, e os models são carregados pelo `initialize()`.
- A conexão é só PostgreSQL: saem o `DB_TYPE` e os ramos de MySQL e SQLite que funcionavam pela metade (use `--db sqlite`). O `@types/sqlite3` saiu do template TypeScript.
- Os comandos escritos nos projetos novos e na documentação usam `npx @10565/quicknode-cli@3`.
- O orçamento de tamanho do pacote publicado passa a 400 KB (era 300 KB), registrado na D4 do ADR-001.
- O `qn create` pergunta o banco no terminal (`--yes` e `--preset` pulam a pergunta).

### Adicionado

- `quicknode.json` nos projetos novos: template, banco, gerenciador de pacotes, executor de testes, pastas das camadas, versão do template e o hash de cada arquivo gerado. O `qn generate`, o `qn add`, o `qn check`, o `qn doctor` e o `qn upgrade` leem esse arquivo; projetos sem ele continuam detectados pelo layout.
- `qn create --db postgres|sqlite|none`: templates feitos de uma base mínima mais um add-on de banco. O SQLite usa o `node:sqlite`, nativo do Node.js (sem driver, sem Docker); o `none` usa repositórios em memória. O `qn generate` escreve o repositório do banco do projeto.
- `qn create --preset api-minima|api-postgres` ou `--preset ./arquivo.json`, validado antes de gravar qualquer coisa; as flags vencem o preset.
- `qn env`: compara o `.env` com o `.env.example` pelos nomes e, com `--generate-secrets`, adiciona o que falta com segredos aleatórios (`crypto.randomBytes`). Nunca imprime valores.
- `qn upgrade`: aplica um template mais novo. Arquivos que você não alterou são atualizados, os alterados recebem um diff e uma cópia `.qn-new`, e o `package.json` só recebe versões mais novas das dependências que já tem; primeiro `--dry-run`, depois confirmação (ou `--yes`) para aplicar.
- Códigos de erro `E_CONFIG_INVALID`, `E_PRESET_INVALID`, `E_ENV_EXAMPLE_MISSING`, `E_CONFIRM_REQUIRED` e `E_CLI_OUTDATED`; ferramentas MCP `qn_env` e `qn_upgrade` (simulação, a menos que `"apply": true`).
- O `qn doctor` pula o Docker quando o projeto não usa PostgreSQL e avisa quando o `qn upgrade` tem novidade.

### Corrigido

- O template TypeScript caía ao iniciar com `NODE_ENV=development`: faltava o `pino-pretty` nas dependências.
- Template JavaScript: um usuário inexistente respondia 500 em vez de 404 (e um email repetido, 500 em vez de 409); os erros de domínio agora têm tipo e viram códigos HTTP.
- No WSL, o `qn ui` dizia que abria o navegador, mas nada abria; agora usa o navegador do Windows pelo `explorer.exe`.
- Rodar o `qn generate` duas vezes podia inserir a mesma ligação de novo quando o trecho tinha linhas em branco.

## 2.0.0 // não publicada: estas mudanças saem na 3.0.0

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

Atualizado em 2026-11-16 · válido para a v3.x · https://daksonc.github.io/QuickNode/pt/changelog/

> Notas de versão do QuickNode CLI da v1.0.0 à v3: zero dependências de runtime, geração segura de projetos, publicação verificável e o site de documentação.
