# Cline Rules para Sistema de Mandados PCSP

Regras carregadas todo turno pelo Cline. São invariantes. Aplicam-se a qualquer tarefa (manual ou via workflow).

Procedimentos de execução (sprints, harness, pipelines) NÃO moram aqui. Vão em `.clinerules/workflows/develop.md`.

---

## Informações do Projeto

| Parâmetro | Valor |
|-----------|-------|
| **Comando de Typecheck** | `npm run lint` (tsc --noEmit) |
| **Nota do Typecheck** | Roda o tsc --noEmit para checar os tipos de todo o projeto. |
| **Database Layer** | `src/supabaseClient.ts` |
| **Diretório de Tipos** | `src/types/` |
| **Shell em uso** | `powershell` |

---

## 0. Pre-flight (rode UMA vez no início da sessão)

ANTES de qualquer feature, valide que as ferramentas que o workflow vai usar existem no PATH do shell:

**PowerShell (Windows):**
```powershell
Get-Command pnpm, node, python -ErrorAction SilentlyContinue
node --version
```

Se algum comando esperado retornar vazio/erro: **PARE e reporte ao humano**. Não prossiga "esperando dar certo". Comando ausente vira exit 127 silencioso em runtime e você marca features como done sem ter rodado nada.

Também valide que o comando de typecheck retorna output esperado (não zero bytes silencioso) rodando uma vez sem editar nada:
```powershell
npm run lint
```

## 0a. Bootstrap framework-specific

Alguns frameworks requerem arquivos GERADOS antes de typecheck/build funcionar. Se não existirem, o tsc reporta erros falsos cascade.

Este projeto usa **Vite + React + TS**, então certifique-se de que o arquivo `src/vite-env.d.ts` existe com a referência correta:
`/// <reference types="vite/client" />`

## 0a-bis. Path placement gate (anti-pasta-no-lugar-errado)

**REGRA DURA:** caminhos em `files[]` de cada feature são SEMPRE relativos à raiz do projeto. NUNCA corte prefixos. NUNCA use `cd <subdir>` antes de criar arquivos da feature — sempre passe o path completo da raiz para o `write_to_file`.

Forma segura: passe o path COMPLETO ao tool de escrita, ex. `src/components/MyComponent.tsx`. Mantenha o cwd na raiz do projeto.

**Gate mecânico (execute após terminar a implementação da feature, antes de qualquer marcação de done):**

```powershell
python -c "
import json, os
SPRINT='01-fundacao.json'
FEAT='feat-001'
# Ajustar dinamicamente o arquivo da sprint e ID da feature
"
```

## 0b. Post-write parseability gate (anti-truncamento forte)

Modelos pequenos truncam arquivos grandes durante `write_to_file` quando o stream do LLM é cortado. **Solução: rode o parser nativo da linguagem como gate mecânico.** Parsers não mentem.

**Após cada `write_to_file` ou `replace_file_content`, rode o parser correspondente ao formato do arquivo.** Exit code != 0 ou exception = arquivo corrompido/truncado. Reverta com `git checkout <arquivo>` e refaça.

Tabela de comandos por extensão:

| Extensão | Comando de parse |
|---|---|
| `.json` | `python -c "import json; json.load(open(r'<arquivo>', encoding='utf-8'))"` |
| `.py` | `python -m py_compile <arquivo>` |
| `.ts` / `.tsx` | `npx tsc --noEmit --jsx react-jsx --module esnext --target esnext <arquivo>` (sintático rápido) |
| `.js` / `.mjs` / `.cjs` | `node --check <arquivo>` |
| `.html` | (pular ou usar tidy) |
| `.md` / `.txt` / `.css` | (sem parser; pular) |

**Padrão de uso no PowerShell:**
```powershell
python -c "import json; json.load(open(r'%FILE%', encoding='utf-8'))"
# ou no caso de TSX:
npx tsc --noEmit --jsx react-jsx --module esnext --target esnext %FILE%
```

Se o parse falha:
1. **Não reescreva por cima** diretamente.
2. `git checkout <arquivo>` (reverte para o último commit).
3. Reescreva de forma mais cirúrgica (usando `replace_file_content` ou dividindo as escritas).
4. Se truncar 2x seguidas no mesmo arquivo: PARE e reporte.

## 0c. Post-write import-resolution gate (linguagens tipadas)

**Parseability só checa SINTAXE.** Imports quebrados ou nomes não definidos passam no parseability gate.

**Após cada `write_to_file` em arquivo TS/TSX, rode o type-checker do projeto:**
```powershell
npm run lint
```
Exit != 0 = imports não resolvem OU tipos básicos quebrados. Corrija a causa raiz em vez de adicionar `// @ts-ignore`.

## 0d. Post-write Unicode gate (anti em-dash e smart quotes)

A regra 8 proíbe em-dash `—` e smart quotes em texto.

**Após cada `write_to_file`, rode (via python ou comando do terminal):**
```powershell
python -c "import io, re; content = open(r'<arquivo>', encoding='utf-8').read(); hits = re.findall(r'[\u2010-\u2015\u2018-\u201f]', content); print('UNICODE OK' if not hits else f'PROIBIDO: {hits}')"
```

## 1. TypeScript / Tipos

- Zero erro novo. Arquivos que você tocou saem com zero erro em `npm run lint`.
- **Validação de exit code obrigatória.**
  ```powershell
  npm run lint > .harness\check.txt 2>&1; echo "Exit: $LASTEXITCODE"
  ```
  Se exit != 0 mas o arquivo de output está VAZIO: o comando não rodou. Pare e reporte.
- Proibido: `// @ts-ignore`, `// @ts-expect-error`, `as any`, `any` novo.

## 2. Sem placeholder no código

- Proibido nos arquivos editados:
  - `TODO:` sem owner ou link, `// implementar depois`
  - `throw new Error('not implemented')`
  - Stub vazio retornando `undefined`
  - Strings "por enquanto", "será implementado depois", "placeholder"

## 2a. Proibido esvaziar campos de feature/sprint JSON

Ao atualizar os JSONs de sprint, você DEVE preservar todos os outros campos da feature como estavam (por exemplo, `acceptanceCriteria`, `hints`, `files`).

## 3. Integridade pós-edição (anti-truncamento)

1. Após cada edição, releia as ÚLTIMAS 20 linhas do arquivo editado.
2. Confirme:
   - Último caractere coerente (`}`, `;`, `)`, etc.)
   - Nenhuma string/identificador cortado no meio.
3. Para arquivos > 50KB: use `gc -Tail 20 <arquivo>` para confirmar as linhas finais.

## 3a. Escolha entre write_to_file e replace_file_content

- Para mudanças PONTUAIS em JSON pequeno (<500 linhas): use `write_to_file` com o arquivo inteiro reescrito.
- Para edições em código > 500 linhas: use `replace_file_content` (ou `multi_replace_file_content` para edições não contíguas) de forma cirúrgica.
- Se a mesma edição falhar 2x, pare e reporte.

## 4. Self-review obrigatória antes de marcar done

Antes de marcar status como `done` em qualquer feature:

1. Releia INTEIRO cada arquivo editado.
2. Para cada item em `acceptanceCriteria` da feature, emita no chat:
   `Critério: "<texto>" | Evidência: <arquivo>:<linha>, <snippet>. Status: atendido.`
3. Checklist de consistência:
   - Imports órfãos?
   - Símbolo usado sem import?
   - Tocou `crossCutting`? Nomes e schemas batem com a fonte canônica?
   - Importou pacote externo? Pacote está declarado no `package.json`?
4. Diff review: rode `git diff --stat` e `git diff -- <arquivo>`.

## 5. Honestidade

- Não marque `done` sem self-review completa.
- Não invente linhas, símbolos, APIs.
- Cole literalmente o comando exato que rodou, o exit code e as últimas 3 linhas do output do typecheck na self-review.

## 6. Ambiente / Shell (PowerShell no Windows)

- Buscar literal: `Select-String -Pattern "<texto>" -LiteralPath <arquivo>`
- Buscar regex: `Select-String -Pattern "<regex>" -Path <arquivo>`
- Contar matches: `(Select-String -Pattern "<texto>" -Path <arquivo>).Count`
- Ler arquivo: `Get-Content <arquivo>`
- Deletar: `Remove-Item <arquivo> -ErrorAction SilentlyContinue`
- Copiar: `Copy-Item -Path <origem> -Destination <destino> -Force`
- Redirect: `<comando> > <arquivo> 2>&1`
- Paths em comandos PowerShell: backslash `\` (ex: `.harness\sprints\01.json`)
- Paths em código TS/JSON: forward slash `/` normal

## 7. Escopo (crítico para economia de contexto)

- Toque APENAS em arquivos listados em `files[]` da feature atual.
- Leia `specLines` EXATAMENTE. Não leia a SPEC inteira.

## 8. Invariantes do projeto (Sistema de Mandados PCSP)

- **Idioma das respostas, comentários e UI:** Português BR.
- **Caracteres proibidos em texto:** em-dash `—`, smart quotes `“` ou `”` (use `-` e aspas retas `"` ou `'`).
- **Convenções de import:** imports absolutos via alias `@/` a partir de `src/` (ex: `import { ... } from '@/components/Layout'`).
- **Estado do frontend:** Context API (React).
- **Banco de dados:** Supabase (PostgreSQL). Cliente em `src/supabaseClient.ts`.
- **Frontend framework:** React + Vite + TypeScript.
- **Estilos:** TailwindCSS v3 + Vanilla CSS (em `src/index.css`).

## 9. Autopilot / Workflow

Quando estiver rodando um workflow procedural (ex: `/develop`):
- Não peça confirmação entre features ou sprints. Prossiga.
- Única parada voluntária: `current.txt == "DONE"`.

## 10. Single source of truth para contratos cross-cutting

Um contrato cross-cutting é qualquer estrutura que precisa ser idêntica em mais de um lugar do código: schemas de tabelas no Supabase, formato de arquivos de mandados extraídos, tipos compartilhados de mandados.

**Regra dura: cada contrato cross-cutting tem UMA, e apenas UMA, fonte canônica.** Os outros lugares importam dessa fonte ou a referenciam.

Se a sprint listar `crossCutting` em metadados, emita no chat antes de fechar:
```
Cross-cutting check: <id-do-contrato>
Fonte canônica: <arquivo:linhas>
...
Diff: ZERO divergências.
```

## 11. Verificação de API antes de chamar

Antes de chamar método, atributo ou função de uma biblioteca de terceiro (como Supabase JS client, jsPDF, Leaflet, etc.) que você não tem certeza absoluta de que existe na versão instalada, **VALIDE** abrindo o arquivo `package.json` ou buscando na documentação oficial da versão exata declarada.

---
