# Sprint JSON Template (generico)

Modelo padrao pra arquivos `.harness/sprints/NN-*.json` e o `00-index.json`.

O Planner agent le a SPEC e gera arquivos neste formato. O workflow `/develop`
le os arquivos e implementa as features uma por uma.

---

## 1. Estrutura de diretorio

```
.harness/
  current.txt                   # Aponta pro arquivo do sprint atual (sem path, so o nome).
                                # "DONE" quando todos os sprints terminaram.
  sprints/
    00-index.json               # Indice mestre. Lista todos os sprints.
    01-NOMECURTO.json           # Sprint 1
    02-OUTRONOME.json           # Sprint 2
    ...
```

Convencoes de nome:

- `NN` zero-padded em 2 digitos (`01`, `02`, ..., `99`)
- nome curto kebab-case sem acentos: `01-fundacao`, `03-data-layer`,
  `06-frontend-modal`
- arquivo sempre `.json`

---

## 2. Template do `00-index.json`

```json
{
  "projectName": "Nome do projeto/feature em uma linha",
  "specPath": "SPEC.md",
  "totalSprints": 0,
  "schemaVersion": 2,
  "description": "O agente le APENAS o arquivo da sprint atual (apontado por .harness/current.txt) e processa as features em ordem. Apos cada feature, marca status=done + completedAt na propria feature daquele arquivo. Quando a ultima feature da sprint fica done, marca sprint.status=done E atualiza este indice E avanca current.txt para a proxima sprint.",
  "sprints": [
    {
      "index": 0,
      "file": "01-fundacao.json",
      "name": "Sprint 1 - Titulo curto: o que entrega",
      "status": "pending",
      "featuresCount": 0,
      "notes": "Opcional. Anotacoes especiais (ex: feat-008 quebrado em feat-008a..g)."
    }
  ]
}
```

Regras do indice:

- `index` comeca em 0 e e sequencial
- `file` e o nome do arquivo do sprint, relativo a `.harness/sprints/`
- `status` e um de: `pending` | `in-progress` | `done` | `failed` | `aborted`
- Status do indice e o **espelho** do `status` no arquivo da sprint. Sempre
  que um arquivo de sprint mudar status, o agente atualiza este indice.
- `featuresCount` ajuda no progress display sem precisar abrir cada arquivo

---

## 3. Template de arquivo de sprint

```json
{
  "index": 0,
  "name": "Sprint N - Titulo curto: o que entrega",
  "status": "pending",
  "description": "Paragrafo de 2-4 frases explicando o objetivo da sprint, o que ela NAO faz (escopo negativo), e como se conecta com sprints adjacentes.",
  "crossCutting": [
    "<id-de-contrato>"
  ],
  "features": [
    {
      "id": "feat-001",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "title": "Frase verbal curta: o que essa feature entrega",
      "description": "Paragrafo descrevendo a feature em prosa. Inclui contexto de POR QUE e nao so O QUE. Cita arquivos, funcoes e tipos especificos.",
      "specLines": "17-53",
      "files": [
        {
          "file": "src/types/example.ts",
          "lines": "1-200"
        }
      ],
      "acceptanceCriteria": [
        "Cada item e uma frase declarativa testavel objetivamente",
        "Use verbos no presente do indicativo: 'O tipo X esta exportado', 'A funcao Y aceita parametro Z'",
        "Inclua sempre: 'O arquivo compila sem erros TypeScript' como ultimo criterio",
        "De 3 a 7 criterios por feature. Mais que isso, quebra em duas features."
      ],
      "hints": [
        "Caminho: indicar arquivo + funcao + linha aproximada de pattern existente a copiar",
        "Pattern: dizer EXPLICITAMENTE qual pattern do codebase seguir (ex: 'igual ao bloco X em arquivo Y linhas N-M')",
        "Imports: listar de onde importar tipos/funcoes",
        "Edge cases: listar 1-2 gotchas especificos"
      ],
      "verification": {
        "typecheck": true,
        "parseable": true,
        "grepMustNotMatch": [
          "TODO\\(Sprint ",
          "throw new Error\\('not implemented'\\)",
          "FIXME"
        ],
        "grepMustMatch": [
          "export type ExampleType",
          "export function exampleFunction"
        ],
        "grepFiles": [
          "src/types/example.ts"
        ],
        "dependencies": [
          {
            "package": "<nome-do-pacote-se-novo>",
            "manifest": "package.json"
          }
        ],
        "smoke": {
          "command": "<comando-de-smoke-runtime-se-aplicavel>",
          "timeoutSeconds": 10,
          "expectedExitCode": 0
        }
      }
    }
  ]
}
```

---

## 4. Campo a campo (regras de ouro)

### Sprint level

#### `index`

Numero do sprint comecando em 0. Casa com `index` no `00-index.json`.

#### `name`

Frase de uma linha: `"Sprint N - Tema: o que entrega"`. Use dois-pontos pra
separar tema de detalhe.

#### `status`

Enum: `pending | in-progress | done | failed | aborted`. Atualizado em DOIS
lugares simultaneamente: este arquivo + `00-index.json`.

#### `description`

2 a 4 frases. Inclui:
- O que entrega (positivo)
- O que NAO faz nesta sprint (escopo negativo, importante pra evitar scope
  creep do agente)
- Conexao com sprint anterior/proxima (opcional mas ajuda)

---

### Feature level

#### `id`

`feat-NNN` zero-padded em 3 digitos. Comeca em `feat-001` e e sequencial
**dentro do sprint**. NAO reusa numeros em sprints diferentes (sprint 2 nao
recomeca com feat-001, continua a numeracao).

Quando uma feature original e quebrada em sub-features, usar sufixo:
`feat-008a`, `feat-008b`, etc. Documentar em `notes` do `00-index.json`.

#### `status`

Mesmo enum do sprint level. Default `pending`.

#### `startedAt` e `completedAt`

ISO 8601 UTC. `null` enquanto pending. Preenchido pelo agente.

ATENCAO: agentes pequenos carimbam timestamps errados (vimos `completedAt`
antes de `startedAt`). Se voce nao usa esses campos pra metrica, deixe `null`
sempre. Se usa, valide via codigo apos cada feature done.

#### `title`

Frase verbal curta. Max ~80 chars. Comeca com substantivo do que sera
entregue:
- BOM: "Tipos do Pipeline em types/pipeline.ts"
- RUIM: "Fazer os tipos"

#### `description`

Paragrafo de 2-3 frases. Cita arquivos, funcoes, tipos especificos. Da
contexto.

#### `specLines`

Range exato no arquivo de spec referenciado em `00-index.json::specPath`.
Formato: `"17-53"`.

REGRA CRITICA: seja apertado. Se a feature e descrita nas linhas 17-53,
ponha `"17-53"`. NAO ponha `"17-1016"` (le 1000 linhas inuteis e queima
contexto).

Aceitavel ter ranges multiplos: `"17-53,200-220"` se a spec realmente cobre
dois trechos.

#### `files`

Array de arquivos que a feature toca, com `lines` aproximadas pra leitura.
NAO usa como autoridade absoluta (o agente pode ter que ler outros pedacos).
E uma DICA pro agente saber por onde comecar.

```json
"files": [
  { "file": "electron/main/db.ts", "lines": "4500-4700" },
  { "file": "electron/main/db.ts", "lines": "1000-1200" }
]
```

Quando o arquivo nao existe ainda (vai ser criado): omitir `lines` ou usar
`"new"`:

```json
{ "file": "src/components/NewModule.tsx", "lines": "new" }
```

#### `acceptanceCriteria`

Lista de **3 a 5** frases declarativas testaveis. Cada uma deve ser verificavel
objetivamente:

- BOM: `"O tipo X = 'a' | 'b' esta exportado de src/types/foo.ts"`
- BOM: `"A funcao Y aceita o parametro opcional z?: Z"`
- RUIM: `"A integracao funciona"` (subjetivo)
- RUIM: `"O codigo esta limpo"` (subjetivo)

SEMPRE incluir o ultimo: `"O arquivo compila sem erros TypeScript"`.

**Por que 3-5 e nao 7?** Empiricamente, agentes pequenos (Qwen 27B etc) tem
tendencia a esvaziar `acceptanceCriteria` quando o contexto enche - como atalho
pra escapar do gate de self-review. Listas maiores parecem assustadoras e
incentivam o atalho. Listas curtas e densas sao respeitadas mais.

Se voce sente vontade de listar 8-10 criterios, e sinal de que a feature ta
grande demais. Quebra em duas.

#### `hints`

Lista de strings com dicas curtas. Tipos uteis:
- **Caminho:** "Arquivo: x.ts, funcao y, linha aproximada N"
- **Pattern:** "Seguir o pattern de Z (linhas 100-150)"
- **Import:** "Importar T de '../path'"
- **Edge case:** "Atencao: a coluna usa ALTER TABLE, nao DROP+CREATE"

Hints NAO sao requisitos, sao dicas. O agente pode ignorar se tiver razao.

#### `verification`

Objeto com checks programaticos pos-feature:

```json
{
  "typecheck": true,
  "parseable": true,
  "grepMustMatch": ["regex1", "regex2"],
  "grepMustNotMatch": ["regex_proibido_1", "regex_proibido_2"],
  "grepFiles": ["lista", "de", "arquivos"],
  "dependencies": [
    { "package": "react-markdown", "manifest": "package.json" }
  ],
  "smoke": {
    "command": "python -c \"from app.main import app; print('OK')\"",
    "timeoutSeconds": 10,
    "expectedExitCode": 0
  }
}
```

- `typecheck: true` -> apos a feature, rodar o comando de typecheck do projeto.
  Se aparecer erro NOVO, feature nao e done.
- `parseable: true` (default true se omitido) -> apos cada write, o workflow
  roda o parser nativo do formato (json.load, py_compile, tsc syntax-only,
  node --check, yaml.safe_load, tomllib.load) no arquivo editado. Exit code
  != 0 = arquivo truncado ou sintaxe quebrada. Mata o caso classico de
  `write_to_file` que cortou no meio do stream do LLM. Veja clinerules
  regra 0b para a lista de comandos por extensao.
- `grepMustMatch` -> regex que DEVEM aparecer nos `grepFiles`. Confirma que o
  agente realmente escreveu o que devia.
- `grepMustNotMatch` -> regex que NAO podem aparecer. Catch comum:
  `"TODO\\(Sprint"`, `"throw new Error\\('not implemented'\\)"`, `"FIXME"`,
  em-dash `"—"` se proibido.
- `grepFiles` -> arquivos onde rodar os greps.
- `dependencies` (opcional) -> lista de pacotes que devem estar declarados.
  Para cada `{package, manifest}`, o workflow roda grep no manifest. Se
  ausente, feature nao e done. Use quando a feature adiciona import novo
  de package externo (clinerules regra 12).
- `smoke` (opcional) -> comando de runtime smoke. Mata bugs que typecheck
  nao pega (async/sync mixing, API renomeada em lib, contrato divergente).
  Se exit code != `expectedExitCode`, feature nao e done. Mantenha o
  comando rapido (~10s) e idempotente.

Se algum check falhar, o agente NAO marca a feature como done.

#### `crossCutting` (sprint level, opcional)

Lista de identificadores de **contratos cross-cutting** que esta sprint toca.
Um contrato cross-cutting e qualquer estrutura que precisa ser identica em
mais de um lugar do codigo: schemas de eventos, formato de mensagens IPC,
tipos compartilhados back/front, payloads REST, enum de status.

```json
"crossCutting": [
  "events.sse.10events",
  "ipc.envelope.v1"
]
```

Cada `id` deve apontar pra **uma fonte canonica** definida na SPEC. O agente,
ao tocar arquivos relacionados a um id em `crossCutting`, valida que o que
escreve nao divergiu da fonte canonica antes de marcar feature como done
(workflow passo 5a). Veja clinerules regra 10.

Use isso especialmente quando:
- A sprint cria DOIS lados de um contrato (emitter + listener, server + client)
- A sprint redefine ou estende um schema existente
- A sprint adiciona campo em payload que cruza camadas

---

## 5. Best practices aprendidas

### 5.0 Bootstrap framework-specific em feat-001

Toda sprint 1 que envolve setup de framework deve incluir, na primeira feature,
a criacao dos arquivos GERADOS que esse framework requer pra typecheck/build
funcionar. Nao deixe pra "rodar dev depois".

| Framework | Arquivo a criar manual em feat-001 |
|-----------|-----------------------------------|
| Next.js | `next-env.d.ts` com 2 references |
| Vite + TS | `vite-env.d.ts` em `src/` |
| Astro | rodar `astro sync` |
| SvelteKit | rodar `svelte-kit sync` |
| Remix | `remix.env.d.ts` |

Coloque como acceptance criterion explicito: "frontend/next-env.d.ts existe
com referencias a `next` e `next/image-types/global`".

Sem isso, sprint 1 termina aparentemente verde, mas no primeiro typecheck
real o agente ve 200+ erros cascade e nao sabe diagnosticar.

**TypeScript path alias — sempre incluir `baseUrl`:**

Se a feat de scaffold do frontend define path alias (`paths` no
`tsconfig.json`), inclua TAMBEM `"baseUrl"`. Path alias sem `baseUrl` e
tecnicamente valido em algumas combinacoes de versao + `moduleResolution`,
mas o **TS Language Server** do editor reporta `Cannot find module
'@/...'` mesmo com `tsc --noEmit` passando. Resultado: arquivos que existem
aparecem como erro no editor, voce gasta tempo investigando bug que nao
e bug.

Acceptance criterion explicito sugerido:

```
"<frontend>/tsconfig.json define `compilerOptions.baseUrl: "."` E
 `compilerOptions.paths: {"@/*": ["./*"]}` (ambos juntos; um sem o outro
 quebra o TS Language Server)"
```

`verification.grepMustMatch` para o tsconfig: `["baseUrl", "paths"]`.

### 5.0a Sprint 00 — bootstrap DX (recomendado)

**Problema observado:** modelo local com harness rigido (regra 7: tocar so o
listado em `files[]`) NAO cria arquivos auxiliares de developer experience
por iniciativa propria. Modelos frontier (Claude, GPT-4) criam
`pyrightconfig.json`, `.vscode/settings.json`, `.editorconfig` no scaffold
sem voce pedir. Modelo pequeno nao. Resultado: editor cheio de squiggles
falsos (Pylance nao acha venv, CSS validator desconhece `@tailwind`,
TypeScript nao resolve path alias, etc.) e voce gasta 15min toda sprint
explicando que e falso positivo.

**Solucao:** crie uma **Sprint 00 — bootstrap DX** ANTES da Sprint 01 de
fundacao. Ela so faz arquivos de configuracao de IDE/tooling. Nao toca
codigo de aplicacao.

Estrutura recomendada (`00-bootstrap-dx.json`):

```
features:
  feat-001: .gitignore raiz + .editorconfig (cross-stack)
  feat-002: .vscode/settings.json (lint suppressions + interpreter paths)
  feat-003: .vscode/extensions.json (recomendacoes de extension)
  feat-004: pyrightconfig.json (se houver Python em subdir com venv local)
  feat-005: prettier + eslint config (se frontend)
```

**Por stack — itens minimos do `.vscode/settings.json`:**

| Stack | Settings essenciais |
|-------|---------------------|
| Python | (deixe a Python Extension descobrir o interpreter; configure `pyrightconfig.json` no diretorio do venv em vez de `python.defaultInterpreterPath` no settings — o ultimo da bug em Windows com paths relativos) |
| Tailwind | `css.lint.unknownAtRules: "ignore"` (e variantes scss/less) |
| TypeScript | `typescript.tsdk: "node_modules/typescript/lib"` |
| Cross | `files.eol: "\n"`, `files.insertFinalNewline: true`, `files.trimTrailingWhitespace: true` |

**Para Python com venv em subdir** (ex: `backend/.venv`): crie
`backend/pyrightconfig.json`:
```json
{
  "venvPath": ".",
  "venv": ".venv",
  "extraPaths": [".."]
}
```
NAO use `python.defaultInterpreterPath: "./backend/.venv/Scripts/python.exe"`
no `.vscode/settings.json` — o resolver da Python Extension em Windows nao
trata bem o `./` e mostra popup "interpreter could not be resolved" mesmo
quando o arquivo existe. Se for absolutamente necessario forcar, use
`${workspaceFolder}/backend/.venv/Scripts/python.exe` (interpolacao
explicita) — mas o `pyrightconfig.json` cobre o caso do Pylance/Pyright e
a Python Extension descobre via "Select Interpreter" comando.

**Por stack — itens minimos do `.vscode/extensions.json` (recommendations):**

| Stack | Extensions |
|-------|-----------|
| Python | `ms-python.python`, `ms-python.vscode-pylance` |
| Tailwind | `bradlc.vscode-tailwindcss` |
| TypeScript | `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` |

**Quando NAO criar Sprint 00:**

- Projeto single-stack simples sem ferramentas externas (CLI Python puro
  com `pip install` global, por exemplo).
- Projeto que ja vem clonado de um template com DX configurado.
- Projeto experimental que nao vai abrir no VSCode.

**Onde nao confundir Sprint 00 com Sprint 01:**

- Sprint 00 = arquivos de configuracao **do editor** e tooling de
  metaprojeto (`.vscode/`, `.editorconfig`, `pyrightconfig.json`,
  `prettier.config.js`).
- Sprint 01 = arquivos de configuracao **da aplicacao**
  (`pyproject.toml`, `package.json`, `tsconfig.json`, `next.config.mjs`,
  `tailwind.config.ts`).

A Sprint 00 e curta (3–5 features), nao tem typecheck (so `parseable: true`
nos JSONs), e fecha em 1–2 turns do agente. Mas previne 80% das falsas
queixas de "Pylance esta dando erro" ao longo de toda a execucao.

### 5.1 Tamanho da feature

- Idealmente 1 arquivo por feature. Maximo 2-3 quando inevitavel.
- Se a feature precisa editar 5+ arquivos, quebra em 2-3 features.

### 5.2 Granularidade

- Cada feature deve ser implementavel em 1 turno do agente, sem auto-compact.
- Se acceptance criteria tem mais de 7 itens, quebra.
- Se a feature gera arquivo > 100KB de codigo, quebra. write_to_file pode
  truncar.

### 5.3 Escopo negativo

- Sempre dizer o que a feature NAO faz. Especialmente em sprints de "fundacao"
  que preparam terreno pra sprints futuros.
- Exemplo: "Esta feature NAO cria os arquivos individuais X (sprint Y faz).
  Apenas o registro no index."

### 5.4 Contratos cross-camada

- Quando uma feature toca handler IPC + preload + frontend, **liste os 3
  arquivos**. Pular um deles e bug comum (campo perdido em runtime).
- `acceptanceCriteria` deve incluir: "O handler retorna o campo X" + "O
  preload tipa o campo X" + "O frontend usa o campo X".

### 5.5 Verification > confianca

- NUNCA confiar so em "agent disse que terminou".
- O bloco `verification` e o que diferencia "feature done de verdade" vs
  "agente escreveu qualquer coisa".
- Se voce nao consegue escrever um grep que prova que a feature esta correta,
  a feature ainda nao ta bem definida. Volte e detalhe os acceptance criteria.

### 5.6 Frases nao-deterministicas

NAO usar:
- "garantir que funcione"
- "validar que esta correto"
- "testar manualmente"

USAR:
- "O grep X retorna match"
- "O comando typecheck passa"
- "tail -c 100 do arquivo Y termina com '}'"

### 5.7 Arquivos grandes

Quando a feature mexe em arquivo > 50KB, incluir hint:

```
"Use replace_in_file ou apply_diff. NAO use write_to_file (estoura contexto e trunca)."
```

### 5.8 Boot/integration features

Toda sprint que adiciona algo que precisa estar no boot (registro de modulos,
listeners, handlers) deve ter feature dedicada chamando isso.

`acceptanceCriteria` deve incluir grep no arquivo de boot pra confirmar a
chamada.

---

## 6. Workflow do agente (referencia)

Pseudocodigo:

```
1. Ler .harness/current.txt -> nome do arquivo do sprint atual
2. Se contem "DONE": pipeline terminou, parar.
3. Ler .harness/sprints/<arquivo-do-sprint>.json
4. Achar primeira feature com status != done
5. Marcar status=in-progress, startedAt=now()
6. Ler specLines do specPath (range EXATO)
7. Ler files[] indicados (apenas as lines especificadas)
8. Implementar a feature respeitando acceptanceCriteria
9. Rodar verification:
   a. Se typecheck: rodar comando de typecheck do projeto
   b. Para cada grepMustMatch: confirmar match
   c. Para cada grepMustNotMatch: confirmar zero match
10. Self-review: re-ler arquivos, citar evidencia por criterio
11. Se passou: marcar status=done, completedAt=now()
12. Se falhou: voltar a implementar, max 3 tentativas
13. Apos ultima feature da sprint:
    a. Marcar sprint.status=done no arquivo da sprint
    b. Atualizar status no 00-index.json
    c. Atualizar current.txt pro proximo sprint (ou "DONE")
```

Detalhes em `WORKFLOW-TEMPLATE.md`.

---

## 7. Anti-patterns observados (NAO repetir)

### 7.1 Sprint marca done antes de tudo estar pronto

**Sintoma:** features todas done mas sprint root ainda pending; current.txt
nao avancou.

**Causa:** workflow nao tem passo explicito de "ao terminar ultima feature,
fechar sprint".

**Fix:** garantir o passo 13 do workflow.

### 7.2 Feature done com codigo truncado

**Sintoma:** write_to_file foi cortado no meio (ex: termina com
`const data = JSON.parse(fs.r`).

**Causa:** agente nao re-le o arquivo apos write_to_file. Confia no return.

**Fix:** verification.typecheck OBRIGATORIO. Hint explicito proibindo
write_to_file em arquivos grandes.

### 7.3 specLines amplo demais

**Sintoma:** agente le 1000 linhas quando precisava de 50, queima contexto.

**Fix:** specLines APERTADOS sempre. Multiplos ranges OK se justificado.

### 7.4 IPC sem espelho no preload

**Sintoma:** handler atualizado mas frontend nao recebe campo novo.

**Causa:** feature foi escrita do lado do main, esqueceu o caminho de leitura.

**Fix:** ao tocar contrato cross-camada, sempre listar os 3 arquivos
(handler, preload, caller) no `files[]`.

### 7.5 Hardcode de strings que deveriam derivar de constantes

**Sintoma:** ex: PHASE_NAMES hardcoded em vez de derivar de PHASES.

**Causa:** falta de hint apontando pra constante existente.

**Fix:** acceptanceCriteria explicito: "Os nomes sao derivados de
X.find(p => p.number === N).name, NAO hardcoded".

### 7.6 Typecheck false positive

**Sintoma:** comando rodou, deu exit 0, mas nao checou nada.

**Causa:** tsconfig raiz com `files: []` + project references sem `--build`.

**Fix:** validar no setup do workflow que o comando realmente checa.
Se retornou instantaneo sem saida, e suspeito.

### 7.7 Drift de contrato cross-cutting

**Sintoma:** typecheck passa nos dois lados, mas em runtime o lado A emite
`text_delta` e o lado B escuta `token`. Switch case nunca casa, evento perdido
silenciosamente. Ou: backend payload tem `total_tokens, sources`, frontend
espera `metrics: { tokens_in, ... }`.

**Causa:** mesmo contrato declarado em fontes diferentes (SPEC + clinerules +
tipos do lado A + tipos do lado B). Cada lado leu uma fonte diferente, ninguem
fez cross-check.

**Fix:** declarar UMA fonte canonica na SPEC. Adicionar `crossCutting` na
sprint level. Workflow passo 5a faz diff de campos vs fonte canonica antes do
done. Veja clinerules regra 10.

### 7.8 API inventada de lib externa

**Sintoma:** mypy/tsc passam, codigo importa OK, mas em runtime
`AttributeError: 'X' object has no attribute 'delete_config'`. O metodo na
versao real e `delete_thread`.

**Causa:** o tipo da lib externa e `Any` (ou nao tem stubs). Modelo "lembrou"
de uma API que nao existe nessa versao. Nada checa.

**Fix:** clinerules regra 11 (verificacao de API antes de chamar). Em duvida,
rode `python -c "import lib; print('METODO' in dir(lib.Cls))"` antes de codar.
Smoke gate da feature pega no boot.

### 7.9 Import de package nao declarado

**Sintoma:** `npm install` em maquina nova falha: `Cannot find module
'react-markdown'`. Codigo importa, package.json nao tem.

**Causa:** modelo escreveu `import` sem atualizar manifest. Em maquina dele
o package estava em cache global.

**Fix:** `verification.dependencies` na feature lista os packages novos.
Workflow passo 5b confirma que cada um esta no manifest. Tambem na regra 12
do clinerules.

### 7.10 Async/sync hack via new_event_loop

**Sintoma:** primeira chamada da tool em runtime levanta
`RuntimeError: This event loop is already running`. App fica inutil.

**Causa:** funcao sync (`@tool def`) faz `asyncio.new_event_loop()` +
`run_until_complete()` para chamar codigo async, mas ela esta sendo chamada
de DENTRO de outro event loop (LangGraph, FastAPI handler async, etc.).

**Fix:** declare a funcao `async def`. Frameworks modernos aceitam tools/
handlers async nativamente. Veja clinerules regra 13.

### 7.11 Truncamento fisico de arquivo grande durante write_to_file

**Sintoma:** arquivo termina no meio de uma string ou expressao
(`<div classNa`, `dleware: from f`, `"verification": {`). Bytes faltam no
final. Editor mostra erro vermelho.

**Causa:** o stream do LLM cortou no meio do write. Cliente flushou conteudo
parcial no disco. Sem fsync atomico (write tmp + rename), o resultado e o
parcial.

**Fix:** clinerules regra 0b (post-write parseability gate). Apos cada write,
roda parser nativo. Se exit != 0, e truncamento. `git checkout` e refaca.
Sprint JSONs e codigo nas linguagens suportadas estao protegidos por padrao
quando `verification.parseable: true` (default).

### 7.12 Tool de filesystem com limite de write silencioso

**Sintoma:** voce roda `write_to_file` em arquivo de 12KB, retorna
"successfully" mas o disco mostra so 9.4KB com truncamento. Nem o agente nem
o usuario percebem ate o parser estourar.

**Causa:** algumas implementacoes de tool de write tem buffer com limite que
flusha apenas ate certo numero de bytes (~9-10KB), descartando o resto.

**Fix:**
1. Confirme tamanho esperado vs tamanho no disco apos write.
2. Se diferente, divida em writes menores (write_to_file pra base +
   replace_in_file pra adicoes).
3. Mantenha arquivos de template abaixo de ~9KB sempre que possivel.
4. Para conteudo grande, divida em multiplos arquivos com referencia cruzada
   (ex: `CLINERULES-TEMPLATE.md` + `CLINERULES-V3-ADDITIONS.md` antes do
   merge final em v3).

### 7.13 Path alias TS sem baseUrl

**Sintoma:** `tsc --noEmit` passa, build de producao passa, mas no editor
(VSCode/Cursor) aparecem squiggles vermelhos `Cannot find module '@/...'`
em quase todo arquivo que usa path alias. Modelo confuso, voce gasta tempo
investigando "bug" que nao existe em runtime.

**Causa:** o `tsconfig.json` tem `paths: {"@/*": ["./*"]}` mas nao tem
`"baseUrl": "."`. Em algumas combinacoes de versao do TS + `moduleResolution:
"bundler"`, isso e tecnicamente valido (o `tsc` da linha de comando aceita).
Mas o TS Language Server do editor exige `baseUrl` para resolver path alias.

**Fix:** sempre incluir `baseUrl` junto com `paths` na feat de scaffold do
tsconfig. Acceptance criterion explicito + `grepMustMatch: ["baseUrl",
"paths"]` no JSON da sprint. Veja secao 5.0.

### 7.14 Imports absolutos com prefixo de pacote rodam de cwd diferente do esperado

**Sintoma:** mypy passa, type checker passa, mas em runtime `python -m
<package>` falha com `ModuleNotFoundError: No module named '<package>'`.
Smoke test que estava no JSON da sprint nao roda.

**Causa:** voce escolheu convencao "imports absolutos a partir do nome do
sub-diretorio" (ex: `from <package>.X import Y` onde `<package>` esta em
`<repo>/<package>/`). Esse padrao exige que o **cwd seja a raiz do repo,
NAO a subpasta `<package>/`**.

Mypy/pyright/pyrefly podem ser permissivos e adicionar `..` ao path
automaticamente. Runtime e ferramentas mais rigorosas (uvicorn, scripts
chamados via `python -m`, smoke tests) NAO sao.

**Fix:**
1. Documente em clinerules secao 8 (invariantes do projeto) qual e o cwd
   canonico para rodar comandos. Ex:
   > "Para rodar este projeto, o cwd correto e a raiz do repo
   > (`<nome-repo>/`), nao a subpasta `<package>/`."
2. Comandos de smoke no JSON da sprint devem usar:
   - `uv run python -m <package>.scripts.<script>` (cwd raiz)
   - `uv run --directory <package> python scripts/<script>.py` (cwd raiz, uv muda)
   - NAO `cd <package> && uv run python scripts/<script>.py` — quebra
3. README do projeto: documentar comandos canonicos.

### 7.21 Passar `model_dump()` de BaseMessage do LangChain direto pro OpenAI SDK

**Sintoma:** OpenAI SDK ou LM Studio rejeita payload com erro:
`Your payload's 'messages' array is misformatted. It must only contain
objects with a 'role' field. Got 'undefined'`. Backend log mostra a
chamada saindo, mas LLM responde 400.

**Causa:** o agente usa LangChain (`HumanMessage`, `AIMessage`, etc.) para
o estado interno do grafo, mas precisa converter para o formato da OpenAI
Chat Completions API antes de enviar. Conversao via `model_dump()` direto
NAO faz isso — produz o dict interno do LangChain:

```python
# PROIBIDO — model_dump produz "type" interno do LangChain
msg = HumanMessage(content="opa")
msg.model_dump()
# {'content': 'opa', 'type': 'human', 'additional_kwargs': {}, ...}
```

OpenAI espera:
- `{"role": "user", "content": "..."}` (nao `type: "human"`)
- `{"role": "assistant", "content": "...", "tool_calls": [...]}`
- `{"role": "system", "content": "..."}`
- `{"role": "tool", "content": "...", "tool_call_id": "..."}`

**Fix (LangChain):** usar o conversor oficial:
```python
from langchain_core.messages.utils import convert_to_openai_messages

messages_dicts = convert_to_openai_messages(state["messages"])
```

**Generalizacao:** sempre que voce mistura **frameworks de mensagem
diferentes** (LangChain BaseMessage <-> OpenAI Chat <-> Anthropic Message
<-> framework proprio), use o conversor oficial do framework de origem.
Nao improvise via `dict()`/`model_dump()`/`asdict()`. Outras conversoes
similares:
- `langchain_core.messages.utils.convert_to_anthropic_messages`
- `anthropic._utils._messages.convert_to_openai_messages` (algumas versoes)

**Acceptance criterion explicito** em features que invocam SDK de LLM
direto: "messages do estado interno do grafo nao sao passadas via
`model_dump()`/`dict()` — usam o conversor oficial do framework de
origem (`convert_to_openai_messages`, etc.)"

`verification.grepMustNotMatch` em arquivos que chamam SDK de LLM:
- `model_dump\\(\\)\\s*for\\s+msg\\s+in`
- `\\[m\\.dict\\(\\)\\s+for`

### 7.20 SSE com `data` como dict Python em vez de string JSON serializada

**Sintoma:** frontend abre EventSource, recebe primeiro evento, e quebra com
`SyntaxError: Unexpected token in JSON at position 1` no `JSON.parse(e.data)`.
Backend log mostra evento sendo emitido normalmente. mypy/tsc/build passam.

**Causa:** bibliotecas como `sse-starlette` em Python (e equivalentes em
Node) recebem `{event, data}` onde **`data` deve ser STRING ja serializada
como JSON**, nao dict/objeto. Quando o agente passa dict Python:

```python
# PROIBIDO
return {"event": "token", "data": {"run_id": "X", "delta": "hello"}}
```

A biblioteca aplica `str(dict)` por baixo, produzindo:
```
data: {'run_id': 'X', 'delta': 'hello'}
```

Aspas SIMPLES — nao e JSON valido. `JSON.parse` no cliente quebra.

**Fix:** sempre `json.dumps()` o payload antes de retornar:

```python
import json

def emit_token(run_id: str, delta: str) -> dict:
    return {
        "event": "token",
        "data": json.dumps({"run_id": run_id, "delta": delta}),
    }
```

Ou use helper interno:
```python
def _event(name: str, payload: dict) -> dict:
    return {"event": name, "data": json.dumps(payload, ensure_ascii=False)}
```

**Acceptance criterion explicito** em features que emitem SSE:
"Cada funcao emit_* retorna dict com `data` STRING (resultado de
`json.dumps()`), nao dict Python."

`verification.grepMustMatch` em `sse_emitter.py` ou equivalente:
`["json.dumps"]`. Se grep retorna 0 matches mas o codigo emite dicts, e
sintoma do bug.

**Smoke gate runtime:** abrir EventSource em modo de teste, enviar 1
evento, fazer `JSON.parse(e.data)`. Se quebrar com SyntaxError, gate
falhou.

### 7.18 CSS Grid com numero de tracks errado vs filhos do container

**Sintoma:** layout do app fica completamente torto. Sidebar aparece
cortada na borda da tela, conteudo deslocado, regioes que deveriam estar
visiveis somem. mypy/tsc/build de producao TODOS passam — bug e
puramente visual.

**Causa:** o agente declarou `grid-template-columns` com **N tracks** mas o
container `.app` tem **M > N elementos filhos**. CSS Grid com auto-flow
distribui os elementos nos tracks disponiveis, criando rows extras quando
faltam tracks. Como `grid-template-rows: 100vh` define apenas uma row, as
rows extras estouram a viewport e o layout colapsa.

```css
/* PROIBIDO — 3 tracks mas 5 filhos no JSX */
.app {
    display: grid;
    grid-template-columns: 280px 1fr auto;   /* 3 tracks */
    grid-template-rows: 100vh;
}
```

```jsx
{/* JSX com 5 elementos em .app: */}
<div className="app">
    <Sidebar />
    <div className="col-divider" />
    <Chat />
    <div className="col-divider" />
    <TracePanel />
</div>
```

**Fix:** declare explicitamente UM track por filho. Para layout
3-colunas-com-divisores:

```css
.app {
    display: grid;
    grid-template-columns: 280px 1px minmax(420px, 1fr) 1px auto;
    /*                    sidebar div  chat              div tracepanel */
}
```

**Acceptance criterion explicito** quando feature define grid-based
layout: "O numero de tracks em `grid-template-columns` (e
`grid-template-rows` se aplicavel) **bate exatamente** com o numero de
filhos diretos renderizados em todos os estados do componente."

`verification.grepMustMatch` para tornar o numero de tracks visivel:
- `["grid-template-columns:\\s*(\\d+(px|fr|%)?\\s*){N}"]` onde N e o numero
  de filhos. Mas regex pra contar e dificil — melhor verificar
  manualmente em self-review.

### 7.19 Frontend "build OK + typecheck OK" nao garante layout correto

**Sintoma:** sprint frontend declara done com todos os gates verdes (tsc,
build, grep, smoke de import). Em runtime, abrindo o browser, o layout
tem problemas visuais graves: elementos sobrepostos, regioes invisiveis,
overflow, alinhamentos quebrados, espacamentos errados.

**Causa:** os gates atuais do harness (`<TYPECHECK_CMD>`, `pnpm build`,
grep) so validam **estrutura sintatica** do codigo. Eles NAO validam:
- Numero de tracks de grid vs filhos (anti-pattern 7.18)
- Largura efetiva de elementos vs viewport
- Z-index e empilhamento de modais
- Variaveis CSS referenciadas mas nao declaradas
- Classes mencionadas no JSX mas sem regra correspondente
- overflow horizontal/vertical
- font-family que nao foi carregada

Esses bugs **so aparecem no runtime visual**.

**Fix proposto pro harness** (ainda nao aplicado em v4 — futuro):
1. **Smoke visual** na ultima feature da sprint frontend: rodar Playwright
   ou Puppeteer headless, abrir `localhost:3000`, tirar screenshot, e
   compara com baseline. Falha = layout regrediu.
2. **Auditoria humana obrigatoria** ao fim de cada sprint frontend: o
   humano abre o browser e confere visualmente. NAO basta o agente dizer
   "feature done".
3. **Gates auxiliares mais baratos**:
   - `grep` que conta filhos do container vs tracks declaradas (regex
     manual sobre o componente raiz)
   - parse do CSS pra extrair classes definidas vs `grep` no JSX pelas
     classes referenciadas; toda classe usada deve existir no CSS

Em v4, ainda nao temos smoke visual. Por enquanto, **toda sprint
frontend deve incluir um lembrete em `notes` do `00-index.json`:**
"Validacao manual no browser obrigatoria ao fim — gates mecanicos nao
pegam bug de layout."

### 7.17 Check de "porta livre" dentro do lifespan/startup do framework web

**Sintoma:** o backend FastAPI/Express/etc. levanta erro como "porta X
ocupada" no startup mesmo quando a porta esta livre. Em modo `--reload` ou
em re-runs proximos, falha intermitentemente.

**Causa:** a SPEC pediu "checar se porta esta disponivel antes de subir" e
o agente colocou esse check **dentro do lifespan/startup hook do framework**
fazendo `socket.bind(host, port)`. Mas frameworks web fazem o bind real da
porta ANTES de chamar o lifespan. Resultado: o `socket.bind` do lifespan
colide com o proprio servidor — ele se reporta como "ocupada" sozinho.

```python
# PROIBIDO — check de porta no lifespan da FastAPI:
@asynccontextmanager
async def lifespan(app: FastAPI):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", PORT))   # COLIDE com o uvicorn
    # ...
```

**Fix:**
1. **Remover** o check do lifespan. Se a porta estiver de fato ocupada
   por OUTRO processo, o framework (uvicorn, etc.) falha com
   `OSError: [Errno 98] address already in use` ANTES do lifespan ser
   chamado. Mensagem ja e clara.
2. Se voce quer mensagem mais amigavel, faca o check em **script wrapper
   ANTES de invocar o servidor**, nao no lifespan:
   ```bash
   # run-backend.sh
   python -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 8000)); s.close()" || {
     echo "porta 8000 ocupada"; exit 1
   }
   uvicorn backend.main:app --port 8000
   ```

**Generalizacao:** checks que validam **recursos do proprio processo** (porta
escutada por mim, arquivo aberto por mim, lock que eu vou tomar) nao podem
viver dentro do startup do framework. Tem que viver em wrapper externo.

### 7.16 Path relativo ao cwd em arquivos de configuracao silenciosamente perdido

**Sintoma:** `Settings()` ou equivalente carrega defaults vazios em runtime,
levantando ValidationError mesmo com o arquivo de config (`.env`,
`config.toml`, `secrets.yaml`, etc.) preenchido corretamente. Funciona em
modo dev (cwd dentro do package), quebra quando voce roda da raiz do repo.

**Causa:** o codigo usa string relativa para apontar o arquivo de config:
```python
# Python (pydantic-settings):
model_config = SettingsConfigDict(env_file=".env", ...)

# Python (dotenv puro):
load_dotenv(".env")

# Node (dotenv):
require('dotenv').config({ path: '.env' })
```

Path relativo resolve contra o cwd ATUAL no momento da execucao. Se o
projeto tem cwd canonico fora do diretorio do package (ver 7.14), a busca
pelo arquivo cai em lugar errado. O config nao e carregado, defaults vazios
ou ausentes propagam, e a falha aparece como erro de validacao em vez de
"arquivo nao encontrado" — confundindo o debug.

**Fix:** sempre use **path absoluto baseado na localizacao do arquivo de
codigo**, nao relativo ao cwd:

```python
# Python (pydantic-settings):
from pathlib import Path
_ENV_FILE = Path(__file__).resolve().parent / ".env"
model_config = SettingsConfigDict(env_file=str(_ENV_FILE), ...)

# Node (dotenv):
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
```

**Acceptance criterion explicito na feature de config:** "O carregamento do
arquivo de config usa path absoluto baseado em `__file__` (Python) ou
`__dirname` (Node), nao string relativa ao cwd."

`verification.grepMustNotMatch` para o arquivo de config:
- Python: `env_file="\\.env"`, `env_file='\\.env'`, `load_dotenv\\("\\.env"\\)`
- Node: `path:\\s*['"]\\.env['"]`

### 7.15 Auto-condense do harness do agente desincroniza o JSON da sprint

**Sintoma:** o agente declarou que terminou todo o desenvolvimento.
`current.txt = DONE`, `00-index.json` mostra todas as sprints `done`. Mas
abrindo o JSON de uma sprint individual, voce ve features ainda como
`pending` ou `in-progress`, e `sprint.status="in-progress"`. Os arquivos de
codigo da sprint EXISTEM no filesystem e funcionam.

**Causa:** o harness do agente (Cline ou similar) disparou auto-condense
no meio da sprint. Quando o agente retomou, ele:
- Atualizou `00-index.json` marcando sprint como `done`
- Avancou `current.txt`
- **Pulou** o passo de marcar features individuais e sprint root como `done`
  no JSON da sprint

Resultado: implementacao OK, JSON inconsistente, gate de fechamento
falhou parcialmente.

**Fix:**
1. No `develop.md` Setup 2, adicione passo de **idempotencia**: antes de
   abrir a sprint atual, valide que TODAS as sprints anteriores estao
   fechadas individualmente (sprint.status=done E features.status=done).
2. Se detectar incoerencia, NAO comece a feat-001 — volte e feche o JSON
   da sprint anterior com timestamps consistentes. So entao prossiga.
3. Inserido no template em `Setup 2.2a`.

---

## 8. Geracao automatica via Planner

Quando o Planner agent gerar sprints, deve:

1. Ler SPEC inteira
2. Identificar fases logicas (geralmente: types -> infra -> backend -> frontend
   -> integration -> metrics)
3. Pra cada fase, criar 1 sprint com 4-8 features
4. Pra cada feature, preencher TODOS os campos do template
5. Cross-validar:
   - nenhum acceptance criterion subjetivo
   - todo grep referencia arquivo realmente editado
   - todo specLines apertado (< 100 linhas idealmente)

Verificacao automatica do output do Planner (script futuro):

```bash
node scripts/validate-sprint-json.js .harness/sprints/01-*.json
```

Esse script ainda nao existe. Quando criar, deve checar:

- Schema valido
- specLines apertado (range < 100 linhas idealmente)
- acceptanceCriteria nao tem palavras vagas
- verification.grepMustMatch nao vazio se feature criou export
- Files referenciados existem (ou serao criados na feature)
