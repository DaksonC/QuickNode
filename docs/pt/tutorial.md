# Como criar uma entidade e um caso de uso

Para adicionar uma funcionalidade a uma API QuickNode, rode `qn generate crud product` dentro do projeto: ele escreve a entidade, a interface do repositório e a implementação, os casos de uso com teste, o controller e a rota, e liga tudo no servidor.

Este guia adiciona um `Product` com preço ao template TypeScript. O template JavaScript recebe os mesmos arquivos, com models do Sequelize e regras do express-validator.

## 1. Como gero a funcionalidade?

Veja antes e depois gere. O nome pode ser escrito como `product`, `order-item` ou `orderItem`:

```
$ npx @10565/quicknode-cli generate crud product --dry-run
$ npx @10565/quicknode-cli generate crud product
```

A forma curta é `qn g crud product` quando a CLI está instalada globalmente (`npm i -g @10565/quicknode-cli`). Rodar de novo não muda nada; um arquivo que você editou nunca é sobrescrito sem `--force`.

## 2. O que foi criado, e onde?

- **src/domain/entities/product.ts**: A classe `Product` e o tipo `CreateProductData`. Sem Express, sem TypeORM.
- **src/domain/repositories/product-repository.ts**: A interface `ProductRepository`: o que o domínio precisa do armazenamento.
- **src/domain/use-cases/product-use-cases.ts**: Criar, buscar, listar, atualizar e remover, mais o `ProductNotFoundError`.
- **src/__tests__/use-cases/product-use-cases.test.ts**: Testes dos casos de uso com um repositório em memória: sem banco, sem mocks.
- **src/infrastructure/database/…**: A entidade do TypeORM (tabela `products`), a implementação do repositório e o método de fábrica `createProductRepository()`.
- **src/infrastructure/controllers, routes, http/dtos, modules**: Handlers HTTP (erros do domínio viram 404), rotas em `/api/v1/products` com comentários do Swagger, DTOs de entrada validados com class-validator e o `registerProductModule(app)`, que liga repositório → casos de uso → controller → rotas.

Os arquivos que já existiam só recebem linhas antes dos comentários-marcadores: a entidade na lista do `connection.ts` (`// qn:entities`), o método de fábrica (`// qn:factories`) e o módulo no `server.ts` (`// qn:modules`).

## 3. Como adiciono campos?

A entidade gerada tem um `name`. Um preço mexe num arquivo por camada. A entidade, no domínio:

```
export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly priceInCents: number,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}
}

export interface CreateProductData {
  name: string;
  priceInCents: number;
}
```

A coluna, em `infrastructure/database/entities/product-entity.ts`, e a validação, em `infrastructure/http/dtos/product-dtos.ts`:

```
@Column('int')
priceInCents!: number;

@IsInt()
@Min(1)
priceInCents!: number;
```

Depois passe `entity.priceInCents` no `toDomain()` da implementação do repositório. O compilador do TypeScript aponta cada lugar em que o campo novo ainda falta.

## 4. Onde fica uma regra de negócio?

No caso de uso, que só conhece a interface do repositório:

```
export class CreateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(data: CreateProductData): Promise<Product> {
    if (!Number.isInteger(data.priceInCents) || data.priceInCents <= 0) {
      throw new Error('Price must be a positive amount in cents');
    }
    return this.repository.create(data);
  }
}
```

E um teste junto dos gerados, com o mesmo repositório em memória:

```
it('rejects a price of zero', async () => {
  const createUseCase = new CreateProductUseCase(repository);

  await assert.rejects(createUseCase.execute({ name: 'Free', priceInCents: 0 }), /positive amount/);
});
```

## 5. Como testo?

```
$ npm test
$ npm run docker:up
$ npm run dev
$ curl -X POST localhost:3000/api/v1/products -H 'content-type: application/json' -d '{"name":"Coffee","priceInCents":1500}'
$ curl localhost:3000/api/v1/products
```

Em desenvolvimento (`NODE_ENV=development`), o TypeORM cria a tabela ao iniciar; para produção, escreva uma migration. Os endpoints também aparecem em `/api-docs`.

## Como sei que mantive a arquitetura limpa?

Rode `qn check` (ou `npm run check`). Ele falha, com arquivo e linha, quando um arquivo em `src/domain` importa `src/infrastructure`, o Express, um ORM ou qualquer outro pacote:

```
$ npx @10565/quicknode-cli check
✔ Dependency rule respected: 6 domain files checked.
```

Ele sai com código 1 quando há violação, então pode rodar no CI (o `qn add ci` já inclui) e antes de cada commit.

## Dá para gerar só algumas partes?

- `qn g crud product --only entity,repository`: algumas partes do CRUD.
- `qn g usecase product`, `qn g controller product`…: uma parte (tipos: `entity`, `repository`, `usecase`, `controller`). A saída avisa quando uma parte depende de outra que ainda não existe.
- `--no-test` pula o teste do caso de uso; `--json` imprime os arquivos e as ligações para scripts e agentes de IA.

---

Atualizado em 2026-11-14 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/tutorial/

> Adicione um Product a uma API Express + TypeScript com qn generate crud: entidade, repositório, casos de uso, teste, controller e rota nas camadas certas, depois campos, regras e qn check.
