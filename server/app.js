require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

// Singleton Prisma — evita "too many connections" em ambiente serverless
let prisma;
function getPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

const sofia = require('./sofia');
const { sendWhatsApp, extractPhoneFromWebhook, extractTextFromWebhook, isIncomingMessage } = require('./zapi');
const { podendoAgendar } = require('./scheduler');
const { notificarReuniaoConfirmada } = require('./plugins/notificacao');
const { calcularScore } = require('./plugins/scoring');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({
  status: 'ok',
  ts: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
  db: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'local'
}));

// ─── Leads ────────────────────────────────────────────────────────────────────

app.get('/api/leads', async (req, res) => {
  try {
    const db = getPrisma();
    const leads = await db.lead.findMany({
      include: {
        mensagens: { orderBy: { timestamp: 'asc' } },
        reunioes:  { orderBy: { data: 'desc' } }
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  const { nome, whatsapp, nicho, regiao, patrimonio, profissao, perfil, cidade, estado, instituicoes, tags } = req.body;
  if (!nome || !whatsapp) return res.status(400).json({ error: 'nome e whatsapp são obrigatórios' });

  const db = getPrisma();
  try {
    const lead = await db.lead.create({
      data: {
        nome, whatsapp,
        nicho:       nicho       || 'medico_cirurgiao',
        regiao:      regiao      || 'sudeste',
        patrimonio:  patrimonio  || '',
        profissao:   profissao   || '',
        perfil:      perfil      || 'Moderado',
        cidade:      cidade      || '',
        estado:      estado      || '',
        instituicoes: JSON.stringify(instituicoes || []),
        tags:         JSON.stringify(tags || [])
      }
    });

    // Em Vercel: waitUntil mantém a função viva após o response
    // Em local: setImmediate funciona normalmente
    const processarAbertura = async () => {
      try {
        const abertura = await sofia.gerarAbertura(lead);
        await db.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: abertura } });
        await sendWhatsApp(whatsapp, abertura);
        await db.lead.update({ where: { id: lead.id }, data: { score: 5 } });
        console.log(`[Sofia] Abertura enviada → ${lead.nome}`);
      } catch (err) {
        console.error('[Sofia] Erro ao enviar abertura:', err.message);
      }
    };

    if (req.waitUntil) {
      req.waitUntil(processarAbertura()); // Vercel
    } else {
      setImmediate(processarAbertura);    // local dev
    }

    res.json({ success: true, lead });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'WhatsApp já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
  try {
    const db = getPrisma();
    const data = { ...req.body };
    if (Array.isArray(data.instituicoes)) data.instituicoes = JSON.stringify(data.instituicoes);
    if (Array.isArray(data.tags))         data.tags         = JSON.stringify(data.tags);
    const lead = await db.lead.update({ where: { id: req.params.id }, data });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WhatsApp Webhook ─────────────────────────────────────────────────────────

app.post('/api/webhook/whatsapp', async (req, res) => {
  // Responde imediatamente para o Z-API não retentar
  res.json({ ok: true });

  if (!isIncomingMessage(req.body)) return;

  const phone   = extractPhoneFromWebhook(req.body);
  const userMsg = extractTextFromWebhook(req.body);
  if (!phone || !userMsg) return;

  const processar = async () => {
    const db = getPrisma();
    try {
      const phoneSuffix = phone.replace(/\D/g, '').slice(-8);
      const leads = await db.lead.findMany({
        include: {
          mensagens: { orderBy: { timestamp: 'asc' }, take: 20 },
          reunioes:  true
        }
      });
      const lead = leads.find(l => l.whatsapp.replace(/\D/g, '').slice(-8) === phoneSuffix);
      if (!lead) return;

      console.log(`[Webhook] ${lead.nome}: "${userMsg.slice(0, 60)}"`);

      await db.mensagem.create({ data: { leadId: lead.id, role: 'user', content: userMsg } });

      const { resposta, novoEstagio, agendou } = await sofia.responder(lead, userMsg);
      await db.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: resposta } });

      const updateData = { estagioConv: novoEstagio };

      if (agendou) {
        const ag = await podendoAgendar(new Date());
        if (ag.pode) {
          const reuniao = await db.reuniao.create({
            data: { leadId: lead.id, data: ag.dataReuniao, status: 'agendada', canal: 'whatsapp' }
          });
          updateData.estagio = 'reuniao';
          await notificarReuniaoConfirmada({ ...lead, ...updateData }, reuniao);
          console.log(`[Agenda] Reunião → ${lead.nome} em ${ag.formatada}`);
        }
      }

      const leadAtualizado = await db.lead.findUnique({
        where: { id: lead.id },
        include: { mensagens: true, reunioes: true }
      });
      updateData.score = calcularScore(leadAtualizado);

      await db.lead.update({ where: { id: lead.id }, data: updateData });
      await sendWhatsApp(lead.whatsapp, resposta);

      console.log(`[Sofia] → ${lead.nome} | estágio: ${novoEstagio} | score: ${updateData.score}`);
    } catch (err) {
      console.error('[Webhook] Erro:', err.message);
    }
  };

  // Vercel: waitUntil injected via middleware; local: setImmediate
  if (req.waitUntil) req.waitUntil(processar());
  else setImmediate(processar);
});

// ─── Meetings ─────────────────────────────────────────────────────────────────

app.get('/api/meetings/today', async (req, res) => {
  const db = getPrisma();
  const hoje = new Date();
  const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const end   = new Date(start.getTime() + 86400000);
  const reunioes = await db.reuniao.findMany({
    where: { data: { gte: start, lt: end }, status: 'agendada' },
    include: { lead: true },
    orderBy: { data: 'asc' }
  });
  res.json({ count: reunioes.length, max: parseInt(process.env.MAX_REUNIOES_DIA || '2'), reunioes });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

app.get('/api/analytics', async (req, res) => {
  const db = getPrisma();
  const leads = await db.lead.findMany({ include: { mensagens: true, reunioes: true } });
  const porEstagio = {};
  leads.forEach(l => { porEstagio[l.estagio] = (porEstagio[l.estagio] || 0) + 1; });
  const comResposta   = leads.filter(l => l.mensagens.some(m => m.role === 'user')).length;
  const taxaResposta  = leads.length > 0 ? Math.round(comResposta / leads.length * 100) : 0;
  const ha7d          = new Date(Date.now() - 7 * 86400000);
  const reunioesSemana = await db.reuniao.count({ where: { data: { gte: ha7d }, status: 'agendada' } });
  const { labelScore } = require('./plugins/scoring');
  const topLeads = leads
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .map(l => ({ id: l.id, nome: l.nome, score: l.score, label: labelScore(l.score || 0), estagio: l.estagio }));
  res.json({ total: leads.length, porEstagio, taxaResposta, reunioesSemana, topLeads,
    totalMensagens: leads.reduce((s, l) => s + l.mensagens.length, 0),
    totalReunioes:  leads.reduce((s, l) => s + l.reunioes.length, 0) });
});

// ─── AI Agent proxy ───────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { messages, system } = req.body;
  try {
    const anthropic = new Anthropic();
    const response  = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1000, system,
      messages: messages.slice(-10)
    });
    res.json({ content: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron endpoints (chamados pelo GitHub Actions) ────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET || 'altum-cron-secret';

function verificarCron(req, res) {
  const auth = req.headers['x-cron-secret'] || req.query.secret;
  if (auth !== CRON_SECRET) { res.status(401).json({ error: 'Não autorizado' }); return false; }
  return true;
}

app.post('/api/cron/followup', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const { executarFollowup } = require('./plugins/followup');
  res.json({ ok: true, iniciado: new Date().toISOString() });
  const db = getPrisma();
  setImmediate(() => executarFollowup(db).catch(console.error));
});

app.post('/api/cron/reengagement', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const { executarReengajamento } = require('./plugins/reengagement');
  res.json({ ok: true, iniciado: new Date().toISOString() });
  const db = getPrisma();
  setImmediate(() => executarReengajamento(db).catch(console.error));
});

app.post('/api/cron/scoring', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const { atualizarScores } = require('./plugins/scoring');
  const db = getPrisma();
  await atualizarScores(db);
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post('/api/cron/relatorio', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const { enviarRelatorioDiario } = require('./plugins/relatorio');
  res.json({ ok: true, iniciado: new Date().toISOString() });
  const db = getPrisma();
  setImmediate(() => enviarRelatorioDiario(db).catch(console.error));
});

module.exports = app;
