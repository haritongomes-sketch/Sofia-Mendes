# Runbook — Sofia conversacional + transbordo + agenda real (24h)

Mudanças de código já aplicadas neste repositório. Este runbook cobre **o que falta
fazer manualmente** (painéis externos) e **como colocar em produção e validar**.

---

## O que já foi alterado no código

| Arquivo | Mudança |
|---|---|
| `server/zapi.js` | parsing de webhook tolerante a variações do Z-API + ignora recibos de status |
| `server/app.js` | log do payload bruto; guarda `pausarIA` (transbordo); agendamento usa horário exato confirmado + cria evento Google |
| `server/sofia.js` | oferece **2 janelas livres**; marcador `[REUNIAO_CONFIRMADA:<ISO>]` |
| `server/scheduler.js` | `proximasJanelas(n)` (compute, ciente do banco) |
| `server/skills/agenda-google.js` | **novo** — freeBusy + criar evento, com fallback automático |
| `server/prisma/schema.prisma` | campo `pausarIA Boolean @default(false)` |
| `private-crm-v3.jsx` | botão "IA ativa / Atendimento humano" + badge no card |
| `package.json` | dependência `googleapis` |
| `vercel.json` | `TZ=America/Sao_Paulo` (consistência de fuso) |

---

## P0 — Destravar a resposta automática (FAÇA PRIMEIRO)

A Sofia só responde quando o **Z-API chama o webhook de entrada**. Hoje isso não acontece.

1. Abra **https://app.z-api.io** → sua instância → **Webhooks**.
2. No campo **"Ao receber" (on-message-received)**, cole exatamente:
   ```
   https://private-crm-nine.vercel.app/api/webhook/whatsapp
   ```
   Salve. (Se já houver outro valor, é provavelmente daí que vinha o problema.)
3. Mande um WhatsApp **de um número que já é lead no CRM** para a linha da Sofia.
4. Acompanhe os logs:
   ```
   vercel logs https://private-crm-nine.vercel.app --follow
   ```
   - Aparece `[Webhook·raw] {...}` → o Z-API está chamando. Veja se a Sofia respondeu.
   - **Nada aparece** → o webhook não está salvo/ativo no Z-API (volte ao passo 2) ou falta `Client-Token`.
   - Aparece mas `skip:true` → me mande o JSON do `[Webhook·raw]` que ajusto o parsing.

> ✅ Pronto quando: você responde no WhatsApp e a Sofia responde sozinha, e a troca
> aparece no histórico do lead no CRM.

---

## P1 — Migração do banco (campo `pausarIA`)

Coluna nova com default — **não destrutiva**. Rode apontando para o Neon:

```powershell
cd C:\Users\harit\OneDrive\Altum\private-crm
# garanta que DATABASE_URL aponta para o Neon (está em .env.production)
npm run db:push
```

Depois, o botão **"IA ativa / Atendimento humano"** aparece no painel do lead no CRM:
clicar pausa a Sofia para aquele lead (as mensagens dele continuam sendo registradas);
clicar de novo reativa.

---

## P2 — Google Calendar (agenda real)

> **Funciona sem isto**: sem credenciais, a Sofia já oferece 2 janelas livres calculadas
> pelo banco (`proximasJanelas`). O Google Calendar é a camada que usa a sua agenda real.

1. **Google Cloud Console** → crie um projeto (ou use existente) → **APIs & Services**:
   - Ative a **Google Calendar API**.
   - **Credentials → Create credentials → Service account**. Crie e abra a conta.
   - Aba **Keys → Add key → JSON** → baixe o arquivo.
2. Copie o **e-mail da service account** (ex.: `sofia-cal@projeto.iam.gserviceaccount.com`).
3. No **Google Calendar** do Hariton → Configurações da agenda →
   **Compartilhar com pessoas específicas** → adicione o e-mail da service account com
   **"Fazer alterações em eventos"**.
4. Pegue o **ID da agenda** (Configurações da agenda → "ID da agenda", geralmente o e-mail do Hariton).
5. Na **Vercel** (projeto `private-crm`) → Settings → Environment Variables (Production):
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → cole **todo o conteúdo do JSON** baixado.
   - `GOOGLE_CALENDAR_ID` → o ID da agenda do passo 4.

Sem essas duas variáveis, o módulo cai no fallback automaticamente — zero erro.

---

## Deploy

```powershell
cd C:\Users\harit\OneDrive\Altum\private-crm

# 1) commit + push (repo Sofia-Mendes, branch main)
git add -A
git commit -m "Sofia: webhook robusto + transbordo manual (pausarIA) + 2 janelas/Google Calendar"
git push origin main

# 2) instalar nova dependência e migrar banco
npm install
npm run db:push

# 3) deploy backend
vercel deploy --prod --yes
```

Frontend (`crm-ui` / `private-crm-v3.jsx`): faça o build/deploy do app Vite como de costume
na Vercel para o botão de transbordo aparecer.

---

## Verificação end-to-end

1. **P0**: WhatsApp de um lead de teste → Sofia responde sozinha (logs + histórico no CRM).
2. **P1**: no CRM, "Atendimento humano" no lead → manda nova mensagem → Sofia **não**
   responde (mensagem fica registrada); reativa → Sofia volta a responder.
3. **P2**: conduza a conversa até o agendamento → Sofia oferece **duas** janelas → escolha
   uma → `GET /api/meetings/today` mostra a reunião + Hariton recebe a notificação no
   WhatsApp + (se Google configurado) evento aparece na agenda dele no horário escolhido.
4. **Regressão**: opt-out ("para de me mandar mensagem") ainda encerra o contato.

---

## Ordem recomendada nas 24h

`P0 (Z-API + teste)` → `P1 (db:push + deploy + testar transbordo)` →
`P2 fallback já funciona` → `Google Calendar (setup + env vars + redeploy)` →
verificação final.
