# Perguntas frequentes

Respostas curtas sobre instalar, rodar e confiar no QuickNode CLI; cada título é uma pergunta.

## Qual versão do Node.js eu preciso?

Node.js 22.13 ou mais novo, tanto para a CLI quanto para os projetos gerados. O Node 18 e o 20 já saíram de suporte; neles a CLI mostra a versão exigida e encerra.

## Posso criar um projeto numa pasta que já tem arquivos?

Só com `--force`. Sem ele, o `qn create` para e lista o que existe na pasta. Com ele, arquivos de mesmo nome são sobrescritos (rode antes `--dry-run --force` para ver quais), um `.env` existente é sempre mantido e a pasta `.git` é ignorada.

## De onde vêm a senha do banco e o segredo do JWT?

O `qn create` grava o `.env` a partir do `.env.example` com `DB_PASSWORD` e `JWT_SECRET` aleatórios (`crypto.randomBytes` do Node). O arquivo é ignorado pelo git, legível só por você (permissão 600), e os segredos nunca são impressos. O Docker Compose lê a senha dele.

## Funciona offline?

Sim, depois que o pacote está instalado. Os templates vêm dentro do pacote; nada é baixado durante a geração. Só o `--install` (que roda `npm install`) precisa de rede.

## O QuickNode coleta algum dado?

Não. Não há telemetria na CLI e não há analytics, cookies nem recursos de terceiros neste site.

## Isto é a plataforma de blockchain QuickNode?

Não. O QuickNode CLI (@10565/quicknode-cli) é uma ferramenta open source de scaffolding para APIs Node.js e não tem relação com a QuickNode, provedora de infraestrutura de blockchain. Instale sempre pelo nome completo com escopo, `@10565/quicknode-cli`.

## É seguro rodar com npx?

O pacote não tem dependências de runtime nem scripts de instalação (nada de `preinstall`, `postinstall` ou `prepare`). As versões são publicadas pelo GitHub Actions com provenance do npm, então dá para conferir que o tarball foi gerado a partir deste repositório: `npm audit signatures`. Programas externos só rodam quando você pede (`--git`, `--install`), e sem shell.

## Ele trava no CI ou quando um agente de IA o executa?

Não. Sem terminal ele nunca pergunta: passe `--yes` ou as flags necessárias, e acrescente `--json` para um resultado estruturado. O `qn ui` só imprime o link no CI, por SSH e dentro de contêineres.

## Posso tirar a linha "Generated with QuickNode"?

Pode: é uma única linha no fim do README gerado. Apague-a, ou crie o projeto com `--no-credits`. Ela nunca aparece em código, cabeçalhos HTTP ou respostas da API.

## Quais bancos de dados são suportados?

O PostgreSQL funciona direto, via TypeORM (TypeScript) ou Sequelize (JavaScript), com Docker Compose para desenvolvimento. O `.env.example` também lista MySQL e SQLite: no template JavaScript eles só precisam do driver (`npm install mysql2` ou `sqlite3`); no template TypeScript os repositórios deles ainda não foram implementados.

## Como reporto um bug ou uma vulnerabilidade?

Bugs e ideias: [issues do GitHub](https://github.com/DaksonC/QuickNode/issues). Vulnerabilidades: de forma privada, como descrito no [SECURITY.md](https://github.com/DaksonC/QuickNode/blob/main/SECURITY.md).

---

Atualizado em 2026-11-14 · válido para a v3.x · https://daksonc.github.io/QuickNode/pt/faq/

> Respostas sobre o QuickNode CLI: versão do Node.js, gerar em pastas existentes, segredos gerados, uso offline, telemetria e o nome QuickNode.
