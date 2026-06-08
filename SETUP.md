# Guia de Setup — Private CRM + Sofia WhatsApp

## 1. Instalar Node.js (único pré-requisito)

Acesse https://nodejs.org → baixe a versão **LTS** → instale normalmente.
Após instalar, abra um novo terminal (PowerShell ou CMD) e verifique:
```
node --version   # deve mostrar v20.x ou superior
npm --version    # deve mostrar 10.x ou superior
```

---

## 2. Configurar o projeto

Abra o PowerShell e execute:

```powershell
# Navegue até o projeto
cd "C:\Users\harit\OneDrive\Altum\private-crm"

# Instale as dependências
npm install

# Gere o cliente Prisma
npx prisma generate --schema=server/prisma/schema.prisma

# Crie o banco de dados
npx prisma migrate dev --name init --schema=server/prisma/schema.prisma
```

---

## 3. Configurar as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha:

```powershell
Copy-Item .env.example .env
notepad .env
```

Preencha no arquivo `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...        ← sua chave da Anthropic
ZAPI_INSTANCE_ID=...                ← ID da instância Z-API
ZAPI_TOKEN=...                      ← Token da instância Z-API
ZAPI_CLIENT_TOKEN=...               ← Client-Token (encontrado no painel Z-API)
DATABASE_URL="file:./dev.db"
MAX_REUNIOES_DIA=2
TZ=America/Sao_Paulo
PORT=3000
```

---

## 4. Testar localmente

```powershell
npm run dev
```

O servidor vai mostrar:
```
✅ Private CRM Backend rodando na porta 3000
📡 Webhook Z-API: POST http://localhost:3000/api/webhook/whatsapp
```

Teste com curl ou Postman:
```powershell
# Adicionar lead de teste (Sofia vai enviar WhatsApp automaticamente)
Invoke-RestMethod -Uri "http://localhost:3000/api/leads" -Method POST -ContentType "application/json" -Body '{"nome":"Dr. Teste","whatsapp":"5511999990000","nicho":"medico_cirurgiao","regiao":"sudeste","patrimonio":"R$ 2M","profissao":"Cirurgião","cidade":"São Paulo"}'
```

---

## 5. Deploy no Railway (para rodar 24/7)

### 5.1 Criar conta e instalar CLI
- Acesse https://railway.app e crie conta (gratuita)
- Instale o CLI: `npm install -g @railway/cli`
- Login: `railway login`

### 5.2 Deploy
```powershell
cd "C:\Users\harit\OneDrive\Altum\private-crm"
railway init
railway up
```

### 5.3 Configurar variáveis no Railway
No painel do Railway → seu projeto → Variables → adicione todas as variáveis do `.env`

### 5.4 Pegar a URL pública
Railway vai gerar uma URL como: `https://private-crm-production.up.railway.app`

---

## 6. Configurar webhook no Z-API

No painel Z-API:
1. Acesse sua instância
2. Vá em **Webhooks**
3. Configure:
   - **Webhook de recebimento**: `https://SUA-URL-RAILWAY.up.railway.app/api/webhook/whatsapp`
   - **Eventos**: ativar "ReceivedCallback"
4. Salve

A partir daqui, qualquer mensagem recebida no WhatsApp será processada pela Sofia automaticamente! 🎉

---

## 7. Usar o CRM (frontend)

O arquivo `private-crm-v3.jsx` é um componente React. Para usá-lo:

### Opção A: Vite (recomendado)
```powershell
# Em outro diretório, crie um projeto Vite
npm create vite@latest crm-frontend -- --template react
cd crm-frontend
npm install
# Copie private-crm-v3.jsx para src/App.jsx
# Adicione no .env: VITE_API_URL=http://localhost:3000
npm run dev
```

### Opção B: Usar diretamente no navegador com Babel standalone
Renomeie o arquivo para `.html` e use CDN do React + Babel (peça ao Claude para gerar a versão HTML).

---

## Fluxo completo funcionando

1. **Você adiciona um lead no CRM** → backend recebe `POST /api/leads`
2. **Sofia gera mensagem de abertura** via Claude API (personalizada por nicho)
3. **Sofia envia pelo WhatsApp** via Z-API automaticamente
4. **Lead responde** → Z-API envia webhook para o backend
5. **Sofia processa a resposta** com Claude e responde (24/7)
6. **Reunião agendada** → Sofia só oferece horários seg-sex 08h-18h
7. **CRM atualiza** → lead move para estágio "Reunião" automaticamente

---

## Onde estão os dados

- Banco de dados: `server/dev.db` (SQLite)
- Para ver/editar dados: `npx prisma studio --schema=server/prisma/schema.prisma`
- Logs do servidor: no terminal onde você rodou `npm run dev`
