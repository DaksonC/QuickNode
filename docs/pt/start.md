# Primeiros passos

Para começar uma API Node.js com arquitetura limpa, rode `npx @10565/quicknode-cli create minha-api` com Node.js 22.13 ou mais novo e depois `npm install`, `npm run docker:up` e `npm run dev`.

## Do que eu preciso?

- Node.js 22.13 ou mais novo (confira com `node --version`). Versões antigas recebem um erro claro em vez de travar.
- Docker com Docker Compose, para o PostgreSQL do projeto gerado (ou um PostgreSQL seu, configurado no `.env`).
- Git, só se quiser que o `--git` inicialize um repositório.

## Como crio minha primeira API?

1. Veja antes o que será criado. Nada é gravado:
   
   ```
   $ npx @10565/quicknode-cli create minha-api --typescript --dry-run
   ```
2. Crie o projeto. Use `--javascript` para o template JavaScript, ou deixe sem a flag para a CLI perguntar:
   
   ```
   $ npx @10565/quicknode-cli create minha-api --typescript --git
   ```
3. Instale as dependências do projeto:
   
   ```
   $ cd minha-api
   $ npm install
   ```
4. Suba o PostgreSQL. Ele escuta só em 127.0.0.1 e usa a senha aleatória gravada no `.env`:
   
   ```
   $ npm run docker:up
   ```
5. Rode a API com recarga automática e abra `http://localhost:3000/api-docs` para ver o Swagger:
   
   ```
   $ npm run dev
   ```

## Posso instalar globalmente?

Pode. A instalação global dá acesso ao comando curto `qn`:

```
$ npm install -g @10565/quicknode-cli
$ qn create minha-api -ts
```

## Como rodo no CI ou num script?

Passe todas as escolhas por flag. Sem terminal, a CLI nunca pergunta: usa os padrões do `--yes` ou falha dizendo qual flag falta. O `--json` imprime um resultado legível por máquina.

```
$ npx @10565/quicknode-cli create minha-api --yes --json
```

## O que ler em seguida?

- [Estrutura do projeto](https://daksonc.github.io/QuickNode/pt/structure/): o papel de cada pasta.
- [Crie uma entidade e um caso de uso](https://daksonc.github.io/QuickNode/pt/tutorial/).
- [Todas as flags do qn create](https://daksonc.github.io/QuickNode/pt/commands/#create).

---

Atualizado em 2026-11-14 · válido para a v2.x · https://daksonc.github.io/QuickNode/pt/start/

> Sem instalar nada: rode npx @10565/quicknode-cli create minha-api, suba o PostgreSQL com Docker e rode a API. Passo a passo para Node.js 22.13+.
