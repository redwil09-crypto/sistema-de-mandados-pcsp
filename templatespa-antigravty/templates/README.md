# Harness Templates

Conjunto de 6 documentos genericos pra rodar agentes de codigo (Cline, Claude
Code, etc) em **autopilot** executando sprints de implementacao a partir de uma
SPEC.

Estes arquivos sao **genericos**. Para usar em um projeto novo: copie cada um
pro lugar correto e substitua os placeholders `<<...>>` e `<...>` pelos valores
do seu projeto.

**Versao atual: v3 (2026-04-27).** Veja `CHANGELOG.md` para o que mudou e qual
classe de bug cada regra/gate previne.

---

## Os 6 documentos

### 1. `SPEC-TEMPLATE.md`

**Vai em:** raiz do projeto, como `SPEC.md`.

**Para que serve:** documento mestre da feature/projeto que vai ser
implementado. E o INPUT do Planner. Deve ser bem dividido em secoes pequenas
para que cada feature da sprint possa apontar pra um range exato de linhas.

### 2. `SPRINT-TEMPLATE.md`

**Vai em:** referencia de formato. Os arquivos JSON gerados ficam em
`.harness/sprints/`.

**Para que serve:** especifica o formato dos `.harness/sprints/NN-*.json` e
do `.harness/sprints/00-index.json`. O Planner gera arquivos neste formato,
e o workflow `/develop` os consome.

### 3. `CLINERULES-TEMPLATE.md`

**Vai em:** `.clinerules/clinerules.md` no projeto alvo.

**Para que serve:** regras que o agente le todo turno. Invariantes (TS sem
any, sem placeholder, integridade pos-edicao, self-review obrigatoria,
escopo apertado, anti-esvaziamento de criterios, pre-flight checks, bootstrap
framework, etc).

### 4. `WORKFLOW-TEMPLATE.md`

**Vai em:** `.clinerules/workflows/develop.md` no projeto alvo.

**Para que serve:** procedimento operacional do agente em modo autopilot.
Como ler current.txt, capturar baseline, executar feature, gates mecanicos,
self-review, fechar sprint, avancar.

### 5. `stack-quirks.md`

**Vai em:** referencia de consulta. Pode ficar em `.harness/templates/` ou
linkar do README do projeto.

**Para que serve:** lista vivente de gotchas conhecidos por framework
(Next.js next-env.d.ts, Tailwind v3 vs v4, LangGraph SqliteSaver, etc).
Antes de rodar harness em projeto novo, consulta. Quando descobrir gotcha
novo durante execucao, adiciona aqui pra proxima.

### 6. `CHANGELOG.md`

**Vai em:** referencia de evolucao do harness.

**Para que serve:** registra cada bug que ja foi observado em projetos
anteriores e qual regra/gate dos templates previne ele agora. Ler antes de
modificar os templates pra entender por que cada regra esta la. Quando rodar
auditoria de projeto novo e descobrir bug ainda nao coberto, adicione entrada.

---

## Setup em um projeto novo

```bash
# Na raiz do projeto novo:
mkdir -p .clinerules/workflows .harness/sprints

# Copie os templates:
cp <ESTE_REPO>/.harness/templates/CLINERULES-TEMPLATE.md .clinerules/clinerules.md
cp <ESTE_REPO>/.harness/templates/WORKFLOW-TEMPLATE.md   .clinerules/workflows/develop.md
cp <ESTE_REPO>/.harness/templates/SPEC-TEMPLATE.md       SPEC.md

# Edite cada um substituindo os placeholders.
```

Ordem recomendada de preenchimento:

1. **SPEC.md** primeiro. Sem SPEC, nao da pra gerar sprints.
2. **clinerules.md** (depois do SPEC) - voce ja sabe o stack do projeto, entao
   da pra preencher placeholders como `<TYPECHECK_CMD>`, `<DB_FILE_PATH>`,
   `<TYPES_DIR>`, `<SHELL>`, e a secao 8 (invariantes do projeto).
3. **workflow develop.md** - mesmos placeholders, mais alguns como
   `<TYPECHECK_GREP>`, `<TMP_DIR>`, `<HARNESS_DIR>`, `<TOTAL_SPRINTS>`.
4. **Planner roda** e gera os JSONs em `.harness/sprints/` (ainda manual: voce
   pede pro Cline ou outro agente "leia SPEC.md e gere sprints conforme
   SPRINT-TEMPLATE.md").
5. **`.harness/current.txt`** com o nome do primeiro sprint:
   ```
   01-fundacao.json
   ```
6. **Rode `/develop`** no Cline. Autopilot executa.

---

## Fluxo end-to-end

```
[ Humano escreve SPEC.md ]
            |
            v
[ Planner agent le SPEC e gera .harness/sprints/*.json ]
            |
            v
[ Humano confere os JSONs (specLines apertados? grepMustMatch faz sentido?) ]
            |
            v
[ Humano roda /develop no Cline ]
            |
            v
[ Cline autopilot ]
   |
   +-- le current.txt
   +-- abre sprint atual
   +-- pra cada feature:
   |     +-- le specLines + files[]
   |     +-- implementa
   |     +-- gates: typecheck + grep
   |     +-- self-review
   |     +-- marca done
   +-- fecha sprint
   +-- avanca current.txt
   +-- repete ate "DONE"
            |
            v
[ Humano valida: smoke test do app, code review, deploy ]
```

---

## Customizacao por stack

### TypeScript / Node / Web

`<TYPECHECK_CMD>` = `npm run typecheck` (depois de garantir que esse script
realmente checa o que voce edita).

Se seu tsconfig raiz tem `"files": []` + project references, o `tsc --noEmit`
direto na raiz NAO checa nada. Defina:

```json
"scripts": {
  "typecheck": "npm run typecheck:main && npm run typecheck:client",
  "typecheck:main": "tsc --noEmit -p server/tsconfig.json",
  "typecheck:client": "tsc --noEmit -p client/tsconfig.json"
}
```

### Python

`<TYPECHECK_CMD>` = `mypy --strict <package>` ou `pyright`.

Adapte o `findstr` / `grep` no workflow conforme o shell.

### Outras linguagens

Substitua `TypeScript` por `Rust`, `Go`, `Kotlin`, etc nas regras 1 e 4 do
clinerules. Substitua o comando de typecheck.

---

## Glossario rapido

| Termo | Significado |
|-------|-------------|
| **Sprint** | Bloco de features implementadas em sequencia. Mora em um arquivo JSON em `.harness/sprints/`. |
| **Feature** | Unidade atomica de implementacao. Cabe em 1 turno do agente. Tem acceptance criteria + verification. |
| **Gate mecanico** | Verificacao programatica (typecheck, grep) que bloqueia o agente de marcar feature como done. |
| **Self-review** | Releitura integral + citacao de evidencia por criterio antes de marcar done. |
| **Baseline** | Snapshot de erros pre-existentes pra detectar erros NOVOS introduzidos pela feature. |
| **Planner** | Agente (ou humano) que le SPEC e gera os JSONs de sprint. |
| **Workflow** | Procedimento operacional invocado por slash command (ex: `/develop`). |
| **Invariante** | Regra que vale sempre, em qualquer task (mora em clinerules). |

---

## Limitacoes conhecidas e quando NAO usar

Esses templates assumem:

1. **Codigo principalmente em arquivos de texto** (TS, JS, Python, Rust, etc).
   Nao funciona bem pra projetos com geracao de assets binarios complexos.

2. **Estrutura modular bem definida**. Se o projeto e um monolito de 50k linhas
   sem boundaries claros, o Planner vai ter dificuldade em criar features
   atomicas.

3. **Suite de testes ou typecheck rapido**. Os gates mecanicos precisam rodar
   em segundos. Se seu typecheck demora 10 minutos, o autopilot vai ser
   doloroso.

4. **Agente com contexto razoavel** (>= 100k tokens). Modelos com 32k de
   contexto vao estourar muito antes de fechar uma sprint.

5. **Ferramentas de edicao confiaveis**. write_to_file e replace_in_file
   precisam funcionar bem. Modelos pequenos podem truncar - daí as regras de
   anti-truncamento.

Se algum desses nao se aplica, o autopilot vai sofrer. Considere modo manual
(`/feature` em vez de `/develop`) ate o setup amadurecer.

---

## Onde melhorar

Coisas que ainda nao estao nos templates mas valem adicionar conforme a
pratica:

- Script `scripts/validate-sprint-json.js` que valida os JSONs gerados pelo
  Planner antes de comecar a executar.
- Pre-commit hook que roda typecheck e bloqueia commits com regressao.
- Workflow `/feature` (manual, uma feature por vez, com confirmacao humana
  entre etapas) pra modo aprendizado / debug.
- Workflow `/replan` que rerun do Planner apos a SPEC mudar, atualizando
  `specLines` em todos os JSONs.
- Telemetria de execucao (custo, tempo, retries) em `.harness/metrics/`.

Cada projeto novo que rodar com esses templates vai descobrir mais coisas.
Adicione aqui ou no LEARNINGS.md do projeto.

---

## Melhorias v3

Versao 3 (2026-04-27) consolidou cinco classes de bug observadas em
auditoria de projeto real, e introduziu gates/regras genericas que cada
projeto novo herda automaticamente. Resumo:

| Bug observado | Mudanca v3 | Tipo |
|---|---|---|
| Truncamento de arquivos durante `write_to_file` | Regra 0b (parseability gate) + Workflow passo 5 | Gate mecanico |
| Drift entre fontes de verdade duplicadas (10 eventos SSE divergentes) | Regra 10 + campo `crossCutting` + Workflow passo 5a | Disciplina + gate |
| API inventada de lib externa (metodo fantasma na versao real) | Regra 11 (verificacao de API antes de chamar) | Disciplina |
| Import sem dep declarada (npm install falha em maquina nova) | Regra 12 + `verification.dependencies` + Workflow passo 5b | Gate mecanico |
| Typecheck cego pra runtime (mypy passou, app nao roda) | `verification.smoke` + Workflow passo 8a | Gate runtime |

Bonus: regra 13 (async/sync hack proibido), motivada por tools que
misturam `asyncio.new_event_loop()` em sync wrappers e quebram no primeiro
hit do event loop.

Filosofia das mudancas v3:

- Gates mecanicos batem regras textuais. "Releia ultimas 20 linhas"
  depende de julgamento, "rode parser e cheque exit code" nao depende.
- Falhar cedo bate falhar em producao. Smoke de 10s na feature mata bug
  que so apareceria em integration test.
- UMA fonte canonica bate N copias. Drift e silencioso e devastador.
- Validar suposicoes externas (API de lib, presenca de package, comando
  no PATH) fica em gate explicito, nao em premissa.
- Sem hardcode de stack. Tabelas de comandos sao mapas extensiveis.

Detalhes por regra/gate em `CHANGELOG.md`.

---

## Melhorias v4

Versao 4 (auditoria de projeto seguinte rodando o harness v3 de ponta a
ponta com modelo local pequeno) descobriu mais 9 classes de bug que **o
harness v3 nao prevenia**. Introduzidos os gates/regras a seguir:

| Bug observado | Mudanca v4 | Tipo |
|---|---|---|
| Pastas e `__init__.py` criados na raiz do repo em vez do subdiretorio listado em `files[]` | Regra 0a-bis (path placement gate) + Workflow passo 5z | Gate mecanico |
| Imports quebrados acumulando ate o fim da feature porque `py_compile` so checa sintaxe | Regra 0c (import-resolution gate por arquivo) + Workflow Gate 1.5 | Gate mecanico |
| em-dash e smart quotes copiados literal de SPEC para codigo apesar de proibidos | Regra 0d (Unicode gate por write) + Workflow Gate 1.6 | Gate mecanico |
| Self-review batch ao fim da sprint em vez de feature por feature; varias features marcadas done sem ter passado pelos gates individualmente | Regra 14 (lifecycle por feature) + Workflow passo 13b | Disciplina + gate |
| Auto-mentira no self-review ("mypy zero erro" sem ter rodado) | Regra 15 (honestidade reforcada — citar comando + exit code + tail literal) | Disciplina |
| Regra de "PARE se contexto > 85%" misturava gerenciamento de tokens (que e do harness do agente) com workflow de codigo, e modelo pequeno parava sozinho | Removidas todas as referencias a contexto/`/compact` do workflow | Limpeza |
| Auto-condense do harness do agente desincroniza JSON da sprint (00-index marca done, JSON individual ainda pending) | Workflow Setup 2a (idempotencia: validar sprints anteriores fechadas) | Gate mecanico |
| Path alias TS sem `baseUrl` quebra TS Language Server mesmo com `tsc` passando | SPRINT-TEMPLATE 5.0 + 7.13 (sempre incluir baseUrl junto com paths) | Disciplina |
| Cross-cutting "verifiquei e bate" sem diff campo a campo permitiu drift silencioso (lado A emite campo X, lado B tipa campo Y) | Regra 10 reforcada com gate de diff mecanico explicito + Workflow passo 5a | Gate mecanico |
| `pydantic-settings`/`dotenv` com path relativo ao cwd perde o arquivo de config quando rodado da raiz | Anti-pattern 7.16: usar `Path(__file__).parent / ".env"` (path absoluto baseado em `__file__`/`__dirname`) | Disciplina |
| Dep transitiva esperada como sub-modulo mas que e pacote separado (regra 11+12 escapou) — backend nao subia | Acceptance criterion da feature de scaffold deve listar TODAS as deps que o codigo importa, mesmo dentro de namespaces como `<lib>.checkpoint.<X>`. Smoke runtime obrigatorio na sprint final do backend | Disciplina + gate runtime |
| Check de "porta livre" dentro do lifespan do framework web colide com o proprio servidor | Anti-pattern 7.17: nunca validar recursos do proprio processo dentro do startup. Validacao desse tipo vai em script wrapper externo | Disciplina |
| CSS Grid com N tracks declarados mas M > N filhos no JSX — auto-flow cria rows extras, layout colapsa | Anti-pattern 7.18: numero de tracks em `grid-template-columns` deve bater EXATAMENTE com numero de filhos renderizados | Disciplina |
| Frontend build/typecheck verde mas layout visual quebrado (gates atuais so validam sintaxe, nao runtime visual) | Anti-pattern 7.19 + recomendacao de smoke visual (Playwright/Puppeteer) ou auditoria humana obrigatoria ao fim de sprint frontend. Em v4 ainda nao implementado — entrar como `notes` do `00-index.json` | Limitacao reconhecida |

Bonus v4:
- **Sprint 00 — bootstrap DX** opcional (SPRINT-TEMPLATE 5.0a): cria
  arquivos auxiliares de IDE (`.vscode/settings.json`,
  `pyrightconfig.json`, `.editorconfig`, etc.) ANTES da sprint 1 de
  fundacao. Modelo pequeno com harness rigido (regra 7) nao cria esses
  arquivos por iniciativa propria — modelo frontier (Claude/GPT-4) cria.
  Sprint 00 cobre essa lacuna.
- **cwd canonico** documentado em clinerules secao 8 (invariantes do
  projeto): se o projeto usa imports absolutos com prefixo de pacote,
  documente qual e o cwd correto para rodar comandos. Type-checkers podem
  ser permissivos, runtime nao.

Filosofia das mudancas v4 (continuacao da v3):

- **Auto-condense do harness do agente nao deve disparar regra do
  workflow.** Harness do agente (Cline/etc.) cuida de janela e tokens;
  workflow cuida de procedimento de codigo. NAO misture.
- **Cada gate textual deve virar gate mecanico** quando o modelo pequeno
  consistentemente o ignora. "Faca diff" virou "emita diff campo a campo
  no chat". "Confira que arquivo existe" virou `os.path.exists` script.
- **Iniciativa proativa de DX e responsabilidade da Sprint 00**, nao do
  agente. Modelo pequeno com regra 7 nao deve criar arquivos fora do
  `files[]` da feature, e isso e correto. A sprint que pede o arquivo de
  config de IDE existe pra cobrir essa lacuna.
- **Idempotencia em transicoes** (de feature pra feature, de sprint pra
  sprint). O agente deve poder ser interrompido e retomado sem deixar
  estado fantasma. Gate de fechamento de sprint (3 marcadores) + gate de
  idempotencia no Setup 2 cobrem.
- **Smoke runtime e diferente de smoke de import.** "Importar o app sem
  erro" passa em casos onde uvicorn nao sobe de fato (porta colidindo,
  dep transitiva faltando, env var nao carregada). A sprint final do
  backend deve ter smoke gate que `subir o servidor + curl /health +
  matar`, NAO so import. Idem frontend: `pnpm build` nao prova layout
  visual — ainda precisa do humano abrindo browser.

## Limitacoes reconhecidas v4 (a atacar em v5)

- **Frontend visual nao tem gate mecanico.** Layout, espacamento, z-index,
  classes orfas, variaveis CSS ausentes — tudo passa pelos gates atuais.
  Solucao futura: integrar Playwright/Puppeteer com baseline de screenshot
  na ultima feature da sprint frontend, OU exigir auditoria humana
  formal antes do fechamento.
- **Smoke runtime no backend ainda e import-based.** Sprint 7
  (`smoke_test.py`) atual so faz `from main import app`. Deveria fazer
  `subprocess.Popen(uvicorn) + httpx.get('/health') + proc.terminate()`.
  Em v5, padronizar comando.
- **Cross-stack contamination de DEPS.** Se o backend importa um pacote
  Python e voce esquece de declarar, mypy resolve via venv local mas
  outra maquina quebra. Solucao futura: `uv lock --check` no fim de cada
  feature backend, e `pnpm install --frozen-lockfile` no fim de cada
  feature frontend. Hoje so e checado em sprint 7 fim de backend.

Detalhes por regra/gate em `CHANGELOG.md` (atualizar quando criar a
entrada v4).
