# AIOS Inteligence — OdontoCompany

App interno onde a equipe revisa e aprova o que a IA sugeriu para as duas unidades da
OdontoCompany (Vila Helena e Santa Rosália, Sorocaba/SP).

Os workflows n8n rodam em **shadow**: classificam as conversas do dia e gravam a sugestão no
Supabase, sem tocar no CRM. **Este app é o único caminho até a WTS.** Aprovar aplica etiqueta,
move ou cria o card e envia a mensagem. Rejeitar é só um UPDATE.

## Stack

Vite · React 18 · TypeScript · TanStack Router e Query · Tailwind · Radix/shadcn ·
Supabase (REST + Realtime) · Sonner · lucide-react · date-fns

## Variáveis de ambiente

| Var | Onde | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | build | `https://ehlpmukjdknnyhkycncb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | build | anon key do projeto |
| `WTS_TOKEN_ODONTO_COMPANY` | **runtime, server** | token WTS da conta |

O token WTS **nunca vai para o browser**: todas as chamadas passam por `/api/wts?p=<path>`,
uma Vercel Function que injeta o `Authorization`. Isso também resolve o CORS, que a WTS não manda.

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev                  # http://localhost:5173
```

`npm run dev` sozinho não serve `/api/wts`. Para exercitar o fluxo de aprovação localmente use
`vercel dev`.

## Estrutura

```
api/wts.ts            proxy da WTS (token server-side)
src/lib/units.ts      as duas unidades: painel, canal, número, equipe, colunas
src/lib/constants.ts  tabelas, cenários, taxonomia de etiquetas, limites da mensagem
src/lib/wts.ts        helpers da API (nunca dão throw, devolvem WtsResult)
src/lib/validation.ts as 6 regras da mensagem
src/hooks/            suggestions, history, realtime, panel-mapping, tags, approve, reject
src/components/       layout (header, unidade, lote) · table · drawer · ui
src/routes/           / (fila) e /historico
```

## O que muda em relação ao app do Life Plans

**Duas unidades em tudo.** Painel, canal, número de WhatsApp, departamento e equipe são por
unidade. O seletor no header decide o que a fila mostra e persiste em localStorage.

**Os dois Lucas.** Existem dois atendentes chamados Lucas de Sousa, um por unidade, com
userIds diferentes. O nome sozinho não distingue, então operador e responsável sempre aparecem
como `Lucas (VH)` / `Lucas (ST)`.

**A mensagem é assinada.** Toda saída leva `*Nome:*` do atendente que já atende a conversa.
O preview mostra o texto exatamente como o paciente vai receber.

**Cinco colunas, não sete.** Desmarcou e Faltou ficam de fora: quem sabe quem faltou é o Painel
de Agendamento. Se a IA sugerisse falta, ela estaria inferindo por silêncio — foi o que
aconteceu em teste e por isso essas colunas saíram do catálogo.

**Duas validações a mais.** Além de travessão, tamanho e tom comercial, a mensagem não pode
conter **valor em reais** nem **data ou horário**. A segunda nasceu de um erro real: a IA
escreveu "sua consulta está confirmada para hoje às 17:00" com um horário que não existia no
histórico.

**Card em estado final.** Card em WON ou LOST não aceita troca de etapa (o PUT devolve 500).
O seletor de coluna nasce desabilitado nesses casos. Em Santa Rosália é comum: o painel fecha
card sozinho depois de 30 dias parado, o que quase nunca significa recusa do paciente.

**Contexto de anúncio.** O drawer mostra por qual campanha e criativo o paciente entrou, quando
a sessão tem UTM. Em odontologia popular isso muda a conversa.

## Armadilhas da API que o código respeita

- `Authorization` **sem** `Bearer` — com Bearer é 401.
- Mover card é `PUT /crm/v2/panel/card/{id}` com `{ fields: ['StepId'], stepId }`. Só `{ stepId }` dá 500.
- Listar card usa `Statuses` **repetido** na query, senão card ganho some da listagem.
- Telefone vai no formato pipe: `+55|15991511317`.
- `from` da mensagem vai **formatado**: `(15) 99151-1317`, não em dígitos.
- `GET /core/v1/tag` devolve array nu, não `{ items }`.
- `sleep(700)` entre chamadas: a WTS aceita ~1.5 req/s.
- A API não cria definição de etiqueta, só aplica. Etiqueta nova é cadastrada na interface do WTS.

## Deploy

Vercel, framework `vite`, output `dist`. O `vercel.json` já traz o rewrite de SPA preservando
`/api`.

## Referências

- Spec do pipeline: `docs/2026-08-07-odonto-followup-scanner-design.md` no vault
- Workflows n8n: `M10XfaFlxoLcbbSW` e `1RkP3M4rCOC4gEwY` (scanners), `JIHnkypys3EEN6FO` e `tH7jXf5exr4v9rPn` (classifiers)
- Tabelas: `wts_auto_followups_logs_odonto`, `wts_auto_followups_runs_odonto`, `wts_panel_mapping`
