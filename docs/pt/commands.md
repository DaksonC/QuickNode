# Referência de comandos

O QuickNode CLI cria um projeto com `qn create`, faz ele crescer com `qn generate` e `qn add`, verifica com `qn check`, `qn doctor` e `qn env`, atualiza o template com `qn upgrade`, se descreve com `qn schema`, atende assistentes de IA com `qn mcp` e abre esta documentação com `qn ui`; rode `qn help <comando>` para ver a mesma referência offline.

Esta página é gerada da definição que a CLI usa para ler os argumentos (`src/spec.ts`), então sempre corresponde à versão instalada. Os textos de ajuda da CLI ficam em inglês.

## qn create

Cria um projeto novo com arquitetura limpa.

### Uso

```
$ qn create [name] [options]
```

### Argumento

- **`[name]`**: Pasta e nome do pacote do projeto ("." para o diretório atual)

### Opções

- **`-t, --typescript`**: Usa o template TypeScript (também -ts)
- **`-j, --javascript`**: Usa o template JavaScript (também -js)
- **`-f, --force`**: Grava num diretório não vazio, sobrescrevendo os arquivos em conflito
- **`-y, --yes`**: Aceita os padrões sem perguntar (nome, TypeScript, PostgreSQL)
- **`--dry-run`**: Mostra o que seria criado sem gravar nada
- **`--install`**: Instala as dependências com o gerenciador do --pm depois de criar o projeto
- **`--git`**: Inicializa um repositório git
- **`--no-credits`**: Deixa de fora do README a linha "Generated with QuickNode"
- **`--pm <npm|pnpm|yarn>`**: Gerenciador de pacotes usado nos scripts, na documentação e no --install (padrão: npm)
- **`--test <jest|node>`**: Executor de testes (padrão: jest; node usa o node:test nativo)
- **`--db <postgres|sqlite|none>`**: Banco: postgres (Docker), sqlite (node:sqlite, sem driver) ou none (repositórios em memória)
- **`--preset <name|file.json>`**: Parte de um preset (api-minima, api-postgres) ou de um arquivo JSON local; as flags vencem o preset

### Exemplos

```
$ qn create my-api
$ qn create my-api -ts --git --install
$ qn create my-api --pm pnpm --test node
$ qn create my-api --db sqlite
$ qn create my-api --preset api-minima
$ qn create my-api --preset ./team-preset.json
$ qn create . --javascript --force
$ qn create my-api --dry-run
$ qn create my-api --yes --json
```

Mesmo texto de `qn help create`

```
$ qn help create
qn create [name] [options]

Create a new project with clean architecture

Arguments:
  name  Project folder and package name ("." for the current directory)

Options:
  -t, --typescript                 Use the TypeScript template (also -ts)
  -j, --javascript                 Use the JavaScript template (also -js)
  -f, --force                      Write into a non-empty directory, overwriting conflicting files
  -y, --yes                        Accept defaults without prompting (name, TypeScript, PostgreSQL)
      --dry-run                    Show what would be created without writing anything
      --install                    Install the dependencies with the --pm package manager after creating the project
      --git                        Initialize a git repository
      --no-credits                 Leave the "Generated with QuickNode" line out of the README
      --pm <npm|pnpm|yarn>         Package manager used in scripts, docs and --install (default: npm)
      --test <jest|node>           Test runner (default: jest; node uses the built-in node:test)
      --db <postgres|sqlite|none>  Database: postgres (Docker), sqlite (node:sqlite, no driver) or none (in-memory repositories)
      --preset <name|file.json>    Start from a preset (api-minima, api-postgres) or a local JSON file; flags win over it
  -h, --help                       Show help
  -v, --version                    Show the version
      --json                       Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn create my-api
  qn create my-api -ts --git --install
  qn create my-api --pm pnpm --test node
  qn create my-api --db sqlite
  qn create my-api --preset api-minima
  qn create my-api --preset ./team-preset.json
  qn create . --javascript --force
  qn create my-api --dry-run
  qn create my-api --yes --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn generate

Gera uma funcionalidade nas camadas da arquitetura limpa, já ligada.

### Uso

```
$ qn generate <type> <name> [options]
```

Apelido: `qn g`

### Argumentos

- **`[type]`**: O que gerar (crud = todas as partes) (valores aceitos: `crud`, `entity`, `usecase`, `repository`, `controller`)
- **`[name]`**: Nome da funcionalidade, por exemplo product ou order-item

### Opções

- **`--only <parts>`**: Com crud, gera só estas partes (separadas por vírgula: entity, repository, usecase, controller)
- **`--no-test`**: Não gera o teste do caso de uso
- **`--dry-run`**: Mostra os arquivos a criar ou alterar sem gravar nada
- **`-f, --force`**: Sobrescreve arquivos existentes com conteúdo diferente

### Exemplos

```
$ qn generate crud product
$ qn g crud order-item --dry-run
$ qn g crud product --only entity,repository
$ qn g usecase product --no-test
$ qn g crud product --json
```

Mesmo texto de `qn help generate`

```
$ qn help generate
qn generate <type> <name> [options]

Generate a feature in the clean architecture layers, already wired (alias: qn g)

Arguments:
  type  What to generate (crud = all the parts) (crud, entity, usecase, repository, controller)
  name  Feature name, e.g. product or order-item

Options:
      --only <parts>  With crud, generate only these parts (comma-separated: entity, repository, usecase, controller)
      --no-test       Do not generate the use case test
      --dry-run       Show the files to create or change without writing anything
  -f, --force         Overwrite existing files with different content
  -h, --help          Show help
  -v, --version       Show the version
      --json          Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn generate crud product
  qn g crud order-item --dry-run
  qn g crud product --only entity,repository
  qn g usecase product --no-test
  qn g crud product --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn check

Verifica a regra de dependência: o domain não pode importar infrastructure, frameworks nem ORMs.

### Uso

```
$ qn check [options]
```

### Exemplos

```
$ qn check
$ qn check --json
```

Mesmo texto de `qn help check`

```
$ qn help check
qn check [options]

Check the dependency rule: domain must not import infrastructure, frameworks or ORMs

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn check
  qn check --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn add

Adiciona uma ferramenta a um projeto existente (idempotente).

### Uso

```
$ qn add <recipe...> [options]
```

### Argumento

- **`[recipe...]`**: Receitas a aplicar (valores aceitos: `agents`, `auth`, `ci`, `docker`, `eslint`, `github-actions`, `graceful-shutdown`, `healthcheck`, `husky`, `rate-limit`, `swagger`, `tests`)

### Opções

- **`--dry-run`**: Mostra o diff sem gravar nada
- **`-f, --force`**: Sobrescreve arquivos existentes com conteúdo diferente

### Exemplos

```
$ qn add docker
$ qn add auth rate-limit --dry-run
$ qn add ci --json
$ qn add agents
```

Mesmo texto de `qn help add`

```
$ qn help add
qn add <recipe...> [options]

Add a tool to an existing project (idempotent)

Arguments:
  recipe...  Recipes to apply (agents, auth, ci, docker, eslint, github-actions, graceful-shutdown, healthcheck, husky, rate-limit, swagger, tests)

Options:
      --dry-run  Show the diff without writing anything
  -f, --force    Overwrite existing files with different content
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn add docker
  qn add auth rate-limit --dry-run
  qn add ci --json
  qn add agents

Docs: https://daksonc.github.io/QuickNode/
```

## qn doctor

Verifica Node.js, .env, Docker, vulnerabilidades e a regra de dependência.

### Uso

```
$ qn doctor [options]
```

### Opções

- **`--offline`**: Pula o npm audit (sem rede)

### Exemplos

```
$ qn doctor
$ qn doctor --offline
$ qn doctor --json
```

Mesmo texto de `qn help doctor`

```
$ qn help doctor
qn doctor [options]

Check Node.js, .env, Docker, vulnerabilities and the dependency rule

Options:
      --offline  Skip npm audit (no network)
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn doctor
  qn doctor --offline
  qn doctor --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn env

Compara o .env com o .env.example e gera os segredos que faltam (os valores nunca são impressos).

### Uso

```
$ qn env [options]
```

### Opções

- **`--generate-secrets`**: Grava no .env as variáveis que faltam, com valores aleatórios para segredos e placeholders change-me
- **`--dry-run`**: Com --generate-secrets, mostra o que mudaria sem gravar
- **`-f, --force`**: Com --generate-secrets, troca também os segredos que já têm valor

### Exemplos

```
$ qn env
$ qn env --generate-secrets
$ qn env --generate-secrets --dry-run
$ qn env --json
```

Mesmo texto de `qn help env`

```
$ qn help env
qn env [options]

Compare .env with .env.example and generate missing secrets (values are never printed)

Options:
      --generate-secrets  Write missing variables to .env, with random values for secrets and change-me placeholders
      --dry-run           With --generate-secrets, show what would change without writing
  -f, --force             With --generate-secrets, also replace secrets that already have a value
  -h, --help              Show help
  -v, --version           Show the version
      --json              Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn env
  qn env --generate-secrets
  qn env --generate-secrets --dry-run
  qn env --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn upgrade

Aplica as melhorias de um template mais novo: atualiza os arquivos que você não alterou e mostra o diff dos outros.

### Uso

```
$ qn upgrade [options]
```

### Opções

- **`--dry-run`**: Mostra o plano e os diffs sem gravar nada
- **`-y, --yes`**: Aplica sem perguntar (obrigatório sem terminal)
- **`-f, --force`**: Sobrescreve também os arquivos que você alterou (o diff é mostrado antes)

### Exemplos

```
$ qn upgrade --dry-run
$ qn upgrade
$ qn upgrade --yes --json
```

Mesmo texto de `qn help upgrade`

```
$ qn help upgrade
qn upgrade [options]

Apply the improvements of a newer template: updates files you did not change, diffs the rest

Options:
      --dry-run  Show the plan and the diffs without writing anything
  -y, --yes      Apply without asking (required without a terminal)
  -f, --force    Also overwrite files you changed (their diff is shown first)
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn upgrade --dry-run
  qn upgrade
  qn upgrade --yes --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn schema

Imprime em JSON a especificação completa de comandos, flags, valores e códigos de erro.

### Uso

```
$ qn schema
```

### Exemplos

```
$ qn schema
$ qn --help --json
$ qn help generate --json
```

Mesmo texto de `qn help schema`

```
$ qn help schema
qn schema

Print the full specification of commands, flags, values and error codes as JSON

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn schema
  qn --help --json
  qn help generate --json

Docs: https://daksonc.github.io/QuickNode/
```

## qn mcp

Roda um servidor Model Context Protocol no stdio para assistentes de IA (simulação por padrão).

### Uso

```
$ qn mcp
```

### Exemplos

```
$ qn mcp
$ npx @10565/quicknode-cli@3 mcp
```

Mesmo texto de `qn help mcp`

```
$ qn help mcp
qn mcp

Run a Model Context Protocol server on stdio for AI assistants (dry run by default)

Options:
  -h, --help     Show help
  -v, --version  Show the version
      --json     Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn mcp
  npx @10565/quicknode-cli@3 mcp

Docs: https://daksonc.github.io/QuickNode/
```

## qn ui

Abre a documentação no navegador.

### Uso

```
$ qn ui [topic] [options]
```

Apelido: `qn docs`

### Argumento

- **`[topic]`**: Página a abrir (valores aceitos: `start`, `commands`, `create`, `ui`, `structure`, `tutorial`, `generate`, `agents`, `when`, `errors`, `check`, `add`, `doctor`, `env`, `upgrade`, `faq`, `compare`, `changelog`, `adr`)

### Opções

- **`-p, --print`**: Só imprime o link, sem abrir o navegador
- **`--lang <en|pt>`**: Idioma da página (padrão: o do LANG)

### Exemplos

```
$ qn ui
$ qn docs create
$ qn ui structure --lang pt
$ qn ui faq --print
```

Mesmo texto de `qn help ui`

```
$ qn help ui
qn ui [topic] [options]

Open the documentation in the browser (alias: qn docs)

Arguments:
  topic  Page to open (start, commands, create, ui, structure, tutorial, generate, agents, when, errors, check, add, doctor, env, upgrade, faq, compare, changelog, adr)

Options:
  -p, --print         Only print the link, do not open the browser
      --lang <en|pt>  Language of the page (default: from LANG)
  -h, --help          Show help
  -v, --version       Show the version
      --json          Print a JSON result to stdout (no prompts, no colors)

Examples:
  qn ui
  qn docs create
  qn ui structure --lang pt
  qn ui faq --print

Docs: https://daksonc.github.io/QuickNode/
```

## Opções globais

Aceitas por todos os comandos.

- **`-h, --help`**: Mostra a ajuda
- **`-v, --version`**: Mostra a versão
- **`--json`**: Imprime um resultado JSON no stdout (sem perguntas, sem cores)

## Códigos de saída

- **`0`**: sucesso
- **`1`**: o comando falhou (por exemplo, a pasta de destino não está vazia, ou o qn check achou violações)
- **`2`**: uso inválido: comando, flag ou valor desconhecido

## Códigos de erro

Todo erro tem um código estável, uma mensagem curta e, quando conhecida, uma correção (fix). Com --json ele vai para o stdout como abaixo; sem, para o stderr com uma linha "Fix:". Os códigos não mudam dentro de uma versão major.

```
$ qn create my-api --json
{
  "schemaVersion": 1,
  "ok": false,
  "error": {
    "code": "E_USAGE",
    "message": "Choose a template with --typescript or --javascript (or pass --yes).",
    "fix": "qn create my-api --typescript"
  }
}
```

- **`E_USAGE` (exit 2)**: Uso inválido: comando, flag ou valor desconhecido, ou argumento faltando
- **`E_DIR_NOT_EMPTY` (exit 1)**: qn create: a pasta de destino não está vazia (use --force para gravar nela)
- **`E_PATH_BLOCKED` (exit 1)**: qn create: um caminho do projeto está ocupado por um arquivo ou pasta de outro tipo
- **`E_FILES_EXIST` (exit 1)**: qn generate / qn add: existem arquivos com outro conteúdo (use --force para sobrescrever)
- **`E_NOT_A_PROJECT` (exit 1)**: O comando precisa rodar dentro de um projeto criado com qn create
- **`E_CONFIG_INVALID` (exit 1)**: quicknode.json não é um JSON válido ou tem chaves ou valores desconhecidos
- **`E_PRESET_INVALID` (exit 1)**: qn create --preset: preset desconhecido, arquivo ilegível ou chaves ou valores desconhecidos
- **`E_ENV_EXAMPLE_MISSING` (exit 1)**: qn env: o projeto não tem .env.example para comparar com o .env
- **`E_CONFIRM_REQUIRED` (exit 1)**: qn upgrade: precisa de confirmação e não há terminal (passe --yes)
- **`E_CLI_OUTDATED` (exit 1)**: qn upgrade: o projeto foi criado por uma CLI mais nova que esta
- **`E_ABORTED` (exit 1)**: Uma pergunta interativa foi cancelada
- **`E_INTERNAL` (exit 1)**: Erro inesperado (rode de novo com DEBUG=1 e reporte)

---

Atualizado em 2026-11-15 · válido para a v3.x · https://daksonc.github.io/QuickNode/pt/commands/

> Todos os comandos e flags do QuickNode CLI, gerados da mesma definição que a CLI usa: qn create, generate, check, add, doctor, schema, mcp, ui, --dry-run, --json, códigos de saída e de erro.
