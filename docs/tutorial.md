# How to create an entity and a use case

To add a feature to a QuickNode API, run `qn generate crud product` inside the project: it writes the entity, the repository interface and its implementation, the use cases with a test, the controller and the route, and wires them into the server.

This guide adds a `Product` with a price to the TypeScript template. The JavaScript template gets the same files with Sequelize models and express-validator rules.

## 1. How do I generate the feature?

Preview first, then generate. Names can be written as `product`, `order-item` or `orderItem`:

```
$ npx @10565/quicknode-cli generate crud product --dry-run
$ npx @10565/quicknode-cli generate crud product
```

The short form is `qn g crud product` when the CLI is installed globally (`npm i -g @10565/quicknode-cli`). Running it again changes nothing; a file you edited is never overwritten without `--force`.

## 2. What was created, and where?

- **src/domain/entities/product.ts**: The `Product` class and its `CreateProductData` type. No Express, no TypeORM.
- **src/domain/repositories/product-repository.ts**: The `ProductRepository` interface: what the domain needs from storage.
- **src/domain/use-cases/product-use-cases.ts**: Create, get, list, update and delete, plus `ProductNotFoundError`.
- **src/__tests__/use-cases/product-use-cases.test.ts**: Tests of the use cases with an in-memory repository: no database, no mocks.
- **src/infrastructure/database/…**: The TypeORM entity (table `products`), the repository implementation and a `createProductRepository()` factory method.
- **src/infrastructure/controllers, routes, http/dtos, modules**: HTTP handlers (domain errors become 404), routes under `/api/v1/products` with Swagger comments, request DTOs validated with class-validator, and `registerProductModule(app)`, which wires repository → use cases → controller → routes.

Existing files only get lines inserted before their marker comments: the entity in the list of `connection.ts` (`// qn:entities`), the factory method (`// qn:factories`) and the module in `server.ts` (`// qn:modules`).

## 3. How do I add fields?

The generated entity has a `name`. A price touches one file per layer. The entity, in the domain:

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

The column, in `infrastructure/database/entities/product-entity.ts`, and the validation, in `infrastructure/http/dtos/product-dtos.ts`:

```
@Column('int')
priceInCents!: number;

@IsInt()
@Min(1)
priceInCents!: number;
```

Then pass `entity.priceInCents` in `toDomain()` of the repository implementation. The TypeScript compiler points to every place that still misses the new field.

## 4. Where does a business rule go?

In the use case, which only knows the repository interface:

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

And a test next to the generated ones, with the same in-memory repository:

```
it('rejects a price of zero', async () => {
  const createUseCase = new CreateProductUseCase(repository);

  await assert.rejects(createUseCase.execute({ name: 'Free', priceInCents: 0 }), /positive amount/);
});
```

## 5. How do I try it?

```
$ npm test
$ npm run docker:up
$ npm run dev
$ curl -X POST localhost:3000/api/v1/products -H 'content-type: application/json' -d '{"name":"Coffee","priceInCents":1500}'
$ curl localhost:3000/api/v1/products
```

In development (`NODE_ENV=development`), TypeORM creates the table on start; for production, write a migration. The endpoints also show up at `/api-docs`.

## How do I know I kept the architecture clean?

Run `qn check` (or `npm run check`). It fails, with file and line, when a file under `src/domain` imports `src/infrastructure`, Express, an ORM or any other package:

```
$ npx @10565/quicknode-cli check
✔ Dependency rule respected: 6 domain files checked.
```

It exits with code 1 on a violation, so it can run in CI (`qn add ci` adds it) and before each commit.

## Can I generate only some parts?

- `qn g crud product --only entity,repository`: some parts of the CRUD.
- `qn g usecase product`, `qn g controller product`…: one part (types: `entity`, `repository`, `usecase`, `controller`). The output says when a part needs another one that does not exist yet.
- `--no-test` skips the use case test; `--json` prints the files and the wiring for scripts and AI agents.

---

Updated on 2026-11-14 · valid for v2.x · https://daksonc.github.io/QuickNode/tutorial/

> Add a Product to an Express + TypeScript API with qn generate crud: entity, repository, use cases, test, controller and route in the right layers, then fields, rules and qn check.
