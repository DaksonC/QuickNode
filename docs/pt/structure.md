# Estrutura do projeto

Um projeto QuickNode divide o `src/` em duas camadas: `domain` guarda as regras de negócio (entidades, interfaces de repositório, casos de uso) e `infrastructure` guarda tudo o que fala com o mundo externo (HTTP, banco, logs, documentação).

## O que tem em cada pasta?

```
src/
├── domain/                  regras de negócio, sem Express nem ORM
│   ├── entities/            User e seus tipos de entrada
│   ├── repositories/        interface UserRepository
│   └── use-cases/           CreateUser, GetUser, UpdateUser...
├── infrastructure/          adaptadores para o mundo externo
│   ├── config/              load-env: lê o .env com o loader do Node
│   ├── controllers/         entra HTTP, chama o caso de uso, sai HTTP
│   ├── database/
│   │   ├── connection.ts    data source do TypeORM
│   │   ├── entities/        mapeamento das tabelas no TypeORM
│   │   ├── repositories/    implementação do UserRepository
│   │   └── repository-factory.ts
│   ├── docs/                configuração do Swagger (OpenAPI 3)
│   ├── http/dtos/           DTOs de entrada validados com class-validator
│   ├── logging/             logger pino
│   ├── middleware/          validação e tratamento de erros
│   ├── modules/             montagem de cada funcionalidade: repositório → casos de uso → controller → rotas
│   └── routes/              routers do Express
├── __tests__/               testes dos casos de uso, com repositórios em memória
└── server.ts                app Express: middlewares, módulos, início e encerramento
```

O template JavaScript tem as mesmas camadas, com models do Sequelize em `infrastructure/database/models/` no lugar das entidades do TypeORM.

Esse é o padrão `--db postgres`. Com `--db sqlite`, o `database/` tem uma conexão `node:sqlite` (nativo do Node.js) e repositórios que criam as próprias tabelas; com `--db none`, repositórios em memória. A conexão sempre exporta `databaseConnection` com `initialize()`, `ping()` e `close()`, e o `qn generate` escreve o repositório do banco do projeto.

## Qual é a regra de dependência?

As dependências apontam para dentro: `infrastructure` pode importar `domain`, mas `domain` importa só outros arquivos do domínio e módulos nativos do Node.js: nunca `infrastructure`, Express, o ORM ou outro pacote. Um caso de uso recebe uma *interface* de repositório no construtor; quem decide a implementação é o módulo da funcionalidade em `infrastructure/modules`.

```
requisição HTTP
  → routes/        (router do Express, validação)
  → controllers/   (transforma HTTP numa chamada)
  → use-cases/     (regra de negócio)        ← domínio
  → repositories/  (interface)               ← domínio
  ← database/repositories/ (implementação TypeORM)
```

Manter essa regra é o que permite testar casos de uso sem banco e trocar o Express ou o ORM depois. O `qn check` garante isso: lista cada import que quebra a regra, com arquivo e linha, e sai com código 1, para CI e hooks do git. O `qn generate` já escreve as funcionalidades novas do lado certo dela.

## O que cada camada faz?

- **domain/entities**: Classes simples com os dados e o comportamento do negócio (`User.updateName()`). A validação da entrada fica na infraestrutura: DTOs do class-validator em `http/dtos` (TypeScript) ou regras do express-validator nas rotas (JavaScript).
- **domain/repositories**: Interfaces que dizem do que o domínio precisa do armazenamento (`findByEmail`, `create`…), nunca como.
- **domain/use-cases**: Uma classe por ação, com um método `execute()`. Regras como "o e-mail precisa ser único" ficam aqui.
- **infrastructure/database**: A conexão, o mapeamento do ORM e as classes que implementam as interfaces de repositório, convertendo linhas em entidades do domínio.
- **infrastructure/controllers e routes**: Traduzem HTTP em chamadas aos casos de uso e os resultados em respostas JSON, com status e anotações do Swagger.
- **infrastructure/modules**: A raiz de composição de cada funcionalidade: cria o repositório, injeta nos casos de uso, os casos de uso no controller e monta as rotas em `/api/v1`.
- **server.ts**: Cria o app Express, registra os middlewares e cada módulo, inicia o servidor e o encerra.

Comentários como `// qn:modules` e `// qn:entities` marcam onde o `qn generate` e o `qn add` inserem código. Mantenha-os; se um for removido, os comandos mostram as linhas para colar à mão.

## Quais arquivos ficam na raiz?

- `quicknode.json`: como o projeto foi criado (template, banco, gerenciador de pacotes, executor de testes, pastas das camadas, versão do template) e o hash de cada arquivo gerado, que o `qn upgrade` usa para separar as suas alterações. Faça commit dele.
- `.env`: gerado com segredos aleatórios (`JWT_SECRET`, e `DB_PASSWORD` com PostgreSQL), ignorado pelo git, permissão 600. O `.env.example` documenta cada variável; o `qn env` compara os dois sem imprimir valores.
- `docker-compose.yml` (só PostgreSQL): PostgreSQL 17 e Adminer, ambos presos a 127.0.0.1.
- `eslint.config.mjs`, `.prettierrc.json`, `jest.config.js`, `commitlint.config.js` e `.husky/`: ferramentas de qualidade.
- `AGENTS.md` e a cópia `CLAUDE.md`: as camadas, a regra de dependência e os comandos a rodar, para assistentes de código com IA.

Scripts: `npm run dev`, `npm test`, `npm run lint`, `npm run check` (`qn check`), `npm run docker:up`, `npm run db:seed`; o template TypeScript tem também `npm run build`.

Próximo passo: [crie uma entidade e um caso de uso](https://daksonc.github.io/QuickNode/pt/tutorial/).

---

Atualizado em 2026-11-14 · válido para a v3.x · https://daksonc.github.io/QuickNode/pt/structure/

> O papel de cada pasta de um projeto QuickNode: entidades, interfaces de repositório e casos de uso no domínio, e a infraestrutura com Express, TypeORM ou Sequelize.
