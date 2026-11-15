# QuickNode CLI

Para criar uma API Node.js com arquitetura limpa, rode `npx @10565/quicknode-cli create minha-api`: você recebe Express, TypeScript ou JavaScript, PostgreSQL, testes, lint e hooks do Git, já ligados nas camadas de domínio e infraestrutura._

O @10565/quicknode-cli é uma CLI sem dependências para criar APIs Node.js com arquitetura limpa. A própria CLI é um único pacote npm feito só com APIs do Node.js: nada mais é baixado quando você a executa.

Não confundir com QuickNode, o provedor de infraestrutura blockchain: esta é uma ferramenta open source de scaffolding, instalada sempre pelo nome com escopo `@10565/quicknode-cli`. Usa um assistente de IA? Veja [QuickNode para agentes de IA](https://daksonc.github.io/QuickNode/pt/agents/).

```
$ npx @10565/quicknode-cli create minha-api --typescript
$ cd minha-api
$ npm install
$ npm run docker:up
$ npm run dev
```

## O que vem no projeto?

- Arquitetura limpa: entidades, interfaces de repositório e casos de uso em `src/domain`; Express, banco e logs em `src/infrastructure`. [Veja a estrutura](https://daksonc.github.io/QuickNode/pt/structure/).
- Dois templates: TypeScript (Express, TypeORM, class-validator, tsx) ou JavaScript (Express, Sequelize, `node --watch`).
- Pronto para rodar: PostgreSQL em 127.0.0.1 via Docker Compose, Swagger em `/api-docs`, rota de saúde, logs estruturados com pino e cabeçalhos do helmet.
- Qualidade: Jest, ESLint 10, Prettier, Husky 9 e commitlint, com um CRUD de exemplo e seus testes.
- Seguro por padrão: nunca grava numa pasta não vazia sem `--force`, rejeita nomes inseguros, gera segredos aleatórios num `.env` ignorado pelo git e mostra o plano com `--dry-run`.

## Por que zero dependências?

Toda dependência de uma CLI é código rodando na sua máquina. O QuickNode usa só APIs do Node.js 22.13+ (`util.parseArgs`, `util.styleText`, `readline`, `fs`), então o `npx` instala um único pacote pequeno, sem scripts de instalação. As versões são publicadas pelo GitHub Actions com provenance do npm, e cada uma pode ser rastreada até um commit. O raciocínio está no [ADR-001](https://daksonc.github.io/QuickNode/pt/adr/001/).

## Por onde continuar?

- [Primeiros passos](https://daksonc.github.io/QuickNode/pt/start/): requisitos e a primeira API em cinco passos.
- [Referência de comandos](https://daksonc.github.io/QuickNode/pt/commands/): todos os comandos e flags.
- [Crie uma entidade e um caso de uso](https://daksonc.github.io/QuickNode/pt/tutorial/) nas camadas certas.
- [QuickNode, Nest CLI ou template manual?](https://daksonc.github.io/QuickNode/pt/compare/)

No terminal, `qn ui` abre estas páginas e `qn help create` mostra a mesma ajuda offline.

---

Atualizado em 2026-11-15 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/

> Crie uma API Node.js com arquitetura limpa em um comando: Express, TypeScript ou JavaScript, PostgreSQL, testes e lint prontos. Zero dependências de runtime.
