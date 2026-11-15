# QuickNode CLI para agentes de IA

Um agente de código com IA cria uma API Node.js com arquitetura limpa rodando `npx @10565/quicknode-cli@3 create my-api --typescript --yes --json`: sem terminal nenhum comando pergunta nada, e os comandos imprimem JSON com `--json`, planejam com `--dry-run` e falham com um código de erro estável e uma correção.

Não confundir com QuickNode, o provedor de infraestrutura blockchain. Use sempre o nome do pacote com escopo, `@10565/quicknode-cli`; o comando que ele instala é o `qn`.

## Quais comandos um agente deve rodar?

Fixe a versão major e passe todo valor como flag. Sem terminal, o `qn` nunca pergunta: usa os padrões declarados ou para com `E_USAGE` e o comando exato que corrige.

```
$ npx @10565/quicknode-cli@3 schema
$ npx @10565/quicknode-cli@3 create my-api --typescript --yes --json
$ cd my-api
$ npx @10565/quicknode-cli@3 generate crud product --dry-run --json
$ npx @10565/quicknode-cli@3 generate crud product --json
$ npx @10565/quicknode-cli@3 add healthcheck docker --dry-run --json
$ npx @10565/quicknode-cli@3 check --json
```

## Qual é o fluxo recomendado?

1. Descubra: o `qn schema` devolve todos os comandos, flags, valores aceitos, padrões e códigos de erro. Não invente flags.
2. Planeje: rode o comando com `--dry-run --json` e mostre à pessoa os arquivos que seriam criados ou alterados (cada um com diff).
3. Aplique: rode de novo sem `--dry-run` quando a pessoa concordar.
4. Verifique: rode os testes e o `qn check` depois de cada mudança. Os dois são determinísticos e saem com código diferente de zero quando falham.

Os projetos gerados trazem um `AGENTS.md` (e um `CLAUDE.md` idêntico) com as camadas, a regra de dependência e estes comandos, e registram as decisões de arquitetura em `docs/adr/`.

## Como é o JSON?

Toda saída `--json` tem `ok` e `schemaVersion`; o formato só muda de forma incompatível numa versão major. Uma falha acrescenta `error` com `code`, `message` e, quando conhecido, `fix`:

```
{
  "schemaVersion": 1,
  "ok": false,
  "error": {
    "code": "E_DIR_NOT_EMPTY",
    "message": "Directory /work/my-api is not empty. Use --force to write into it anyway.",
    "fix": "qn create my-api --typescript --yes --json --force",
    "conflicts": ["README.md"]
  }
}
```

Todos os códigos de erro e de saída estão na [referência de comandos](https://daksonc.github.io/QuickNode/pt/commands/#errors).

## Como conecto como servidor MCP?

O `qn mcp` roda um servidor Model Context Protocol no stdio, dentro do mesmo pacote e sem dependências. As ferramentas são `qn_schema`, `qn_check`, `qn_doctor`, `qn_generate`, `qn_add`, `qn_env`, `qn_upgrade` e `qn_create`. As que gravam arquivos só planejam, a menos que recebam `"apply": true`.

```
{
  "mcpServers": {
    "quicknode": { "command": "npx", "args": ["@10565/quicknode-cli@3", "mcp"] }
  }
}
```

No Claude Code: `claude mcp add quicknode -- npx @10565/quicknode-cli@3 mcp`.

- Simulação por padrão: as ferramentas que gravam devolvem o plano, a menos que sejam chamadas com `"apply": true`, e arquivos com outro conteúdo só são sobrescritos com `"force": true`.
- Quem define o `apply` é o próprio agente, então o servidor não distingue isso da aprovação de uma pessoa. A pessoa mantém o controle pelo cliente MCP (Claude Code, Cursor…), que pede permissão antes de rodar uma ferramenta que grava: essas ferramentas vêm marcadas com `readOnlyHint: false`.
- Atua só dentro da pasta em que o servidor foi iniciado; caminhos fora dela são recusados.
- Sem rede e sem outros programas: o `qn_create` não instala dependências nem roda git, e o `qn_doctor` pula o Docker e o `npm audit`.

## É seguro instalar sem revisão?

- Nenhum script de ciclo de vida (`preinstall`, `postinstall`) e zero dependências de runtime.
- Nada é baixado enquanto um projeto é gerado; templates e receitas vêm dentro do pacote.
- Toda versão é publicada pelo GitHub Actions com provenance do npm, então a origem pode ser verificada.
- Nada é sobrescrito sem `--force`, e `npm install` ou `git init` só rodam com `--install` ou `--git`.

Na dúvida se a CLI serve para a tarefa? Veja [quando usar, e quando não usar](https://daksonc.github.io/QuickNode/pt/when/).

---

Atualizado em 2026-11-15 · válido para a v3.x · https://daksonc.github.io/QuickNode/pt/agents/

> Como agentes de código com IA devem usar o QuickNode CLI: comandos não interativos com versão fixada, --json e --dry-run, qn schema, o servidor MCP e códigos de erro estáveis com correção.
