# Workflow /develop - Autopilot de Sprints para Sistema de Mandados PCSP

Workflow procedural de execução de sprints. Lê sprints serializadas em JSON em `.harness\sprints\`, implementa cada feature, valida via gates mecânicos + self-review, marca como done e avança para a próxima.

As regras invariantes (TypeScript, sem placeholder, integridade pós-edição, self-review, honestidade, escopo) estão em `.clinerules/clinerules.md` e valem sempre. Este workflow assume que você já leu aquelas regras.

---

## Variáveis do Harness

| Variável | Valor |
|----------|-------|
| **Comando de Typecheck** | `npm run lint` |
| **Filtro de Erros TS (PowerShell)** | `Select-String -Pattern "error TS"` |
| **Shell** | `powershell` |
| **Diretório Temporário** | `.harness\` |
| **Diretório do Harness** | `.harness\` |
| **Caminho da SPEC** | `SPEC.md` |
| **Total de Sprints** | `3` |

---

# /develop - Autopilot de Sprints

Executa TODAS as features de TODAS as sprints em sequência, sem pausar.
Única saída voluntária: `.harness\current.txt == "DONE"`.

## Setup (uma vez no início da sessão)

### Setup 0: Pre-flight (clinerules regra 0)

ANTES de tudo, valide ferramentas no PATH:
```powershell
Get-Command pnpm, node, python -ErrorAction SilentlyContinue
node --version
```
Se algum esperado retornar vazio: PARE e reporte. Não continue.

Também confirme que o diretório `.harness\sprints\` existe.

### Setup 1: Bootstrap (se aplicável)

Garanta que `src/vite-env.d.ts` existe.

### Setup 2: Estado do harness

1. Leia `.harness\current.txt` para ver qual é a sprint atual (ex: `01-fundacao.json`).
   - Se for `DONE`: responda "Todas as sprints concluídas" e encerre.

2. Abra `.harness\sprints\<arquivo-atual>` e leia inteiro.

2a. **Idempotência: valide que sprints ANTERIORES estão TODAS fechadas individualmente.**
   ```powershell
   python -c "
   import json, glob
   problemas = []
   for f in sorted(glob.glob('.harness/sprints/*.json')):
     if '00-index' in f: continue
     d = json.load(open(f, encoding='utf-8'))
     statuses = set(x['status'] for x in d['features'])
     if d['status'] != 'done' and statuses == {'pending'}:
       continue
     if d['status'] != 'done' or statuses != {'done'}:
       problemas.append((f.split('/')[-1].split(chr(92))[-1], d['status'], statuses))
   index = json.load(open('.harness/sprints/00-index.json', encoding='utf-8'))
   for s in index['sprints']:
     if s['status'] == 'done':
       d = json.load(open(f'.harness/sprints/{s[\"file\"]}', encoding='utf-8'))
       if d['status'] != 'done':
         problemas.append((s['file'], 'INDEX=done mas SPRINT=' + d['status'], None))
   if problemas:
     print('SPRINTS INCOMPLETAS:')
     for p in problemas: print(' ', p)
     exit(1)
   print('SPRINTS ANTERIORES OK')
   "
   ```

3. Capture baseline de erros de typecheck:
   ```powershell
   npm run lint > .harness\typecheck_baseline.txt 2>&1; echo "Exit: $LASTEXITCODE"
   ```

4. Conte os erros pré-existentes:
   ```powershell
   (Select-String -Pattern "error TS" .harness\typecheck_baseline.txt).Count
   ```

5. **Sanity check do typecheck.** Se baseline retornou exit 0 com arquivo vazio e você sabe que o typecheck deveria processar arquivos, certifique-se de que o comando de fato rodou.

## Loop de features

**REGRA DE LIFECYCLE (clinerules regra 14):** cada feature segue o ciclo completo `in-progress -> implementa -> gates -> self-review -> done` antes de você começar a próxima. NÃO faça implementação em batch.

Para cada feature em `features[]`, na ordem, com `status == "pending"`:

### A. Início da feature

1. Marque no JSON da sprint: `status = "in-progress"`, `startedAt = "<ISO8601 agora>"`. Salve imediatamente usando `write_to_file` com o arquivo de sprint inteiro.

2. Leia `SPEC.md` no range `specLines` EXATO indicado na feature.

3. Para cada entrada em `files[]`: leia o arquivo no range `lines` indicado EXATAMENTE.

### B. Implementação

4. Implemente seguindo os critérios de aceitação e dicas. Aplique as regras do clinerules.

5. APÓS cada escrita de arquivo:
   - **Gate 1 — parseabilidade:**
     - JSON: `python -c "import json; json.load(open(r'<arquivo>', encoding='utf-8'))"`
     - TS/TSX: `npx tsc --noEmit --jsx react-jsx --module esnext <arquivo>`
     - JS/CJS/MJS: `node --check <arquivo>`
   - **Gate 1.5 — import resolution:** rode `npm run lint` ou o equivalente restrito para certificar-se de que os novos imports resolvem.
   - **Gate 1.6 — Unicode:**
     ```powershell
     python -c "import io, re; content = open(r'<arquivo>', encoding='utf-8').read(); hits = re.findall(r'[\u2010-\u2015\u2018-\u201f]', content); print('UNICODE OK' if not hits else f'PROIBIDO: {hits}')"
     ```
   - **Gate 2 — bytes finais:** releia as últimas 20 linhas do arquivo. Se truncar 2x seguidas no mesmo arquivo: PARE e reporte.

5z. **Path placement gate:**
    ```powershell
    python -c "
    import json, os
    SPRINT='<arquivo-da-sprint>'
    FEAT='<feat-id>'
    d = json.load(open(f'.harness/sprints/{SPRINT}', encoding='utf-8'))
    feat = next(f for f in d['features'] if f['id']==FEAT)
    missing = [x['file'] for x in feat['files'] if x.get('lines')=='new' and not os.path.exists(x['file'])]
    assert not missing, f'ARQUIVOS FALTANDO: {missing}'
    print('PATHS OK')
    "
    ```

5a. **Cross-cutting drift check MECÂNICO (clinerules regra 10):** se a feature toca arquivos de `crossCutting`, emita no chat a tabela comparativa campo a campo antes de prosseguir.

5b. **Dependência declarada (clinerules regra 12):** confirme se novos pacotes importados estão declarados no `package.json`.

### C. Gates mecânicos

6. Typecheck pós-implementação:
   ```powershell
   npm run lint > .harness\typecheck_current.txt 2>&1
   ```
   A contagem de erros no arquivo atual não pode exceder a do baseline. Além disso, os arquivos que você editou no `git diff` devem ter ZERO erros novos.
   ```powershell
   Select-String -Pattern "<nome-do-arquivo-editado>" .harness\typecheck_current.txt
   ```

7. Grep positivo: valide todos os padrões de `verification.grepMustMatch`.
8. Grep negativo: certifique-se de que padrões em `verification.grepMustNotMatch` dão 0 hits.
8a. **Smoke gate:** se a sprint ou feature tiver `verification.smoke`, execute o comando correspondente e valide o exit code.

### D. Self-review (obrigatória)

9. Releia os arquivos editados inteiros.
10. Cite evidência por critério no chat.
11. Responda ao checklist de consistência.
12. Faça revisão do diff (`git diff --stat`).
13. Cole literalmente o comando, exit code e tail do typecheck.

### E. Fechamento da feature

14. Marque no JSON da sprint `status = "done"`, `completedAt = "<ISO8601 agora>"`. Salve o arquivo inteiro.
14a. **Gate anti-esvaziamento:** valide programaticamente que você não apagou ou esvaziou a lista de critérios de aceitação.
15. Atualize o baseline para a próxima feature:
    ```powershell
    Copy-Item -Path .harness\typecheck_current.txt -Destination .harness\typecheck_baseline.txt -Force
    ```
16. Avance para a próxima feature.

---

## Fim de Sprint

Quando todas as features do arquivo de sprint atual forem concluídas:

1. No arquivo da sprint atual, mude o status raiz para `"done"`.
2. Em `.harness\sprints\00-index.json`, marque a sprint como `"done"`.
3. Atualize `.harness\current.txt` com o nome do arquivo da próxima sprint pendente.
4. Se houver próxima sprint, continue sem pausar. Se não, prossiga para o Encerramento.

## Encerramento

1. Delete os arquivos temporários:
   ```powershell
   Remove-Item -Path .harness\typecheck_baseline.txt, .harness\typecheck_current.txt, .harness\check.txt -ErrorAction SilentlyContinue
   ```
2. Reporte no chat um resumo enxuto e profissional das entregas.
