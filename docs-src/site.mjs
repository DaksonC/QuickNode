/**
 * Data of the documentation site (ADR-001, D7 and D8): facts repeated on every
 * channel, the page list with per-language metadata, interface strings and the
 * Portuguese text of the command reference. scripts/build-docs.mjs turns this
 * and docs-src/content/ into the committed HTML in docs/.
 */

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** Same facts on npm, GitHub, README and docs (D8: consistent facts). */
export const SITE = {
  name: 'QuickNode CLI',
  packageName: '@10565/quicknode-cli',
  /**
   * Version the documentation describes. Set by hand because the docs can ship
   * before a release; a test fails if package.json gets ahead of it. 3.0.0 is
   * the first release after 1.1.1 (2.0.0 was never published).
   */
  version: '3.1.0',
  appliesTo: 'v3.x',
  /** Minimum Node.js version, from package.json engines (">=22.13.0" -> "22.13"). */
  node: pkg.engines.node.replace(/^>=\s*/, '').replace(/\.0$/, ''),
  baseUrl: 'https://daksonc.github.io/QuickNode/',
  basePath: '/QuickNode/',
  repo: 'https://github.com/DaksonC/QuickNode',
  npm: 'https://www.npmjs.com/package/@10565/quicknode-cli',
  author: { name: 'Dakson Chaves Cruz', url: 'https://daksonc.github.io/' },
  positioning: {
    en: 'Zero-dependency CLI to create Node.js APIs with clean architecture',
    pt: 'CLI sem dependências para criar APIs Node.js com arquitetura limpa'
  }
};

export const LANGS = ['en', 'pt'];

/** Header of llms.txt (https://llmstxt.org/): the facts an assistant should get right. */
export const LLMS = {
  summary: `${SITE.positioning.en}: Express, TypeScript or JavaScript, PostgreSQL, SQLite or no database, tests and linting ready, plus generators (qn generate), a dependency rule check (qn check), recipes (qn add), .env checks (qn env), template upgrades (qn upgrade) and an MCP server (qn mcp).`,
  facts: [
    `Package: ${SITE.packageName} (always with the scope). Command: qn. Run without installing: npx ${SITE.packageName}@3 <command>.`,
    `Not related to QuickNode, the blockchain infrastructure provider.`,
    `Requires Node.js ${SITE.node} or newer. Zero runtime dependencies, no telemetry, no network while generating.`,
    'Non-interactive use: pass every value as a flag (or --yes) and add --json; errors have a stable code and a fix.',
    'Full machine-readable specification: qn schema (or qn --help --json).'
  ]
};

/** Portuguese text of the error codes (English comes from src/core/errors.ts). */
export const ERRORS_PT = {
  E_USAGE: 'Uso inválido: comando, flag ou valor desconhecido, ou argumento faltando',
  E_DIR_NOT_EMPTY: 'qn create: a pasta de destino não está vazia (use --force para gravar nela)',
  E_PATH_BLOCKED: 'qn create: um caminho do projeto está ocupado por um arquivo ou pasta de outro tipo',
  E_FILES_EXIST: 'qn generate / qn add: existem arquivos com outro conteúdo (use --force para sobrescrever)',
  E_NOT_A_PROJECT: 'O comando precisa rodar dentro de um projeto criado com qn create',
  E_CONFIG_INVALID: 'quicknode.json não é um JSON válido ou tem chaves ou valores desconhecidos',
  E_PRESET_INVALID: 'qn create --preset: preset desconhecido, arquivo ilegível ou chaves ou valores desconhecidos',
  E_ENV_EXAMPLE_MISSING: 'qn env: o projeto não tem .env.example para comparar com o .env',
  E_CONFIRM_REQUIRED: 'qn upgrade: precisa de confirmação e não há terminal (passe --yes)',
  E_CLI_OUTDATED: 'qn upgrade: o projeto foi criado por uma CLI mais nova que esta',
  E_ABORTED: 'Uma pergunta interativa foi cancelada',
  E_INTERNAL: 'Erro inesperado (rode de novo com DEBUG=1 e reporte)'
};

/**
 * Pages in menu order. `slug` is the path under the language root and matches
 * the `qn ui` topics (spec.ts DOCS_TOPICS). `file` names the content fragment
 * in docs-src/content/<lang>/. `updated` is set by hand when the content changes.
 */
export const PAGES = [
  {
    slug: '',
    file: 'index',
    updated: '2026-11-15',
    en: {
      title: 'QuickNode CLI | Zero-dependency Node.js clean architecture generator',
      description:
        'Create a Node.js API with clean architecture in one command: Express, TypeScript or JavaScript, PostgreSQL, tests and linting ready. Zero runtime dependencies.',
      crumb: 'Home'
    },
    pt: {
      title: 'QuickNode CLI | Gerador de APIs Node.js com arquitetura limpa, sem dependências',
      description:
        'Crie uma API Node.js com arquitetura limpa em um comando: Express, TypeScript ou JavaScript, PostgreSQL, testes e lint prontos. Zero dependências de runtime.',
      crumb: 'Início'
    }
  },
  {
    slug: 'start/',
    file: 'start',
    menu: 'start',
    updated: '2026-11-14',
    en: {
      title: 'Getting started: create a Node.js API with clean architecture',
      description:
        'Install nothing: run npx @10565/quicknode-cli create my-api, start PostgreSQL with Docker and run the API. Step-by-step guide for Node.js 22.13+.',
      crumb: 'Getting started'
    },
    pt: {
      title: 'Primeiros passos: crie uma API Node.js com arquitetura limpa',
      description:
        'Sem instalar nada: rode npx @10565/quicknode-cli create minha-api, suba o PostgreSQL com Docker e rode a API. Passo a passo para Node.js 22.13+.',
      crumb: 'Primeiros passos'
    }
  },
  {
    slug: 'commands/',
    file: 'commands',
    menu: 'commands',
    updated: '2026-11-15',
    en: {
      title: 'Command reference: qn create, generate, check, add, doctor and every flag',
      description:
        'Every QuickNode CLI command and flag, generated from the same definition the CLI parses: qn create, generate, check, add, doctor, schema, mcp, ui, --dry-run, --json, exit and error codes.',
      crumb: 'Commands'
    },
    pt: {
      title: 'Referência de comandos: qn create, generate, check, add, doctor e todas as flags',
      description:
        'Todos os comandos e flags do QuickNode CLI, gerados da mesma definição que a CLI usa: qn create, generate, check, add, doctor, schema, mcp, ui, --dry-run, --json, códigos de saída e de erro.',
      crumb: 'Comandos'
    }
  },
  {
    slug: 'structure/',
    file: 'structure',
    menu: 'structure',
    updated: '2026-11-14',
    en: {
      title: 'Generated project structure: clean architecture layers explained',
      description:
        'What each folder of a QuickNode project does: domain entities, repository interfaces and use cases, and the infrastructure layer with Express, TypeORM or Sequelize.',
      crumb: 'Project structure'
    },
    pt: {
      title: 'Estrutura do projeto gerado: as camadas da arquitetura limpa',
      description:
        'O papel de cada pasta de um projeto QuickNode: entidades, interfaces de repositório e casos de uso no domínio, e a infraestrutura com Express, TypeORM ou Sequelize.',
      crumb: 'Estrutura do projeto'
    }
  },
  {
    slug: 'tutorial/',
    file: 'tutorial',
    menu: 'tutorial',
    updated: '2026-11-14',
    en: {
      title: 'How to create an entity and a use case in a Node.js clean architecture API',
      description:
        'Add a Product to an Express + TypeScript API with qn generate crud: entity, repository, use cases, test, controller and route in the right layers, then fields, rules and qn check.',
      crumb: 'Entity and use case'
    },
    pt: {
      title: 'Como criar uma entidade e um caso de uso numa API Node.js com arquitetura limpa',
      description:
        'Adicione um Product a uma API Express + TypeScript com qn generate crud: entidade, repositório, casos de uso, teste, controller e rota nas camadas certas, depois campos, regras e qn check.',
      crumb: 'Entidade e caso de uso'
    }
  },
  {
    slug: 'add/',
    file: 'add',
    menu: 'add',
    updated: '2026-11-14',
    en: {
      title: 'qn add recipes: add Docker, JWT auth, CI and more to an existing project',
      description:
        'qn add recipes for QuickNode projects: JWT auth, health checks, rate limit, graceful shutdown, Docker, GitHub Actions and AI agent instructions, idempotent and with --dry-run.',
      crumb: 'qn add'
    },
    pt: {
      title: 'Receitas do qn add: Docker, autenticação JWT, CI e mais num projeto existente',
      description:
        'Receitas do qn add para projetos QuickNode: autenticação JWT, healthcheck, rate limit, encerramento gracioso, Docker, GitHub Actions e instruções para agentes de IA, idempotentes e com --dry-run.',
      crumb: 'qn add'
    }
  },
  {
    slug: 'agents/',
    file: 'agents',
    menu: 'agents',
    updated: '2026-11-15',
    en: {
      title: 'QuickNode CLI for AI agents: non-interactive commands, JSON, MCP and error codes',
      description:
        'How AI coding agents should use QuickNode CLI: exact non-interactive commands with a pinned version, --json and --dry-run, qn schema, the MCP server and stable error codes with fixes.',
      crumb: 'For AI agents'
    },
    pt: {
      title: 'QuickNode CLI para agentes de IA: comandos não interativos, JSON, MCP e códigos de erro',
      description:
        'Como agentes de código com IA devem usar o QuickNode CLI: comandos não interativos com versão fixada, --json e --dry-run, qn schema, o servidor MCP e códigos de erro estáveis com correção.',
      crumb: 'Para agentes de IA'
    }
  },
  {
    slug: 'when/',
    file: 'when',
    menu: 'when',
    updated: '2026-11-15',
    en: {
      title: 'When to use QuickNode CLI, and when not to',
      description:
        'Clear criteria for choosing QuickNode CLI: use it for Express REST APIs with clean architecture and PostgreSQL; do not use it for front ends, monorepos, NestJS projects or other databases.',
      crumb: 'When to use'
    },
    pt: {
      title: 'Quando usar o QuickNode CLI, e quando não usar',
      description:
        'Critérios claros para escolher o QuickNode CLI: use para APIs REST com Express, arquitetura limpa e PostgreSQL; não use para front-end, monorepos, projetos NestJS ou outros bancos.',
      crumb: 'Quando usar'
    }
  },
  {
    slug: 'faq/',
    file: 'faq',
    menu: 'faq',
    updated: '2026-11-14',
    en: {
      title: 'QuickNode CLI FAQ: Node versions, --force, .env secrets and more',
      description:
        'Answers about QuickNode CLI: required Node.js version, writing into existing folders, generated secrets, offline use, telemetry and the QuickNode name.',
      crumb: 'FAQ'
    },
    pt: {
      title: 'Perguntas frequentes do QuickNode CLI: Node, --force, segredos do .env',
      description:
        'Respostas sobre o QuickNode CLI: versão do Node.js, gerar em pastas existentes, segredos gerados, uso offline, telemetria e o nome QuickNode.',
      crumb: 'Perguntas frequentes'
    }
  },
  {
    slug: 'compare/',
    file: 'compare',
    menu: 'compare',
    updated: '2026-11-14',
    en: {
      title: 'QuickNode vs Nest CLI vs a manual template: which one to use',
      description:
        'An honest comparison of QuickNode CLI, Nest CLI and copying a template by hand, with objective criteria: dependencies, architecture, framework lock-in and maintenance.',
      crumb: 'Comparison'
    },
    pt: {
      title: 'QuickNode × Nest CLI × template manual: qual usar',
      description:
        'Comparação honesta entre QuickNode CLI, Nest CLI e copiar um template à mão, com critérios objetivos: dependências, arquitetura, acoplamento ao framework e manutenção.',
      crumb: 'Comparação'
    }
  },
  {
    slug: 'changelog/',
    file: 'changelog',
    menu: 'changelog',
    updated: '2026-11-16',
    en: {
      title: 'QuickNode CLI changelog: what changed in each version',
      description:
        'Release notes of QuickNode CLI from v1.0.0 to v3: zero runtime dependencies, safe project generation, verifiable publishing and the documentation site.',
      crumb: 'Changelog'
    },
    pt: {
      title: 'Changelog do QuickNode CLI: o que mudou em cada versão',
      description:
        'Notas de versão do QuickNode CLI da v1.0.0 à v3: zero dependências de runtime, geração segura de projetos, publicação verificável e o site de documentação.',
      crumb: 'Changelog'
    }
  },
  {
    slug: 'adr/',
    file: 'adr',
    menu: 'adr',
    updated: '2026-11-14',
    en: {
      title: 'Architecture decision records (ADRs) of QuickNode CLI',
      description:
        'The architecture decision records behind QuickNode CLI: why it has zero dependencies, how it is published and how the documentation is built.',
      crumb: 'ADRs'
    },
    pt: {
      title: 'Registros de decisão de arquitetura (ADRs) do QuickNode CLI',
      description:
        'Os registros de decisão de arquitetura do QuickNode CLI: por que não tem dependências, como é publicado e como a documentação é construída.',
      crumb: 'ADRs'
    }
  },
  {
    slug: 'adr/001/',
    file: 'adr-001',
    parent: 'adr/',
    updated: '2026-11-14',
    en: {
      title: 'ADR-001: evolution, security and lightness of QuickNode CLI',
      description:
        'ADR-001 in full: diagnosis of v1.1.1, the five principles, decisions D1 to D9 (zero dependencies, safe templates, supply chain, docs, SEO, AI agents) and the phased plan.',
      crumb: 'ADR-001'
    },
    pt: {
      title: 'ADR-001: evolução, segurança e leveza do QuickNode CLI',
      description:
        'O ADR-001 completo: diagnóstico da v1.1.1, os cinco princípios, as decisões D1 a D9 (zero dependências, templates seguros, supply chain, docs, SEO, agentes de IA) e o plano por fases.',
      crumb: 'ADR-001'
    }
  }
];

/** Interface strings of the layout. */
export const UI = {
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    skip: 'Skip to content',
    siteLabel: 'QuickNode CLI documentation, home',
    language: 'Language',
    english: 'English',
    portuguese: 'Português',
    sections: 'Documentation',
    menu: 'MENU',
    fxHint: 'visual effects and animation',
    themeHint: 'switch to light theme',
    cliLabel: 'Optional command line. Type help to list commands.',
    cliPlaceholder: 'type help',
    cliOutput: 'Command output',
    breadcrumb: 'Breadcrumb',
    updated: 'Updated on',
    validFor: 'valid for',
    pager: 'More pages',
    previous: 'Previous',
    next: 'Next',
    top: 'top',
    footer:
      'Plain HTML, CSS and JavaScript: no frameworks, no trackers, no third-party resources.',
    source: 'Source code on GitHub',
    npm: 'Package on npm',
    by: 'Made by',
    ogAlt: 'Black terminal screen with green text: QuickNode CLI, create Node.js APIs with clean architecture.',
    notFoundTitle: 'Page not found | QuickNode CLI',
    notFoundDescription: 'This page does not exist in the QuickNode CLI documentation.',
    notFoundHeading: 'Bad command or file name',
    notFoundText: 'This page does not exist. Try the',
    notFoundHome: 'documentation home'
  },
  pt: {
    htmlLang: 'pt-BR',
    ogLocale: 'pt_BR',
    skip: 'Pular para o conteúdo',
    siteLabel: 'Documentação do QuickNode CLI, início',
    language: 'Idioma',
    english: 'English',
    portuguese: 'Português',
    sections: 'Documentação',
    menu: 'MENU',
    fxHint: 'efeitos visuais e animação',
    themeHint: 'mudar para o tema claro',
    cliLabel: 'Linha de comando opcional. Digite help para listar os comandos.',
    cliPlaceholder: 'digite help',
    cliOutput: 'Saída dos comandos',
    breadcrumb: 'Trilha de navegação',
    updated: 'Atualizado em',
    validFor: 'válido para a',
    pager: 'Mais páginas',
    previous: 'Anterior',
    next: 'Próxima',
    top: 'topo',
    footer: 'HTML, CSS e JavaScript puros: sem frameworks, sem rastreadores, sem recursos de terceiros.',
    source: 'Código-fonte no GitHub',
    npm: 'Pacote no npm',
    by: 'Feito por',
    ogAlt: 'Tela de terminal preta com texto verde: QuickNode CLI, crie APIs Node.js com arquitetura limpa.'
  }
};

/**
 * Portuguese text of the command reference. The English text comes straight
 * from spec.ts; a test fails when a command or flag has no translation here.
 */
export const COMMANDS_PT = {
  global: {
    help: 'Mostra a ajuda',
    version: 'Mostra a versão',
    json: 'Imprime um resultado JSON no stdout (sem perguntas, sem cores)'
  },
  commands: {
    create: {
      summary: 'Cria um projeto novo com arquitetura limpa',
      arguments: { name: 'Pasta e nome do pacote do projeto ("." para o diretório atual)' },
      options: {
        typescript: 'Usa o template TypeScript (também -ts)',
        javascript: 'Usa o template JavaScript (também -js)',
        force: 'Grava num diretório não vazio, sobrescrevendo os arquivos em conflito',
        yes: 'Aceita os padrões sem perguntar (nome, TypeScript, PostgreSQL)',
        'dry-run': 'Mostra o que seria criado sem gravar nada',
        install: 'Instala as dependências com o gerenciador do --pm depois de criar o projeto',
        git: 'Inicializa um repositório git',
        'no-credits': 'Deixa de fora do README a linha "Generated with QuickNode"',
        pm: 'Gerenciador de pacotes usado nos scripts, na documentação e no --install (padrão: npm)',
        test: 'Executor de testes (padrão: jest; node usa o node:test nativo)',
        db: 'Banco: postgres (Docker), sqlite (node:sqlite, sem driver) ou none (repositórios em memória)',
        preset: 'Parte de um preset (api-minima, api-postgres) ou de um arquivo JSON local; as flags vencem o preset'
      }
    },
    generate: {
      summary: 'Gera uma funcionalidade nas camadas da arquitetura limpa, já ligada',
      arguments: {
        type: 'O que gerar (crud = todas as partes)',
        name: 'Nome da funcionalidade, por exemplo product ou order-item'
      },
      options: {
        only: 'Com crud, gera só estas partes (separadas por vírgula: entity, repository, usecase, controller)',
        'no-test': 'Não gera o teste do caso de uso',
        'dry-run': 'Mostra os arquivos a criar ou alterar sem gravar nada',
        force: 'Sobrescreve arquivos existentes com conteúdo diferente'
      }
    },
    check: {
      summary: 'Verifica a regra de dependência: o domain não pode importar infrastructure, frameworks nem ORMs',
      options: {}
    },
    add: {
      summary: 'Adiciona uma ferramenta a um projeto existente (idempotente)',
      arguments: { recipe: 'Receitas a aplicar' },
      options: {
        'dry-run': 'Mostra o diff sem gravar nada',
        force: 'Sobrescreve arquivos existentes com conteúdo diferente'
      }
    },
    env: {
      summary: 'Compara o .env com o .env.example e gera os segredos que faltam (os valores nunca são impressos)',
      options: {
        'generate-secrets': 'Grava no .env as variáveis que faltam, com valores aleatórios para segredos e placeholders change-me',
        'dry-run': 'Com --generate-secrets, mostra o que mudaria sem gravar',
        force: 'Com --generate-secrets, troca também os segredos que já têm valor'
      }
    },
    upgrade: {
      summary: 'Aplica as melhorias de um template mais novo: atualiza os arquivos que você não alterou e mostra o diff dos outros',
      options: {
        'dry-run': 'Mostra o plano e os diffs sem gravar nada',
        yes: 'Aplica sem perguntar (obrigatório sem terminal)',
        force: 'Sobrescreve também os arquivos que você alterou (o diff é mostrado antes)'
      }
    },
    schema: {
      summary: 'Imprime em JSON a especificação completa de comandos, flags, valores e códigos de erro',
      options: {}
    },
    mcp: {
      summary: 'Roda um servidor Model Context Protocol no stdio para assistentes de IA (simulação por padrão)',
      options: {}
    },
    doctor: {
      summary: 'Verifica Node.js, .env, Docker, vulnerabilidades e a regra de dependência',
      options: {
        offline: 'Pula o npm audit (sem rede)'
      }
    },
    ui: {
      summary: 'Abre a documentação no navegador',
      arguments: { topic: 'Página a abrir' },
      options: {
        print: 'Só imprime o link, sem abrir o navegador',
        lang: 'Idioma da página (padrão: o do LANG)'
      }
    }
  }
};

/** Portuguese labels of the reference page (English is written inline in the generator). */
export const REFERENCE_TEXT = {
  en: {
    usage: 'Usage',
    alias: 'Alias',
    argument: 'Argument',
    arguments: 'Arguments',
    values: 'accepted values',
    options: 'Options',
    examples: 'Examples',
    help: 'Same text as',
    global: 'Global options',
    globalText: 'Accepted by every command.',
    exit: 'Exit codes',
    errors: 'Error codes',
    errorsText:
      'Every error has a stable code, a short message and, when known, a fix. With --json it goes to stdout as below; without it, to stderr with a "Fix:" line. Codes never change within a major version.',
    exitCodes: [
      'success',
      'the command failed (for example, the target folder is not empty, or qn check found violations)',
      'invalid usage: unknown command, flag or value'
    ]
  },
  pt: {
    usage: 'Uso',
    alias: 'Apelido',
    argument: 'Argumento',
    arguments: 'Argumentos',
    values: 'valores aceitos',
    options: 'Opções',
    examples: 'Exemplos',
    help: 'Mesmo texto de',
    global: 'Opções globais',
    globalText: 'Aceitas por todos os comandos.',
    exit: 'Códigos de saída',
    errors: 'Códigos de erro',
    errorsText:
      'Todo erro tem um código estável, uma mensagem curta e, quando conhecida, uma correção (fix). Com --json ele vai para o stdout como abaixo; sem, para o stderr com uma linha "Fix:". Os códigos não mudam dentro de uma versão major.',
    exitCodes: [
      'sucesso',
      'o comando falhou (por exemplo, a pasta de destino não está vazia, ou o qn check achou violações)',
      'uso inválido: comando, flag ou valor desconhecido'
    ]
  }
};
