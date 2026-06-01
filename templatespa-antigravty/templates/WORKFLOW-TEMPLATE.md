# Workflow Template (generico) - /develop

Copie para `.clinerules/workflows/develop.md` no projeto alvo. Customize os
placeholders.

Workflow procedural de execucao de sprints. Le sprints serializadas em JSON,
implementa cada feature, valida via gates mecanicos + self-review, marca como
done, avanca pra proxima.

As regras invariantes (TypeScript, sem placeholder, integridade pos-edicao,
self-review, honestidade, escopo) estao em `.clinerules/clinerules.md` e
valem sempre. Este workflow assume que voce ja leu aquelas regras.

---

## Placeholders pra substituir

| Placeholder | Significado | Exemplo |
|-------------|-------------|---------|
| `<TYPECHECK_CMD>` | Comando que checa tipos do projeto inteiro | `npm run typecheck` |
| `<TYPECHECK_GREP>` | Como contar erros do output | `findstr /C:"error TS"` (cmd) ou `grep -c "error TS"` (bash) |
| `<SHELL>` | cmd.exe, bash, etc | `cmd.exe` |
| `<TMP_DIR>` | Onde guardar arquivos temporarios da sessao | `.harness\` ou `/tmp/` |
| `<HARNESS_DIR>` | Pasta com sprints e current.txt | `.harness/` |
| `<SPEC_PATH>` | Arquivo de especificacao | `SPEC.md` |
| `<TOTAL_SPRINTS>` | Quantas sprints existem | 9 |

---

# /develop - Sprint autopilot

Executa TODAS as features de TODAS as sprints em sequencia, sem pausar.
Unica saida voluntaria: `<HARNESS_DIR>current.txt == "DONE"`.

## Setup (uma vez no inicio da sessao)

### Setup 0: Pre-flight (clinerules regra 0)

ANTES de tudo, valide ferramentas no PATH:

cmd.exe:
```
where pnpm
where uv
where node
where python
```

bash:
```
which pnpm uv node python
```

Se algum esperado retornar vazio: PARE e reporte. Nao continue.

Tambem confirme que diretorios essenciais do projeto existem (ex:
`<HARNESS_DIR>`). Se nao existirem, projeto nao foi inicializado direito.

### Setup 1: Bootstrap framework-specific (se aplicavel)

Se o projeto usa framework que requer arquivos gerados (Next.js, Vite, Astro,
SvelteKit, Remix), confirme que o arquivo de bootstrap existe ANTES de rodar
typecheck. Veja clinerules regra 0a.

Exemplo Next.js:
```cmd
if not exist frontend\next-env.d.ts (
  echo /// ^<reference types="next" /^> > frontend\next-env.d.ts
  echo /// ^<reference types="next/image-types/global" /^> >> frontend\next-env.d.ts
)
```

Sem o arquivo de bootstrap, typecheck cascateia centenas de erros falsos e
voce vai investigar coisa errada por horas.

### Setup 2: Estado do harness

1. Leia `<HARNESS_DIR>current.txt`. Comando:
   - cmd.exe: `type <HARNESS_DIR>current.txt`
   - bash: `cat <HARNESS_DIR>current.txt`

   - Se conteudo for `DONE`: responda "Todas as sprints concluidas" e encerre.
   - Caso contrario: o conteudo e o nome do arquivo de sprint atual
     (ex: `01-fundacao.json`).

2. Abra `<HARNESS_DIR>sprints/<arquivo-atual>` e leia inteiro (e pequeno).

2a. **Idempotencia: valide que sprints ANTERIORES estao TODAS fechadas
    individualmente.** Auto-condense do harness do agente pode ter feito
    voce avancar `current.txt` sem fechar o JSON de uma sprint anterior.
    Detecte e corrija isso antes de seguir:

   ```bash
   python -c "
   import json, glob
   problemas = []
   for f in sorted(glob.glob('<HARNESS_DIR>sprints/*.json')):
     if '00-index' in f: continue
     d = json.load(open(f, encoding='utf-8'))
     # Sprint 'done' no index mas internamente ainda tem features pending/in-progress?
     statuses = set(x['status'] for x in d['features'])
     if d['status'] != 'done' and statuses == {'pending'}:
       continue  # sprint nao iniciada — OK pular
     if d['status'] != 'done' or statuses != {'done'}:
       problemas.append((f.split('/')[-1].split(chr(92))[-1], d['status'], statuses))
   index = json.load(open('<HARNESS_DIR>sprints/00-index.json', encoding='utf-8'))
   for s in index['sprints']:
     if s['status'] == 'done':
       sprint_file = f'<HARNESS_DIR>sprints/{s[\"file\"]}'
       d = json.load(open(sprint_file, encoding='utf-8'))
       if d['status'] != 'done':
         problemas.append((s['file'], 'INDEX=done mas SPRINT=' + d['status'], None))
   if problemas:
     print('SPRINTS INCOMPLETAS:')
     for p in problemas: print(' ', p)
     exit(1)
   print('SPRINTS ANTERIORES OK')
   "
   ```

   Se aparecer `SPRINTS INCOMPLETAS`: NAO comece a feat-001 da sprint atual.
   Volte e feche o JSON da sprint anterior (marcar features e sprint root
   como done, com timestamps consistentes). So entao prossiga.

3. Capture baseline de erros de typecheck:
   ```
   <TYPECHECK_CMD> > <TMP_DIR>typecheck_baseline.txt 2>&1
   echo Exit: %errorlevel%   :: cmd.exe
   echo "Exit: $?"            :: bash
   ```

4. Conte os erros pre-existentes:
   ```
   <TYPECHECK_GREP> <TMP_DIR>typecheck_baseline.txt | <conta linhas>
   ```
   Numero retornado e o teto. Salve na sua memoria (NAO escreva em arquivo).

5. **Sanity check do typecheck.** Se baseline retornou exit 0 com arquivo de
   output VAZIO E voce esperava pelo menos algumas mensagens (ex: lista de
   arquivos compilados), o comando nao rodou. Causas tipicas:
   - tsconfig raiz com `files: []` + project references sem `--build`
   - Comando `pnpm`/`uv`/`mypy` nao no PATH
   - cd na pasta errada (raiz do repo em vez de subprojeto)

   PARE e reporte ao humano. NUNCA prossiga assumindo "deu zero erro".

## Loop de features

**REGRA DE LIFECYCLE (clinerules regra 14):** cada feature segue o ciclo
completo `in-progress -> implementa -> gates -> self-review -> done` antes de
voce comecar a proxima. NAO faca implementacao em batch (varias features
abertas ao mesmo tempo) NEM self-review em batch (assinar varias done de
uma vez).

**Isso NAO significa parar entre features.** Apos marcar feat-NNN done,
prossiga IMEDIATAMENTE para feat-NNN+1 no mesmo turno do agente. Continuar
e o default. Parar so e permitido nas condicoes da secao "Se algo falhou"
(gate falhou 3x ou erro de infraestrutura).

Para cada feature em `features[]`, na ordem, com `status == "pending"`:

### A. Inicio da feature

1. Marque no JSON da sprint: `status = "in-progress"`, `startedAt = "<ISO8601 agora>"`.
   Salve imediatamente.

   USE `write_to_file` COM O ARQUIVO INTEIRO (clinerules regra 3a). NAO use
   `replace_in_file` pra essa edicao pequena de JSON. Releia o arquivo da
   sprint inteiro, troque os dois campos da feature atual, escreva o arquivo
   completo de volta.

2. Leia `<SPEC_PATH>` no range `specLines` EXATO. Se diz `"17-53"`, leia
   linhas 17 ate 53, nada alem. Ler a SPEC inteira (ex: 17-1016) estoura o
   contexto e bloqueia o resto da sprint. Nao invente range maior.

3. Para cada entrada em `files[]`: leia o arquivo no range `lines` indicado
   EXATAMENTE. Se diz `"1-200"`, leia 1-200, nao 1-327.

   Se `lines: "new"` (arquivo a criar): nao precisa ler.

### B. Implementacao

4. Implemente seguindo `acceptanceCriteria` e `hints`. Aplique as regras 1-13
   do clinerules.

5. APOS cada `write_to_file`/`replace_in_file`:
   - **Gate 1 — parseabilidade (clinerules regra 0b):** rode o parser nativo do
     formato do arquivo. Se exit != 0: arquivo corrompido/truncado.
     `git checkout <arquivo>` e refaca. NAO tente "ajustar com replace_in_file"
     em arquivo truncado — vai compor lixo em cima de lixo.
     - JSON: `python -c "import json; json.load(open(r'<arquivo>'))"`
     - Python: `python -m py_compile <arquivo>`
     - TS/TSX: `npx tsc --noEmit --jsx preserve --module esnext <arquivo>`
       (sintatico rapido — nao usa tsconfig do projeto)
     - JS/MJS/CJS: `node --check <arquivo>`
     - YAML: `python -c "import yaml; yaml.safe_load(open(r'<arquivo>'))"`
     - TOML: `python -c "import tomllib; tomllib.load(open(r'<arquivo>','rb'))"`
   - **Gate 1.5 — import resolution (clinerules regra 0c):** se o arquivo for
     de linguagem tipada (Python, TS, etc.), rode o type-checker do stack
     restrito ao arquivo (ou do projeto se restrito nao for possivel). Use
     `<TYPECHECK_CMD>` documentado no header deste workflow + flag de escopo
     de arquivo (ex.: `--follow-imports=silent <arquivo>` para Python).
     Exit != 0 = imports/nomes nao resolvem. Corrija a causa raiz antes de
     prosseguir. Imports quebrados acumulam silenciosamente quando este gate
     nao roda.
   - **Gate 1.6 — Unicode (clinerules regra 0d):** rode
     `grep -nP '[\x{2010}-\x{2015}\x{2018}-\x{201F}]' <arquivo>` para detectar
     en-dash, em-dash, smart quotes. Hits = substituir por hifen `-` e aspas
     retas `"` e `'`. Pular se invariante 8 do projeto explicitamente
     permite em-dash.
   - **Gate 2 — bytes finais:** releia as ultimas 20 linhas do arquivo tocado.
     Para arquivos > 50KB: rode `tail -c 200` (bash) ou equivalente cmd.
     Se ultimo caractere nao bate com formato (ex: JSON sem `}` final, TS sem
     `}` ou `;` final): truncamento. `git checkout` e refaca.
   - Se truncar 2x seguidas no mesmo arquivo: PARE e reporte (regra 3).

5z. **Path placement gate (clinerules regra 0a-bis):** apos terminar TODOS
    os writes da feature, valide que cada arquivo de `files[]` com
    `lines: "new"` existe no caminho exato listado:

    ```bash
    python -c "
    import json, os
    SPRINT='<arquivo-da-sprint>'
    FEAT='<feat-NNN>'
    d = json.load(open(f'<HARNESS_DIR>sprints/{SPRINT}'))
    feat = next(f for f in d['features'] if f['id']==FEAT)
    missing = [x['file'] for x in feat['files'] if x.get('lines')=='new' and not os.path.exists(x['file'])]
    assert not missing, f'ARQUIVOS FALTANDO: {missing}'
    print('PATHS OK')
    "
    ```

    Se aparecer `ARQUIVOS FALTANDO`: voce criou no lugar errado. Procure
    com `find . -name "<basename>"` e mova com `mv` para o caminho correto
    listado em `files[]`. NAO apague e recrie — perde conteudo.

5a. **Cross-cutting drift check MECANICO (clinerules regra 10).** Se a
    feature toca arquivo listado em `crossCutting[]` da sprint, voce DEVE
    emitir no chat, antes de marcar done, um diff explicito campo a campo:

    ```
    Cross-cutting check: <id-do-contrato>
    Fonte canonica: <arquivo-da-spec>:<linhas>
    Arquivos editados nesta feature relacionados ao contrato:
      - <arquivo1>: <campos definidos / eventos / enums>
      - <arquivo2>: <idem>
    Campos canonicos enumerados:
      - <evento1>: <campos esperados> -> <arquivo1>: OK / DIVERGE em ...
      - <evento2>: <campos esperados> -> <arquivo2>: OK / DIVERGE em ...
    Diff: ZERO divergencias. (ou: lista de divergencias, com justificativa
    explicita por que cada uma e deliberada.)
    ```

    Sem essa lista emitida no chat, a feature NAO esta done. NAO basta
    "verifiquei e bate" — voce deve enumerar campo por campo.

    Falha tipica: lado A define um campo com nome `<X>` e lado B consome
    um campo com nome `<Y>`. Type checker passa em ambos os lados (cada
    lado consistente consigo mesmo), mas em runtime o campo chega como
    `undefined`. Esse e o bug que o diff mecanico previne.

    Se a sprint nao tem `crossCutting`, pule.

5b. **Dependencia declarada (clinerules regra 12).** Para cada `import` novo
    de package externo introduzido nesta feature, confirme que o pacote esta
    no manifest:
    - JS/TS: `findstr /C:"<pkg>" package.json` (cmd) ou `grep -F "<pkg>" package.json` (bash)
    - Python: idem em `pyproject.toml` ou `requirements.txt`

    Se nao retorna match: adicione ao manifest ANTES de marcar done. Import
    sem declaracao = bug silencioso esperando deploy.

### C. Gates mecanicos

6. Typecheck pos-implementacao:
   ```
   <TYPECHECK_CMD> > <TMP_DIR>typecheck_current.txt 2>&1
   <TYPECHECK_GREP> <TMP_DIR>typecheck_current.txt | <conta linhas>
   ```

   - Esse numero NAO pode ser maior que o baseline.
   - Arquivos no `git diff`: ZERO erro novo. Sem excecao. Conferir arquivo
     especifico:
     - cmd.exe: `findstr /C:"<arquivo>" <TMP_DIR>typecheck_current.txt`
     - bash: `grep "<arquivo>" <TMP_DIR>typecheck_current.txt`
     Nao pode retornar linha nenhuma do arquivo que voce editou.

7. Grep positivo: para cada padrao em `verification.grepMustMatch`, em cada
   arquivo de `verification.grepFiles`:
   - cmd.exe literal: `findstr /C:"<padrao>" <arquivo>`
   - cmd.exe regex: `findstr /R "<padrao>" <arquivo>`
   - bash literal: `grep -F "<padrao>" <arquivo>`
   - bash regex: `grep -E "<padrao>" <arquivo>`

   Todos os padroes devem retornar pelo menos uma linha.

8. Grep negativo: para cada padrao em `verification.grepMustNotMatch`:
   ```
   <busca> | <conta>
   ```
   Resultado tem que ser `0`.

8a. **Smoke gate (opcional, se a feature ou sprint definiu `verification.smoke`).**

    Typecheck nao pega bugs de runtime. Misturas de async/sync, APIs renomeadas
    em libs, contratos divergentes, deps faltando — tudo passa pelo tsc/mypy
    e quebra no primeiro `npm start`.

    Se `verification.smoke` existir, e um comando que executa um happy-path
    minimo:

    ```json
    "verification": {
      "smoke": {
        "command": "<COMANDO>",
        "timeoutSeconds": 10,
        "expectedExitCode": 0
      }
    }
    ```

    Exemplos comuns (escolha conforme sua stack — fica na sprint, nao aqui):
    - Backend Python: `python -c "from main import app; print('OK')"` (import smoke)
    - Backend FastAPI: subir uvicorn em modo daemon e curl `/health`
    - Frontend: `node -e "require('./dist/index.js')"` (apenas se houver build)
    - CLI: `node bin/cli.js --version`

    Rode com timeout pra nao trancar:
    ```cmd
    :: cmd.exe (nao tem timeout nativo, use start /wait com timeout do Windows)
    timeout /t <timeoutSeconds> > nul & <COMANDO>
    ```
    ```bash
    timeout <timeoutSeconds>s <COMANDO>
    ```

    Se exit code != esperado: feature NAO esta done. Investigue e corrija.

### D. Self-review (obrigatoria, ver clinerules regra 4)

9. Releia cada arquivo editado INTEIRO. Sem range.

10. Para cada `acceptanceCriteria` emita no chat:
    `Criterio: "<texto>" | Evidencia: <arquivo>:<linha>, <snippet>. Status: atendido.`

11. Checklist de consistencia (responda no chat):
    - Imports orfaos?
    - Simbolo usado sem import?
    - Mudou DB schema? Migration nova foi adicionada?
    - Mudou tipo compartilhado? Consumidores ainda tipam sem erro?
    - Mudou contrato IPC? Handler + preload + caller sincronizados?
    - Tocou `crossCutting`? Nomes e schemas batem com a fonte canonica?
    - Importou pacote externo? Pacote esta declarado no manifest?
    - Chamou metodo/atributo de lib externa? Confirmou que existe na versao instalada?
    - Funcao chamada de event loop async esta declarada `async def`?
      (sem `asyncio.new_event_loop()` dentro de funcao sync)

12. Diff review:
    ```
    git diff --stat
    git diff -- <arquivo>
    ```
    A mudanca e cirurgica? Sem CRLF flip global, sem reordenacao gratuita?
    Se tem ruido: `git checkout <arquivo>` e refaca cirurgicamente.

13. Segundo typecheck confirmando zero erro novo:
    ```
    <TYPECHECK_CMD> > <TMP_DIR>typecheck_current.txt 2>&1
    ```
    Releia, valide diff de erros vs baseline.

### E. Fechamento da feature

13b. **Lifecycle gate (clinerules regra 14, antes de marcar done):** confirme
     que apenas a feature atual esta `in-progress` no JSON da sprint:

    ```bash
    python -c "
    import json
    SPRINT='<arquivo-da-sprint>'
    d = json.load(open(f'<HARNESS_DIR>sprints/{SPRINT}'))
    in_prog = [f['id'] for f in d['features'] if f['status']=='in-progress']
    assert len(in_prog) <= 1, f'MAIS DE UMA in-progress: {in_prog}'
    done_no_completed = [f['id'] for f in d['features'] if f['status']=='done' and not f.get('completedAt')]
    assert not done_no_completed, f'DONE SEM completedAt: {done_no_completed}'
    print('LIFECYCLE OK')
    "
    ```

    Se falhar: voce nao manteve a disciplina de fechar o ciclo de uma
    feature antes de comecar o da proxima (clinerules regra 14). Ajuste o
    JSON antes de marcar a atual como done.

14. Se self-review passou: marque no JSON `status = "done"`,
    `completedAt = "<ISO8601 agora>"`. Salve.
    USE `write_to_file` COM O ARQUIVO INTEIRO (clinerules regra 3a).

14a. **Gate anti-esvaziamento** (obrigatorio apos a edicao do JSON, antes de
     prosseguir): rode validacao programatica que confirma que a feature ainda
     tem `acceptanceCriteria`, `hints` e `files` nao-vazios:

    cmd.exe:
    ```
    python -c "import json; d=json.load(open(r'<HARNESS_DIR>sprints\<arquivo>')); f=[x for x in d['features'] if x['id']=='<feat-id>'][0]; assert len(f.get('acceptanceCriteria',[]))>=2, 'CRITERIOS ESVAZIADOS'; assert len(f.get('hints',[]))>=1, 'HINTS ESVAZIADOS'; assert len(f.get('files',[]))>=1, 'FILES ESVAZIADO'; print('OK')"
    ```

    bash:
    ```
    python3 -c "import json; d=json.load(open('<HARNESS_DIR>sprints/<arquivo>')); f=[x for x in d['features'] if x['id']=='<feat-id>'][0]; assert len(f.get('acceptanceCriteria',[]))>=2, 'CRITERIOS ESVAZIADOS'; assert len(f.get('hints',[]))>=1, 'HINTS ESVAZIADOS'; assert len(f.get('files',[]))>=1, 'FILES ESVAZIADO'; print('OK')"
    ```

    Se assert falhar (ex: print de "CRITERIOS ESVAZIADOS"): voce esvaziou
    campos do JSON sem permissao (clinerules regra 2a). REVERTA via
    `git checkout <HARNESS_DIR>sprints/<arquivo>`, refaca a edicao preservando
    todos os campos, e tente de novo.

15. Atualize o baseline para a proxima feature:
    - cmd.exe: `copy /Y <TMP_DIR>typecheck_current.txt <TMP_DIR>typecheck_baseline.txt`
    - bash: `cp <TMP_DIR>typecheck_current.txt <TMP_DIR>typecheck_baseline.txt`

16. Avance para a proxima feature pending na mesma sprint. Sem confirmacao.
    Gerenciamento de contexto e responsabilidade do harness do agente
    (Cline ou similar) — nao tente avaliar consumo de tokens nem pedir
    compact/condense.

### Se algo falhou em qualquer passo

- Gate mecanico falhou: conserte e rode gate de novo. Repita ate passar.
  Maximo 3 tentativas. Se 3x falhar com a mesma causa, PARE e reporte.
- Self-review apontou buraco: volte ao passo 4 (implementacao). Repita ate
  passar. Maximo 3 tentativas.
- Erro de infraestrutura (typecheck nao executa, sprint JSON corrompido,
  arquivo faltando, truncamento recorrente): PARE, reporte no chat,
  aguarde humano.

Nao existe "desistir da feature". Voce sempre entrega. Se nao consegue, e
problema de infra ou da spec, nao de execucao.

## Fim de sprint

Quando todas as features do arquivo de sprint atual tem `status == "done"`:

1. No proprio arquivo de sprint, mude o campo `status` do objeto raiz para
   `"done"`. (write_to_file inteiro.)

2. Abra `<HARNESS_DIR>sprints/00-index.json` e marque o item correspondente
   como `done`. (write_to_file inteiro.)

3. Determine a proxima sprint (proximo numerado em `00-index.json` com status
   `pending`).

4. Se existir proxima:
   - Sobrescreva `<HARNESS_DIR>current.txt` com o nome do arquivo dela.
   - **NAO PARE.** **NAO** reporte "sprint concluida, aguardando".
     **NAO** peca confirmacao para continuar. Voce deve, sem nenhuma
     pausa, executar:
     1. recapturar o baseline de typecheck do (novo) stack — se a sprint
        seguinte muda de stack, o baseline antigo nao vale; rode o
        `<TYPECHECK_CMD>` correspondente
     2. abrir o arquivo da nova sprint e ler inteiro
     3. iniciar a feat-001 dela seguindo o "Loop de features"

   Gerenciamento de contexto/tokens e responsabilidade do harness do agente
   (Cline ou similar) — nao avalie consumo, nao peca compact, nao reporte
   uso de tokens. Prossiga sempre.

5. Se era a ultima sprint:
   - Sobrescreva `<HARNESS_DIR>current.txt` com `DONE`.
   - Va para "Encerramento".

**Gate de fechamento de sprint (obrigatorio antes de tocar qualquer arquivo
da proxima sprint):** os 3 marcadores devem estar verdes:

```bash
python -c "
import json
SPRINT='<arquivo-da-sprint-recem-finalizada>'
sprint = json.load(open(f'<HARNESS_DIR>sprints/{SPRINT}'))
index = json.load(open('<HARNESS_DIR>sprints/00-index.json'))
current = open('<HARNESS_DIR>current.txt').read().strip()
assert sprint['status']=='done', f'sprint.status={sprint[\"status\"]}'
assert all(f['status']=='done' for f in sprint['features']), 'features pendentes'
idx_entry = next(s for s in index['sprints'] if s['file']==SPRINT)
assert idx_entry['status']=='done', f'index entry status={idx_entry[\"status\"]}'
assert current != SPRINT, f'current.txt nao avancou (ainda aponta {SPRINT})'
print('SPRINT FECHADA OK')
"
```

Sem os 3 marcadores verdes, a sprint NAO esta fechada — proibido reportar
"sprint concluida" e proibido comecar a proxima.

Nao pare entre sprints. Nao peca confirmacao. Nao resuma progresso.

## Encerramento (ultima sprint concluida)

1. Remova temporarios:
   - cmd.exe: `del <TMP_DIR>typecheck_baseline.txt <TMP_DIR>typecheck_current.txt 2>nul`
   - bash: `rm -f <TMP_DIR>typecheck_baseline.txt <TMP_DIR>typecheck_current.txt`

2. Reporte no chat um sumario enxuto:
   - Total de sprints concluidas: N/N.
   - Total de features concluidas: M.
   - Observacoes pontuais (ex: refatoracao minima fora do escopo, com
     justificativa).

3. Encerre.

## Regras do autopilot

- Zero confirmacao intermediaria entre features ou sprints.
- Output do chat entre features: minimo. Cabecalho "Feature feat-NNN
  iniciando" + self-review por criterio + cabecalho "feat-NNN done".
- Nao resuma progresso a cada sprint. So no encerramento.
- Nao refatore fora do escopo da feature. Se for absolutamente necessario,
  registre uma linha unica no chat ("refactor minimo em X por razao Y") e siga.
- Nao abra a proxima sprint antes de todas as features da atual estarem done.

---

## Anti-patterns conhecidos (NAO repetir)

### Sprint nao fecha

**Sintoma:** todas features `done` mas sprint root ainda `pending`. `current.txt`
nao avancou.

**Fix:** garanta que o passo "Fim de sprint" execute. Se voce passou da ultima
feature da sprint, isso e obrigatorio. NAO siga pra proxima feature antes de
fechar a sprint.

### specLines amplo demais

**Sintoma:** voce le 1000 linhas quando devia ler 50, queima contexto, sprint
quebra.

**Fix:** respeite `specLines` EXATO. Se o JSON da feature ta com range largo
demais, reporte ao humano e aguarde antes de seguir.

### Feature done com codigo truncado

**Sintoma:** write_to_file foi cortado no meio, codigo termina com identifier
incompleto.

**Fix:** SEMPRE faca passo 5 do step B (releia ultimas 20 linhas + tail bytes
para arquivos grandes). Sem isso, esta violando clinerules regra 3.

### IPC / contrato sem espelho

**Sintoma:** voce atualiza handler do backend mas o frontend continua sem ver
o campo novo.

**Fix:** sempre que tocar contrato cross-camada, edite handler + preload +
caller no MESMO turno. Liste os 3 arquivos em `files[]`.

### Typecheck false positive

**Sintoma:** rodou comando, deu exit 0, mas nao checou nada.

**Fix:** o setup passo 5 cobre. Se `<TYPECHECK_CMD>` retorna instantaneamente
sem saida, nao e validacao. Reporte e aguarde.
