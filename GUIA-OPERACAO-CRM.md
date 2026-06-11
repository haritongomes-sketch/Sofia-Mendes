# Guia de Operação — CRM Sofia (Wealth)

Guia prático do dia a dia. O sistema é automático: você cadastra leads, a Sofia conduz
a conversa no WhatsApp, qualifica, agenda na agenda real do Hariton e te avisa.

**Quem é a Sofia (resumo):** secretária executiva do Hariton Andrade (consultor e
planejador financeiro), na **Wealth**. Tom **consultivo e humano**: ela facilita e
organiza, nunca vende nem empurra produto. **Nunca admite ser uma IA**, não fala de
taxas/produtos, não cita valores, e conduz toda conversa em direção a uma reunião de 15
minutos com o Hariton. Ao confirmar, pede o e-mail do cliente para enviar o convite.
Linguagem natural, sem travessões nem bordões de robô.

## Links

- **CRM (painel):** https://crm-ui-kappa.vercel.app
- **API (status):** https://private-crm-nine.vercel.app/health
- **Diagnóstico da agenda:** https://private-crm-nine.vercel.app/api/agenda/diagnostico?secret=altum-cron-secret

---

## 1. Cadastrar um lead (início de tudo)

No CRM, adicione o lead com **nome + WhatsApp** (DDI+DDD+número, ex.: `5515999999999`).
Campos úteis: nicho, cidade, profissão (ajudam a Sofia a personalizar).

Ao salvar, **a Sofia envia a mensagem de abertura automaticamente**. A partir daí:
- O lead responde → a Sofia responde sozinha, com contexto, e avança a conversa.
- Tudo fica registrado no histórico do lead (aba de conversa).

> A Sofia espera ~6s antes de responder; se o lead manda várias mensagens seguidas, ela
> junta tudo e responde **uma vez só** (conversa mais natural).

---

## 2. As etapas (colunas do pipeline)

- **Prospecção** → lead novo, conversa em andamento.
- **Qualificação** → Sofia entendendo o cenário.
- **Reunião** → reunião confirmada (entra aqui automaticamente ao agendar).
- **Proposta / Conversão** → você move manualmente conforme avança.

A Sofia só propõe reunião depois que o lead demonstra engajamento real (não no 1º "oi").

---

## 3. Agendamento (automático, na agenda real)

- A Sofia oferece **dois horários realmente livres** da agenda do Hariton (Google Calendar),
  em dias úteis 8h–18h (Brasília), respeitando o limite de **2 reuniões/dia**.
- Quando o lead confirma, ela:
  1. cria o evento no **Google Calendar do Hariton** (no horário certo, fuso Brasília),
  2. move o lead para **"Reunião"**,
  3. te manda uma **notificação no WhatsApp** com os dados do lead.

Para conferir as reuniões do dia: https://private-crm-nine.vercel.app/api/meetings/today

---

## 4. Assumir a conversa (transbordo humano)

Na tela do lead, seção **"Controle da IA (transbordo)"**:
- **🤖 IA ativa** → a Sofia responde.
- Clique para virar **👤 Atendimento humano** → a Sofia **para de responder** aquele lead
  (as mensagens dele continuam sendo registradas). Use quando quiser assumir pessoalmente.
- Clique de novo para reativar a IA.

No card do lead aparece o selo **👤 Atendimento humano** quando está pausado.

> Diferente do opt-out: se o lead pede "pare de me mandar mensagem", a Sofia encerra
> sozinha e marca o lead como **cessado** (não volta a contatar).

---

## 5. O que roda sozinho (automações)

- **Follow-up:** se o lead não responde, a Sofia faz toques de acompanhamento (24h, 72h,
  7d, 14d), cada um com ângulo diferente.
- **Nurture contínuo (~28 dias):** nenhum lead fica mais de 1 mês sem contato. Quem não
  fechou reunião nem pediu para parar recebe um toque curto e de valor a cada ~28 dias,
  para sempre, até responder ou agendar. O cliente se sente lembrado, sem virar spam.
- **Relatório diário:** o Hariton recebe um resumo no WhatsApp (manhã, dias úteis).
- **Scoring:** cada lead recebe uma nota de prioridade automaticamente.

---

## 6. Verificar se está tudo no ar (1 min)

1. **API viva:** abrir https://private-crm-nine.vercel.app/health → deve dizer `"status":"ok"`.
2. **Agenda conectada:** abrir o link de diagnóstico → deve mostrar
   `"fonte":"google_calendar"` e `"freeBusyOk":true`.
   - Se aparecer `"fonte":"fallback_calculado"`, a agenda real caiu (o sistema continua
     agendando, mas com horários calculados, não da agenda do Hariton).

---

## 7. Problemas comuns

**A Sofia não responde quando o lead manda mensagem:**
- Verifique no painel do **Z-API** (app.z-api.io) se o webhook **"Ao receber"** está apontando para:
  `https://private-crm-nine.vercel.app/api/webhook/whatsapp`
- O número do lead precisa estar cadastrado no CRM (o casamento é pelos últimos 8 dígitos).

**Agendou no horário errado / fuso:** o sistema usa horário de Brasília. Se a agenda do
Hariton estiver em outro fuso, ajuste o fuso da agenda no Google Calendar.

**Quer parar a Sofia num lead específico:** botão "Atendimento humano" (seção 4).

**Diagnóstico da agenda mostra fallback:** confira na Vercel se `GOOGLE_SERVICE_ACCOUNT_B64`
e `GOOGLE_CALENDAR_ID` estão setadas (Production) e que a agenda está compartilhada com a
conta de serviço (`sofia-agenda@sofia-agenda-499002.iam.gserviceaccount.com`).

---

## 8. Limites e bom uso

- **Máx. 2 reuniões/dia** (configurável na env `MAX_REUNIOES_DIA`).
- Horário comercial: **dias úteis, 8h–18h (Brasília)**.
- Público-alvo: alta renda (CEO, médico, advogado, etc.). A Sofia adapta o nível técnico
  ao cliente (simples para leigos, estratégico para sofisticados) e mantém postura
  consultiva e humana, sem diminutivo e sem jargão de telemarketing.
- Cadastre poucos leads de cada vez no começo para acompanhar as primeiras conversas e
  validar o tom antes de escalar o volume.
