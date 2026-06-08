# Deploy em Produção — Custo R$ 0/mês
## Stack: Vercel + Neon + GitHub Actions + Make.com

```
GitHub ──push──▶ Vercel (API + webhook, 24/7 serverless)
                      │
                  Neon PostgreSQL (banco gratuito 3 GB)
                      │
               Claude API (Sofia)  ◀──▶  Z-API (WhatsApp)

GitHub Actions ──schedule──▶ /api/cron/* (follow-up, scoring, etc.)
Make.com (opcional) ──────▶ fluxos visuais adicionais
```

---

## Passo 1 — Instalar Node.js (só na primeira vez)

Baixe em **https://nodejs.org** → versão LTS → instale → reinicie o terminal.
```
node --version   # deve mostrar v20+
```

---

## Passo 2 — Criar banco Neon (gratuito, 3 GB)

1. Acesse **https://neon.tech** → "Sign up" com GitHub
2. "New Project" → dê um nome (ex: `altum-crm`)
3. **Connection string** → copie (formato: `postgresql://user:pass@host/db?sslmode=require`)
4. Guarde — vai no `DATABASE_URL` do Vercel e do `.env`

---

## Passo 3 — Configurar projeto localmente

```powershell
cd "C:\Users\harit\OneDrive\Altum\private-crm"

# Instalar dependências
npm install

# Criar .env
Copy-Item .env.example .env
notepad .env        # preencha TODAS as variáveis

# Aplicar schema no Neon
npx prisma db push --schema=server/prisma/schema.prisma

# Testar local
npm run dev
# Acesse: http://localhost:3000/health
```

---

## Passo 4 — Subir para o GitHub

```powershell
cd "C:\Users\harit\OneDrive\Altum\private-crm"

git init
git add .
git commit -m "feat: Private CRM Altum Wealth v2 — Vercel + Neon"

# Crie o repositório em https://github.com/new (pode ser privado)
git remote add origin https://github.com/SEU_USUARIO/private-crm.git
git push -u origin main
```

---

## Passo 5 — Deploy no Vercel

1. Acesse **https://vercel.com** → "Add New Project"
2. Importe o repositório do GitHub
3. **Root Directory**: deixe em branco (raiz do projeto)
4. **Build Command**: `npm run build`
5. **Output Directory**: deixe em branco
6. **Environment Variables** → adicione todas as variáveis do seu `.env`:

| Variável | Valor |
|----------|-------|
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `ZAPI_INSTANCE_ID` | seu id |
| `ZAPI_TOKEN` | seu token |
| `ZAPI_CLIENT_TOKEN` | seu client token |
| `HARITON_WHATSAPP` | 5511999999999 |
| `DATABASE_URL` | postgresql://... (Neon) |
| `CRON_SECRET` | sua senha secreta |
| `MAX_REUNIOES_DIA` | 2 |
| `TZ` | America/Sao_Paulo |

7. Clique **Deploy** → aguarde ~2 minutos
8. Anote sua URL: `https://private-crm-xxx.vercel.app`

---

## Passo 6 — Configurar GitHub Actions

No repositório GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `VERCEL_API_URL` | `https://private-crm-xxx.vercel.app` |
| `CRON_SECRET` | mesma senha do `.env` |

Os cron jobs rodam automaticamente:
- **Scoring**: a cada 30 min
- **Follow-up**: a cada hora  
- **Re-engajamento**: 3× ao dia (6h, 12h, 18h Brasília)
- **Relatório Hariton**: seg–sex às 7h45 Brasília

Para disparar manualmente: GitHub → **Actions → Sofia Automações → Run workflow**.

---

## Passo 7 — Configurar webhook no Z-API

No painel Z-API → sua instância → **Webhooks**:
- **URL de recebimento**: `https://private-crm-xxx.vercel.app/api/webhook/whatsapp`
- **Eventos**: ativar `ReceivedCallback`
- Salvar

---

## Passo 8 — Conectar CRM (frontend)

O `private-crm-v3.jsx` precisa de um projeto React (Vite):

```powershell
# Em qualquer pasta
npm create vite@latest crm-ui -- --template react
cd crm-ui
npm install

# Crie .env na pasta crm-ui:
echo "VITE_API_URL=https://private-crm-xxx.vercel.app" > .env

# Copie o componente
Copy-Item "..\private-crm-v3.jsx" "src\App.jsx"

npm run dev   # abre em http://localhost:5173
```

Para publicar o CRM também no Vercel, faça o mesmo processo de deploy para a pasta `crm-ui`.

---

## Passo 9 (Opcional) — Make.com como orquestrador visual

Use Make.com para fluxos que vão além dos cron jobs básicos:

**Cenário 1: Notificação Hariton no Slack/email** (além do WhatsApp)
- Trigger: Webhook recebe `/api/cron/relatorio`
- Action: Make.com formata e envia para Slack/email

**Cenário 2: Novo lead do LinkedIn → CRM**
- Trigger: Formulário web ou planilha Google Sheets
- Action: `POST https://private-crm-xxx.vercel.app/api/leads`

**Como criar no Make.com:**
1. "Create a new scenario"
2. Trigger: **Webhooks > Custom webhook** ou **Schedule**
3. Action: **HTTP > Make a request** → URL do seu Vercel
4. Adicione header: `x-cron-secret: sua_senha`

---

## Verificação final

```
✅ https://seu-app.vercel.app/health         → {"status":"ok"}
✅ Adicionar lead no CRM → WhatsApp enviado  → Sofia responde
✅ Responder Sofia → ela continua conversa
✅ Reunião confirmada → Hariton recebe alerta
✅ 7h45 → Hariton recebe relatório diário
✅ GitHub Actions → aba Actions mostra execuções verdes
```

---

## Custo mensal

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Hobby (gratuito) | R$ 0 |
| Neon | Free (3 GB) | R$ 0 |
| GitHub | Free | R$ 0 |
| Make.com | Free (1k ops) | R$ 0 |
| Claude API | ~R$ 5–15/mês conforme uso | ~R$ 10 |
| Z-API | plano contratado | já pago |
| **Total** | | **~R$ 10/mês** |
