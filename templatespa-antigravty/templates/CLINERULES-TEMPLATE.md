# Cline Rules Template (generico)

Copie este arquivo para `.clinerules/clinerules.md` no projeto alvo.

Regras carregadas todo turno pelo Cline. Sao invariantes. Aplicam a qualquer
tarefa (manual ou via workflow).

Procedimentos de execucao (sprints, harness, pipelines) NAO moram aqui. Vao em
`.clinerules/workflows/<nome>.md` e sao invocados por slash command.

---

## Como customizar pro seu projeto

Substitua estes placeholders antes de usar:

| Placeholder | Significado | Exemplo |
|-------------|-------------|---------|
| `<TYPECHECK_CMD>` | Comando que checa tipos de TODO o projeto | `npm run typecheck` |
| `<TYPECHECK_NOTE>` | Avisos sobre o comando se houver pegadinha | "Usa tsc com project references" |
| `<DB_FILE_PATH>` | Onde fica seu DB layer (se houver) | `electron/main/db.ts` |
| `<TYPES_DIR>` | Onde ficam tipos compartilhados | `src/types/` |
| `<SHELL>` | Shell em uso | `cmd.exe` ou `bash` |

Os placeholders entre `<>` ficam visiveis por design. Substitua com find-and-replace
quando importar pro novo projeto.

---

## 0. Pre-flight (rode UMA vez no inicio da sessao)

ANTES de qualquer feature, valide que as ferramentas que o workflow vai usar
existem no PATH do shell:

**cmd.exe (Windows):**
```cmd
where pnpm
where uv
where node
where python
node --version
```

**bash (Linux/Mac):**
```bash
which pnpm uv node python
node --version
```

Se algum comando esperado retornar vazio/erro: **PARE e reporte ao humano**.
Nao prossiga "esperando dar certo". Comando ausente vira exit 127 silencioso
em runtime e voce marca features como done sem ter rodado nada.

Tambem valide que o(s) comando(s) de typecheck retornam output esperado (nao
zero bytes silencioso) rodando uma vez sem editar nada.

## 0a. Bootstrap framework-specific

Alguns frameworks requerem arquivos GERADOS antes de typecheck/build funcionar.
Se nao existirem, o tsc/mypy reporta erros falsos cascade que parecem do seu
codigo mas sao do framework nao-bootstrapado.

Se o projeto usa um destes, garanta que o arquivo existe ANTES de marcar feat-001
como done:

| Framework | Arquivo | Como gerar |
|-----------|---------|-----------|
| Next.js | `next-env.d.ts` na raiz do app | `npx next build` ou criar manual com `/// <reference types="next" />\n/// <reference types="next/image-types/global" />` |
| Vite + TS | `vite-env.d.ts` em `src/` | Geralmente Vite gera no scaffold; se faltar, criar com `/// <reference types="vite/client" />` |
| Astro | `.astro/types.d.ts` | `astro sync` |
| SvelteKit | `.svelte-kit/` | `svelte-kit sync` |
| Remix | `remix.env.d.ts` | Geralmente do scaffold |

Veja `templates/stack-quirks.md` (se existir) pra lista mais completa.

## 0a-bis. Path placement gate (anti-pasta-no-lugar-errado)

**REGRA DURA:** caminhos em `files[]` de cada feature sao SEMPRE relativos a
raiz do projeto. NUNCA corte prefixos. NUNCA use `cd <subdir>` antes de criar
arquivos da feature — sempre passe o path completo da raiz para o
`write_to_file`.

Falha tipica: `files[]` lista `<modulo>/<sub>/__init__.py`, agente faz `cd
<modulo>` e cria com path `<sub>/__init__.py`. Se o cwd era a raiz (esqueceu
o cd) ou o cwd ja era outro, o arquivo termina no lugar errado.

Forma segura: passe o path COMPLETO ao tool de escrita, ex.
`<modulo>/<sub>/__init__.py`. Mantenha o cwd na raiz do projeto.

**Gate mecanico (execute apos terminar a implementacao da feature, antes de
qualquer marcacao de done):**

```bash
python -c "
import json, os
SPRINT='<arquivo-da-sprint-em-.harness/sprints/>'
FEAT='<feat-NNN>'
d = json.load(open(f'.harness/sprints/{SPRINT}'))
feat = next(f for f in d['features'] if f['id']==FEAT)
missing = [x['file'] for x in feat['files'] if x.get('lines')=='new' and not os.path.exists(x['file'])]
assert not missing, f'ARQUIVOS FALTANDO: {missing}'
print('PATHS OK')
"
```

Se retornar `ARQUIVOS FALTANDO: [...]`, voce criou no lugar errado. Procure
onde criou (`find . -name "<basename>"`) e mova com `mv`, NAO apague e recrie.

## 0b. Post-write parseability gate (anti-truncamento forte)

Modelos pequenos truncam arquivos grandes durante `write_to_file` quando o stream do LLM e cortado. A regra 3 ja manda "ler ultimas 20 linhas", mas modelo pequeno nao julga coerencia confiavelmente. **Solucao: rode o parser nativo da linguagem como gate mecanico.** Parsers nao mentem.

**Apos cada `write_to_file` ou `replace_in_file`, rode o parser correspondente ao formato do arquivo.** Exit code != 0 ou exception = arquivo corrompido/truncado. Reverta com `git checkout <arquivo>` e refaca.

Tabela de comandos por extensao (use o que se aplica ao arquivo editado):

| Extensao | Comando de parse |
|---|---|
| `.json` | `python -c "import json; json.load(open(r'<arquivo>'))"` |
| `.jsonc` / `.json5` | `python -c "import json5; json5.load(open(r'<arquivo>'))"` (ou validar como json se nao tem comentario) |
| `.yaml` / `.yml` | `python -c "import yaml; yaml.safe_load(open(r'<arquivo>'))"` |
| `.toml` | `python -c "import tomllib; tomllib.load(open(r'<arquivo>','rb'))"` (Python 3.11+) |
| `.py` | `python -m py_compile <arquivo>` |
| `.ts` / `.tsx` | `npx tsc --noEmit --jsx preserve --module esnext --target esnext <arquivo>` (sintatico rapido) |
| `.js` / `.mjs` / `.cjs` | `node --check <arquivo>` |
| `.html` | (sem parser de stdlib; pular ou usar `tidy -e`) |
| `.md` / `.txt` | (sem parser; pular) |

Para JSONs do harness (sprints, index, project-config), o parse e **obrigatorio**: arquivo invalido bloqueia o proximo turno do agente.

Para JSON de configs do projeto (`package.json`, `tsconfig.json`, `pyproject.toml`), idem.

**Padrao de uso por turno:**

```cmd
:: cmd.exe
python -c "import json; json.load(open(r'%FILE%'))" || (echo PARSE FAIL & exit /b 1)
```

```bash
# bash
python3 -c "import json; json.load(open('$FILE'))" || { echo "PARSE FAIL"; exit 1; }
```

Se o parse falha:
1. **Nao reescreva por cima.** Pode estar com 11119 bytes de 12500 esperados; escrever de novo pode truncar de novo.
2. `git checkout <arquivo>` (reverte para o ultimo commit)
3. Reescreva. Se truncar de novo, troque para `replace_in_file` cirurgico, ou divida em duas writes menores.
4. Se truncar 2x seguidas no mesmo arquivo: PARE e reporte.

## 0c. Post-write import-resolution gate (linguagens tipadas)

**Parseability so checa SINTAXE.** Imports quebrados, nomes nao definidos,
modulos nao instalados, ou falhas de pacote (faltando `__init__.py`) PASSAM no
parseability gate. Resultado: agente entrega N arquivos com import quebrado e
so descobre no fim quando roda type-check do projeto inteiro.

**Apos cada `write_to_file` em arquivo de linguagem tipada (Python, TS, etc.),
rode o type-checker do stack** — restrito ao arquivo editado quando possivel,
ou ao projeto inteiro como fallback:

| Linguagem | Comando arquivo-only (preferido) | Fallback |
|---|---|---|
| Python | `<TYPECHECK_CMD> --follow-imports=silent <arquivo>` | `<TYPECHECK_CMD>` projeto inteiro |
| TS / TSX | `<TYPECHECK_CMD>` (TS exige tsconfig — geralmente projeto inteiro) | idem |

Substitua `<TYPECHECK_CMD>` pelo comando documentado no `develop.md` do projeto.

Exit != 0 = imports nao resolvem OU tipos basicos quebrados. Investigar nesta
ordem:
1. O modulo importado existe (arquivo ou pacote)?
2. Se for pacote: existe `__init__.py` em todos os niveis ate o modulo?
3. O nome importado realmente e exportado?
4. A dependencia esta declarada no manifest (regra 12)?

**NAO** mascare adicionando `# type: ignore` ou `// @ts-ignore` para silenciar
— corrija a causa raiz.

## 0d. Post-write Unicode gate (anti em-dash e smart quotes)

A regra 8 (invariantes do projeto) tipicamente proibe em-dash `—` e smart
quotes em texto. Mas SPECs e documentos copiados ao codigo frequentemente tem
esses caracteres. Modelo pequeno copia literal e introduz silenciosamente.

**Apos cada `write_to_file`, rode:**

```bash
grep -nP '[\x{2010}-\x{2015}\x{2018}-\x{201F}]' <arquivo> && {
  echo "PROIBIDO: en-dash, em-dash, smart quote ou afim em <arquivo>"
  exit 1
} || echo "UNICODE OK"
```

Se aparecer hit: subistitua os caracteres por hifen `-` e aspas retas `"` e
`'`. Sem excecao para "copia literal de SPEC".

Pular esta regra se o invariante 8 do seu projeto explicitamente permite
em-dash.

## 1. TypeScript / Tipos

- Zero erro novo. Arquivos que voce tocou saem com zero erro em
  `<TYPECHECK_CMD>`. "Pre-existente no arquivo" nao e desculpa se voce editou.
- IMPORTANTE: confirme que `<TYPECHECK_CMD>` realmente checa o que voce editou.
  Em projetos com `tsconfig` raiz usando project references e `files: []`,
  rodar `tsc --noEmit` na raiz processa ZERO arquivos e da exit 0 falso. Se for
  o caso, `<TYPECHECK_CMD>` deve ser ajustado pra rodar todos os subprojetos.
  `<TYPECHECK_NOTE>`
- **Validacao de exit code obrigatoria.** Sempre redirecione para arquivo e
  verifique exit code:
  ```cmd
  <TYPECHECK_CMD> > .harness\check.txt 2>&1
  echo Exit: %errorlevel%
  ```
  ou bash:
  ```bash
  <TYPECHECK_CMD> > .harness/check.txt 2>&1; echo "Exit: $?"
  ```
  Se exit != 0 mas o arquivo de output esta VAZIO: o comando nao rodou
  (provavelmente command-not-found). Pare e reporte. **NUNCA interprete "sem
  output" como "sem erros" sem checar o exit code.**
- Proibido: `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, `as any`,
  `as unknown as X` para silenciar, `any` novo (implicito ou explicito), `!`
  non-null novo que silencia erro, `declare` para fingir simbolo.
- Se precisar suprimir, voce nao resolveu. Resolva.

## 2. Sem placeholder no codigo

- Proibido nos arquivos editados:
  - `TODO(Sprint`, `TODO:` sem owner ou link, `// implementar depois`
  - `throw new Error('not implemented')`
  - Stub vazio retornando `undefined`
  - Strings "por enquanto", "sera implementado depois", "placeholder"
  - Comentarios `// FIXME` sem link pra issue
- Se nao sabe implementar, nao entregue. Pare e reporte no chat.

## 2a. Proibido esvaziar campos de feature/sprint JSON

Quando voce edita JSON de sprint pra atualizar `status`/`startedAt`/
`completedAt`, voce DEVE preservar todos os outros campos da feature como
estavam.

**Especificamente PROIBIDO:**
- Apagar items de `acceptanceCriteria[]` ou deixar a lista vazia (`[]`)
- Apagar items de `hints[]`
- Apagar items de `files[]`
- Reduzir `description` pra string trivial tipo "Endpoints de threads."
- Apagar items de `verification.grepMustMatch[]` ou `verification.grepFiles[]`

**Por que isso importa:** a regra 4 (self-review) manda emitir evidencia POR
CRITERIO. Se voce esvazia a lista, nao tem o que evidenciar e voce escapa do
gate sem fazer o trabalho. Esse e um atalho conhecido. Esta proibido.

Se voce esta editando o JSON e percebeu que vai fazer write_to_file inteiro,
SEMPRE re-leia o arquivo completo antes da escrita e copie ipsis litteris
todos os campos que NAO precisam mudar. So toque em `status`, `startedAt`,
`completedAt`. Mais nada.

## 3. Integridade pos-edicao (anti-truncamento)

Sintoma comum: `write_to_file` em arquivo grande, o stream do LLM e cortado, o
arquivo fica truncado no meio de uma string ou expressao. O agente pensa que
escreveu tudo.

Regra:

1. Apos cada `write_to_file` ou `replace_in_file`, releia as ULTIMAS 20 linhas
   do arquivo editado.
2. Confirme:
   - Ultimo caractere coerente (`}`, `;`, `)`, ou newline final esperado pro
     formato do arquivo)
   - Nenhuma string/identificador cortado no meio (sem caracteres orfaos como
     `fs.r` ou `import { Foo` sem fechamento)
3. Para arquivos > 50KB: rode tambem o equivalente a `tail -c 200 <arquivo>`
   pra confirmar bytes finais. Cache do editor pode mascarar o estado real.
4. Se detectar truncamento: `git checkout <arquivo>` e refaca a edicao.
5. Se o mesmo arquivo truncar duas vezes seguidas: PARE e reporte. Pode ser
   bug de escrita, contexto estourado, ou stream interrompido.

## 3a. Escolha entre write_to_file e replace_in_file

- Para mudancas PONTUAIS em JSON pequeno (status, timestamps, flags) (<500
  linhas): SEMPRE use `write_to_file` com o arquivo inteiro reescrito. Releia,
  troque os campos, escreva de volta.
- Motivo: `replace_in_file` exige diff com 3 marcadores. Marcador faltando
  causa loop infinito. Em JSON pequeno o risco nao compensa.
- Para edicoes em codigo > 500 linhas: `replace_in_file` e preferido.
- Para arquivos > 50KB (~1500+ linhas): NAO use `write_to_file`. Stream tende a
  truncar. Use `replace_in_file` cirurgico.
- Se o primeiro `replace_in_file` falhar (diff rejeitado), NAO tente o mesmo
  diff. Releia e use `write_to_file` (se arquivo pequeno) ou re-formule o diff.
- Regra dura: se a mesma edicao falhar 2x com `replace_in_file`, pare e reporte.

## 4. Self-review obrigatoria antes de marcar done

Apos passar gates mecanicos (typecheck + grep), ANTES de marcar status como
`done` em qualquer feature:

1. Releia INTEIRO cada arquivo editado. Sem range.
2. Para cada item em `acceptanceCriteria` da feature, emita no chat uma linha:
   `Criterio: "<texto>" | Evidencia: <arquivo>:<linha>, <snippet>. Status: atendido.`
   Se nao consegue citar arquivo e linha concretos, o criterio NAO esta
   atendido. Volte e implemente.
3. Checklist de consistencia (Sim/Nao no chat):
   - Imports orfaos (simbolo importado sem uso)?
   - Simbolo usado sem import?
   - Se mudou DB schema em `<DB_FILE_PATH>`: migration nova foi criada (proximo
     numero) E adicionada ao array de migrations?
   - Se mudou interface em `<TYPES_DIR>`: consumidores ainda tipam sem erro?
   - Se mudou contrato cross-camada (IPC, REST, eventos): handler + caller
     foram atualizados em SINCRONIA? (Caso contrario o campo novo e
     silenciosamente perdido em runtime.)
4. Diff review: rode equivalente a `git diff --stat` e `git diff -- <arquivo>`.
   A mudanca e o minimo necessario? Sem ruido de formatacao, sem CRLF flip
   global, sem reordenacao gratuita? Se tem ruido: `git checkout` e refaca.
5. Segundo typecheck: `<TYPECHECK_CMD>` confirmando zero erro novo em arquivo
   do diff.

So depois de tudo isso: `status: "done"`, `completedAt: "<ISO8601>"`.

Sem contador de tentativas. Voce sempre entrega. Se a self-review falha,
conserte e rode de novo.

## 5. Honestidade

- Nao marque `done` sem self-review completa no chat, com evidencia citada por
  criterio.
- Nao invente linhas, simbolos, APIs. Se citou linha N, confirme abrindo o
  arquivo.
- Nao alegue "typecheck passou" sem ter rodado. Reporte exit code ou cole o
  head do output.
- Nao reuse evidencia ("igual ao criterio anterior"). Cada criterio tem
  evidencia propria.

## 6. Ambiente / Shell

`<SHELL>` em uso: `<SHELL>` (ex: `cmd.exe` em Windows nativo, `bash` em Linux/Mac).

Comandos cross-shell que SEMPRE funcionam (use estes primeiro):
- Git: `git diff`, `git diff --stat`, `git diff -- <arquivo>`,
  `git checkout <arquivo>`, `git status`, `git log --oneline`.
- Node: `npx <comando>`, `node <script>`, `npm run <script>`.

Especificos por shell:

**cmd.exe (Windows):**
- Buscar literal: `findstr /C:"<texto>" <arquivo>`
- Buscar regex: `findstr /R "<regex>" <arquivo>`
- Contar matches: `findstr /C:"<texto>" <arquivo> | find /c /v ""`
- Ler arquivo: `type <arquivo>`
- Deletar: `del <arquivo>` (com `2>nul` pra suprimir erro se nao existir)
- Copy: `copy /Y <origem> <destino>`
- Redirect: `<cmd> > <arquivo> 2>&1`
- Paths em comandos: backslash `\` (ex: `.harness\sprints\01.json`)
- Paths em codigo TS/JSON: forward slash `/` normal
- NAO usar PowerShell (`Select-String`, `Measure-Object`, `Get-Content`,
  `Remove-Item`) - vao quebrar em cmd.

**bash (Linux/Mac):**
- Buscar: `grep -F "<texto>" <arquivo>` (literal) ou `grep -E "<regex>" <arquivo>`
- Contar: `grep -c -F "<texto>" <arquivo>`
- Ler: `cat <arquivo>` ou `head -n N <arquivo>` ou `tail -n N <arquivo>`
- Deletar: `rm <arquivo>`
- Copy: `cp <origem> <destino>`
- Redirect: `<cmd> > <arquivo> 2>&1`
- Paths: forward slash `/` em tudo.

## 7. Escopo (critico para economia de contexto)

- Toque APENAS em arquivos listados em `files[]` da feature atual. Se descobrir
  que precisa tocar mais, PARE, reporte e aguarde decisao do humano.
- Leia `specLines` EXATAMENTE. Se o JSON diz `"17-53"`, leia apenas as linhas
  17 ate 53. NAO leia a SPEC inteira. NAO leia "17-1016" ou range maior.
- Leia o range `lines` de cada arquivo EXATAMENTE. Se diz `"1-200"`, nao leia
  "1-327". Excecao unica: na self-review (passo 1 da regra 4), leitura
  integral e obrigatoria.
- Quebrar esses ranges estoura o contexto e trava a sprint. Respeite.
- Nao abra sprint diferente da apontada por `.harness/current.txt`.
- Nao modifique arquivos legacy ou de auditoria (registrar quais sao no
  proprio clinerules quando for o caso).

## 8. Invariantes do projeto

Lista de invariantes do PROJETO ALVO. Adicione conforme necessario. Exemplos
comuns:

- Idioma das respostas, comentarios e UI: <portugues BR | ingles | etc>.
- Caracteres proibidos em texto: <em-dash, smart quotes, etc>.
- Convencoes de import: <relativos vs absolutos via alias `@/`>.
- Estado do frontend: <Zustand | Redux | nada>.
- Banco de dados: <SQLite | PostgreSQL | nenhum>. Onde mora: `<DB_FILE_PATH>`.
  Sempre prepared statement. Sem SQL concatenado.
- Migrations: append-only. Nunca edite migration existente.
- IPC / RPC: <descricao do contrato>. Erros retornam objeto, nao lancam.
- Frontend frameworks: <React + Vite | Next.js | etc>.
- Build / runtime: <Electron | Node CLI | servidor web | etc>.
- Diretorios sagrados: <`~/.lionclaw/` | etc> nao tocar a menos que pedido.

**cwd canonico (relevante quando o projeto usa imports absolutos com prefixo
de pacote a partir da raiz):**

Se voce escolheu convencao "imports absolutos a partir do nome de um
sub-diretorio" (ex: `from <package>.<modulo> import <nome>`,
`from src.utils import foo`), entao o **cwd correto para rodar comandos** e
a RAIZ do repositorio, NAO a subpasta do pacote. Documente aqui o cwd
canonico do projeto. Exemplo:

> "Para rodar typecheck, smoke test, ou qualquer script Python deste
> projeto, o cwd correto e a raiz do repo (`<nome-do-repo>/`). Comandos como
> `<TYPECHECK_CMD>`, `uv run python -m <package>.scripts.<script>`,
> `<RUN_CMD>` esperam o cwd na raiz."

Por que isso importa: type-checkers (mypy, pyright, pyrefly) podem ser mais
permissivos e adicionar `..` ao path automaticamente, mas runtime e
ferramentas de scaffold rigorosos exigem o cwd certo. Se voce escreveu
`from <package>.X import Y` e roda dentro da subpasta `<package>/`, vai
falhar com `ModuleNotFoundError: No module named '<package>'`.

## 9. Autopilot / Workflow

Quando estiver rodando um workflow procedural (ex: `/develop`):

- Nao peca confirmacao entre features ou sprints. Prossiga.
- Nao pergunte "devo prosseguir?". Prossiga.
- Unica parada voluntaria: `current.txt == "DONE"` (todas as sprints terminaram).
- Paradas nao-voluntarias permitidas:
  - Erro de infraestrutura (typecheck nao executa, JSON corrompido, arquivo
    faltando, truncamento recorrente)
  - Mesma feature falhar gates 3x seguidas
  - Feature precisa tocar arquivo fora do `files[]` declarado

Em qualquer parada nao-voluntaria, reporte estado completo no chat e aguarde
humano.

## 10. Single source of truth para contratos cross-cutting

Um **contrato cross-cutting** e qualquer estrutura que precisa ser identica em mais de um lugar do codigo: schemas de eventos, formato de mensagens entre processos, tipos compartilhados back/front, payloads REST, formato de envelope de IPC, enum de status, etc.

**Regra dura: cada contrato cross-cutting tem UMA, e apenas UMA, fonte canonica.** Os outros lugares ou (a) IMPORTAM dessa fonte, ou (b) referenciam ela por anchor (`ver SPEC §3.5`) e nao redeclaram nada.

**PROIBIDO:** redeclarar (mesmo simplificado, mesmo "para referencia rapida") nomes, enums, ou campos de um contrato em mais de um arquivo. Toda vez que voce escrever uma lista de strings que ja existe em outro lugar com qualquer outro nome, voce esta criando o cenario classico de drift.

Exemplos de drift que ja aconteceu:
- 10 nomes de eventos numa lista em `clinerules.md` + 10 nomes em `SPEC.md`. Backend leu spec, frontend leu clinerules. 7 dos 10 ficaram com nomes diferentes silenciosamente.
- 8 status de pedido enumerados em `STATUSES.md` e tambem hardcoded em `useStore.ts` e em `models/Order.py`. Mudaram um, esqueceram dois.
- Schema de payload IPC tipado em 3 lugares (handler, preload, caller). Adicionaram campo num so. Outros dois ignoraram em runtime.

**Como evitar:**

1. Quando ler a SPEC, **note os contratos cross-cutting**. Tipicos: schemas de eventos/mensagens, enums de estado, payloads de chamadas entre camadas.
2. Para cada um, identifique a **fonte canonica** (quem define o contrato).
3. **Os outros lugares importam ou citam.** Nao redeclaram.
4. Quando uma sprint listar `crossCutting: ["X"]` em metadados (ver SPRINT-TEMPLATE), trate como aviso: tudo que voce edita relacionado a `X` precisa estar consistente com a fonte canonica `X`.
5. Antes de marcar feature como done que mexe em `crossCutting`, faca **diff mecanico de campos vs fonte canonica**. Toda divergencia precisa ser deliberada.

**Gate mecanico de diff (obrigatorio quando feature toca `crossCutting`):**

Voce DEVE emitir no chat, antes de marcar a feature como done:

```
Cross-cutting check: <id-do-contrato>
Fonte canonica: <arquivo:linhas>
Arquivos editados nesta feature relacionados ao contrato:
  - <arquivo1>: campos definidos = [campo_a, campo_b, ...]
  - <arquivo2>: campos definidos = [campo_a, campo_b, ...]
Campos da fonte canonica = [campo_a, campo_b, ...]
Diff: <ZERO divergencias> OU <lista das divergencias com justificativa>
```

Sem essa lista emitida no chat, a feature NAO esta done. NAO basta dizer
"verifiquei e bate" — voce deve enumerar campo por campo.

Exemplo de check rigoroso (substitua pelo seu contrato — generico):

```
Cross-cutting check: <id-do-contrato>
Fonte canonica: <arquivo-de-spec>:<linhas>
Arquivos editados:
  - <arquivo-emissor>: lista os identificadores definidos (ex: nomes de
    eventos, campos de payload, valores de enum)
  - <arquivo-consumidor>: lista os mesmos identificadores como ele os
    consome
Identificadores canonicos enumerados:
  - <id1>: <esperado> -> <emissor>: OK / DIVERGE em ...
  - <id2>: <esperado> -> <consumidor>: OK / DIVERGE em ...
Diff: ZERO divergencias.
```

Em codigo: prefira **gerar tipos a partir da fonte canonica** quando possivel (ex: gerar TS types de schema OpenAPI; importar enum Python para JSON schema; etc) em vez de manter copias paralelas.

## 11. Verificacao de API antes de chamar

Antes de chamar metodo, atributo ou funcao de uma biblioteca de terceiro que voce **nao tem certeza absoluta** que existe na versao instalada, **VALIDE**.

Padroes seguros:
- Importou e usa imediatamente: confirme que o import nao deu erro (parser passa).
- Chamou metodo que nao reconhece de cabeca: rode no shell `python -c "import M; print('METODO' in dir(M.Classe))"` ou `node -e "console.log('m' in require('lib').Cls.prototype)"` para confirmar.
- Em duvida, abra a doc oficial da versao especifica que esta no manifest do projeto (`package.json`/`pyproject.toml`). Versoes mais antigas frequentemente tem APIs renomeadas.

Anti-pattern conhecido: chamar `obj.delete_config(...)` quando o metodo na versao real e `delete_thread`. mypy/tsc nao pegam isso quando o tipo e `Any`. Em runtime, `AttributeError`. **Valide antes de codar, nao depois quando produto quebra.**

Se voce inventou metodo, **corrija imediatamente** e nao continue a feature ate confirmar. Esse e um dos vetores mais sorrateiros de bug do harness.

## 12. Dependencias declaradas batem com importadas

Antes de marcar feature como done que adicionou import de pacote externo:

1. Confira que o pacote esta declarado no manifest do projeto:
   - JS/TS: `package.json` em `dependencies` ou `devDependencies`
   - Python: `pyproject.toml [project.dependencies]` ou `requirements.txt`
   - Rust: `Cargo.toml`
   - Go: `go.mod`
2. Se nao esta, ADICIONE antes de marcar done. Nao deixe import quebrado.
3. Versionamento: pin com `^` (caret) em JS, `>=` em Python, conforme convencao do projeto.

Comando de verificacao tipica:

```cmd
:: cmd.exe - JS
findstr /C:"react-markdown" package.json
:: bash - JS
grep -F "react-markdown" package.json
:: Python
grep -F "fastapi" pyproject.toml
```

Se grep retorna vazio mas codigo importa: voce tem um import quebrado. `npm install`/`uv sync` vai falhar. Se ja rodou e nao falhou, e porque o package esta em cache mas nao no lockfile - alguem mais cedo ou tarde quebra.

## 13. Async/sync: nao misture com hack de event loop

Se voce esta escrevendo uma funcao **sincrona** que vai ser chamada de dentro de um event loop async (ex: callback de framework, tool wrapper de LLM, hook de runtime), **declare a funcao como `async def`**. Nao tente "salvar" usando `asyncio.new_event_loop()` + `run_until_complete()` - isso da `RuntimeError: This event loop is already running` no primeiro hit.

Anti-pattern (PROIBIDO):

```python
@tool
def my_tool(arg: str) -> str:                    # sync function
    loop = asyncio.new_event_loop()              # NAO
    return loop.run_until_complete(real_async_impl(arg))  # NAO
```

Correto:

```python
@tool
async def my_tool(arg: str) -> str:              # async function
    return await real_async_impl(arg)
```

A maioria dos frameworks modernos (LangChain, FastAPI, Anthropic SDK, etc.) aceitam tools/handlers async nativamente. Use isso. Se voce realmente PRECISA de bridge sync/async (raro), use `anyio.from_thread.run` ou similar - nao crie loop novo.

Mesma regra inversa: **nao chame codigo async de funcao sync top-level rodando dentro de outro async**. Sempre `await`.

## 14. Lifecycle por feature (ciclo completo antes da proxima — REGRA DURA)

A ordem de execucao prescrita pelo workflow nao e sugestao. **Quebra-la e
violacao do harness.**

Para cada feature `feat-NNN`, complete o ciclo abaixo **antes** de comecar a
feat-NNN+1. NAO significa parar entre features — significa **fechar o ciclo
de uma antes de abrir o da proxima**.

1. Marca `status="in-progress"` + `startedAt=<ISO8601>` no JSON da sprint.
   **Salva imediatamente.**
2. Implementa.
3. Roda gates mecanicos (parseability, import-resolution, unicode, typecheck,
   grep, smoke).
4. Faz self-review COMPLETA citando evidencia por criterio.
5. Marca `status="done"` + `completedAt=<ISO8601>` no JSON da sprint.
   **Salva imediatamente.**
6. **Prossegue IMEDIATAMENTE para feat-NNN+1** (volta ao passo 1) — sem
   pedir confirmacao, sem reportar "feature done, aguardando". Continuar
   e o default.

Gerenciamento de contexto/tokens e responsabilidade do harness do agente
(Cline ou similar), NAO sua. Nao avalie consumo, nao peca compact, nao
reporte uso de tokens. Nao pare voluntariamente entre features ou entre
sprints — so pare por causas externas (gate falhou 3x, infraestrutura
quebrada, arquivo fora de escopo, JSON corrompido).

**PROIBIDO:**
- Implementar feat-002 enquanto feat-001 esta `in-progress`.
- Fazer self-review em batch de varias features.
- Marcar varias features `done` de uma vez sem ter passado pelos gates de
  cada uma individualmente.
- Reportar "todas as features prontas" quando o JSON nao reflete (auto-mentira).
- Parar voluntariamente entre features ou entre sprints (com excecao das
  causas externas listadas acima).
- Avaliar consumo de tokens/contexto e reportar para o humano.
- Pedir `/compact` ou similar — gerenciamento de contexto e do harness do
  agente, nao seu.

**Gate mecanico exigido antes de comecar feat-NNN+1 (e antes de qualquer
edicao de implementacao da N+1):**

```bash
python -c "
import json
SPRINT='<arquivo-da-sprint>'
d = json.load(open(f'.harness/sprints/{SPRINT}'))
in_prog = [f['id'] for f in d['features'] if f['status']=='in-progress']
assert len(in_prog) <= 1, f'Mais de uma feature in-progress: {in_prog}'
done_no_completed = [f['id'] for f in d['features'] if f['status']=='done' and not f.get('completedAt')]
assert not done_no_completed, f'Done sem completedAt: {done_no_completed}'
print('LIFECYCLE OK')
"
```

Quando termina a ULTIMA feature da sprint, executa a sequencia de fechamento
(workflow secao "Fim de sprint") **antes de tocar qualquer arquivo da proxima
sprint**: marcar `sprint.status=done`, atualizar `00-index.json`, sobrescrever
`current.txt`. Esses 3 marcadores juntos = sprint fechada. Sem os 3, a sprint
NAO esta fechada.

## 15. Honestidade reforcada — citacao de output mecanico

Regra 5 ja exige nao alegar "typecheck passou" sem ter rodado. Reforco:

**Quando o self-review cita "typecheck zero erro" (mypy, tsc, cargo check, go
vet, etc.) como evidencia, voce DEVE colar literalmente:**
- O comando exato que rodou (com cwd se relevante)
- O exit code recebido
- As ultimas 3 linhas do output

**Exemplo aceito (formato — substitua pelo comando do seu stack):**
```
Criterio: typecheck zero erro novo em arquivos do diff
Evidencia:
  $ <TYPECHECK_CMD> > /tmp/check.txt 2>&1
  $ echo $? -> 0
  $ tail -3 /tmp/check.txt
  <ultimas 3 linhas literais>
Status: atendido.
```

**Nao aceito:**
```
Criterio: typecheck zero erro
Evidencia: typecheck exit 0
Status: atendido.
```
(Sem comando, sem exit code, sem tail. Pode estar mentindo. Esta proibido.)

A mesma regra vale para qualquer evidencia que cite saida de comando: testes,
linter, build, smoke gate. Cite o comando + exit code + tail/head do output.
