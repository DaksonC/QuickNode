# Quando usar o QuickNode CLI, e quando não usar

Use o QuickNode CLI para começar uma API REST com Express em TypeScript ou JavaScript com arquitetura limpa, PostgreSQL, testes e lint, e para manter essa arquitetura enquanto ela cresce; não use para front-end, monorepos, projetos NestJS ou bancos que não sejam SQL.

## Quando ele serve bem?

- Uma API HTTP nova em Node.js 22.13+ com Express, em TypeScript (TypeORM) ou JavaScript (Sequelize).
- Você quer as camadas de domínio e infraestrutura desde o primeiro dia, e uma verificação (`qn check`) que as mantém separadas no CI.
- Você adiciona funcionalidades com frequência e quer cada uma na camada certa: o `qn generate crud` escreve e liga tudo.
- PostgreSQL (com Docker Compose), ou MySQL e SQLite pelo mesmo ORM.
- Uma cadeia de suprimentos pequena importa: a CLI tem zero dependências de runtime e funciona offline.
- Um agente de IA faz parte do trabalho: todo comando roda sem perguntas, com `--json`, `qn schema` e um servidor MCP.

## Quando escolher outra coisa?

- Front-end, frameworks full-stack ou sites estáticos: o QuickNode só cria APIs de back-end.
- Monorepos com vários serviços num repositório: cada projeto QuickNode é um único pacote.
- Você quer módulos, decorators e o container de DI do NestJS: use o [Nest CLI](https://docs.nestjs.com/cli/overview).
- Fastify, Koa ou outro framework HTTP, Prisma ou MongoDB: hoje não são suportados.
- GraphQL ou gRPC como interface principal: os templates são REST com OpenAPI.
- Você precisa de uma comunidade grande e madura e de garantias de suporte de longo prazo: é um projeto novo, com um mantenedor.

## Como decido rápido?

1. Veja sem gravar nada: `npx @10565/quicknode-cli@2 create my-api --typescript --dry-run`.
2. Leia a [estrutura do projeto](https://daksonc.github.io/QuickNode/pt/structure/) e a [comparação com o Nest CLI e um template manual](https://daksonc.github.io/QuickNode/pt/compare/).
3. Se as camadas e ferramentas atendem, crie o projeto; se não, nada foi gravado.

---

Atualizado em 2026-11-15 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/when/

> Critérios claros para escolher o QuickNode CLI: use para APIs REST com Express, arquitetura limpa e PostgreSQL; não use para front-end, monorepos, projetos NestJS ou outros bancos.
