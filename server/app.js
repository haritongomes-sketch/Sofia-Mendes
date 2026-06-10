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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Salva a mensagem do lead com o zapiMessageId (trava de deduplicação).
// Retorna o registro criado, ou null se for duplicata (reentrega/corrida do webhook).
async function salvarMsgUsuario(db, leadId, content, zapiMessageId) {
  try {
    return await db.mensagem.create({
      data: { leadId, role: 'user', content, zapiMessageId: zapiMessageId || undefined }
    });
  } catch (err) {
    if (err.code === 'P2002') return null; // já existe mensagem com este zapiMessageId
    throw err;
  }
}

const sofia = require('./sofia');
const { extrairDadosConversa } = require('./sofia');
const { sendWhatsApp, extractPhoneFromWebhook, extractTextFromWebhook, extractMessageId, isIncomingMessage } = require('./zapi');
const { proximasDuasJanelas, criarEventoReuniao } = require('./skills/agenda-google');
const { partesBR, instanteBR } = require('./scheduler');
const { htmlOnePager, URL_ONE_PAGER, NICHO_TO_SEG } = require('./skills/one-pager');
const { obterScriptLinkedin } = require('./skills/linkedin');
const { htmlImportTool } = require('./skills/import-tool');
const { importarLeads, liberarLeadsDoDia, statusFila } = require('./plugins/fila');
const { notificarReuniaoConfirmada } = require('./plugins/notificacao');
const { calcularScore } = require('./plugins/scoring');
const { executarReengajamento4Meses, executarReengajamento5Dias } = require('./plugins/reengagement');

const app = express();
// origens permitidas — aceita múltiplas URLs separadas por vírgula + qualquer *.vercel.app do projeto
const rawOrigin = (process.env.FRONTEND_URL || '*').trim().replace(/[\r\n]+/g, '');
const allowedOrigins = rawOrigin === '*'
  ? '*'
  : rawOrigin.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // sem origin = curl/Postman/server-to-server — libera
    if (!origin) return cb(null, true);
    // lista wildcard
    if (allowedOrigins === '*') return cb(null, true);
    // verifica lista exata
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // permite qualquer subdomínio *.vercel.app do projeto crm-ui
    if (/^https:\/\/crm-ui[^.]*\.vercel\.app$/.test(origin)) return cb(null, true);
    // permite private-crm* também (backend self-calls)
    if (/^https:\/\/private-crm[^.]*\.vercel\.app$/.test(origin)) return cb(null, true);
    // Origem desconhecida (ex.: webhook Z-API servidor-a-servidor): NÃO lança erro —
    // apenas não envia o header de CORS. Lançar Error transformava webhooks em 500.
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({
  status: 'ok',
  ts: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
  db: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'local'
}));

// ─── One-Pager Executivo (material institucional público) ─────────────────────
// Documento de 1 página que a Sofia dispara quando o lead pede material.
// ?seg=medico|advogado|ceo|dentista|executivo (default = institucional puro).
app.get('/api/one-pager', (req, res) => {
  const seg = (req.query.seg || '').toString().toLowerCase().trim();
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlOnePager(seg));
});

// ─── Fila de Prospecção — importação em massa + liberação drip ────────────────

// Ferramenta web de importação (Excel/CSV → fila). Mesma origem da API → sem CORS.
app.get('/importar', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlImportTool());
});

// Importa uma lista de leads para a FILA (não dispara a Sofia na hora).
// Protegido pelo CRON_SECRET (header x-cron-secret) — é um endpoint de escrita em massa.
app.post('/api/leads/import', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (secret !== (process.env.CRON_SECRET || 'altum-cron-secret')) {
    return res.status(401).json({ error: 'não autorizado' });
  }
  const leads = req.body?.leads;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'envie { leads: [...] } com ao menos um lead' });
  }
  const db = getPrisma();
  try {
    const resultado = await importarLeads(db, leads);
    // Opcional: já liberar a cota do dia logo após importar
    let liberacao = null;
    if (req.body?.liberarAgora) {
      const p = liberarLeadsDoDia(db);
      if (req.waitUntil) { req.waitUntil(p); liberacao = { agendado: true }; }
      else liberacao = await p;
    }
    const fila = await statusFila(db);
    res.json({ ok: true, ...resultado, liberacao, fila });
  } catch (err) {
    console.error('[Import] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Status da fila (quantos aguardam, liberados hoje X/máx, dias para esvaziar).
app.get('/api/leads/fila', async (req, res) => {
  const db = getPrisma();
  try {
    res.json(await statusFila(db));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liberação drip — chamada pelo cron (GitHub Actions). Protegida por x-cron-secret.
app.post('/api/cron/liberar-leads', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const db = getPrisma();
  try {
    const p = liberarLeadsDoDia(db);
    // Processa em background quando possível (evita timeout do serverless em lotes).
    if (req.waitUntil) { req.waitUntil(p); return res.json({ ok: true, agendado: true }); }
    res.json({ ok: true, ...(await p) });
  } catch (err) {
    console.error('[Cron Liberar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Variante GET para Vercel Native Cron (não precisa de secret — só o Vercel chama).
app.get('/api/cron/liberar-leads-vercel', async (req, res) => {
  const db = getPrisma();
  try {
    const p = liberarLeadsDoDia(db);
    if (req.waitUntil) { req.waitUntil(p); return res.json({ ok: true, agendado: true }); }
    res.json({ ok: true, ...(await p) });
  } catch (err) {
    console.error('[Vercel Cron Liberar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
  const { nome, whatsapp, email, nicho, regiao, patrimonio, profissao, perfil, cidade, estado, instituicoes, tags } = req.body;
  if (!nome || !whatsapp) return res.status(400).json({ error: 'nome e whatsapp são obrigatórios' });

  const db = getPrisma();
  try {
    const lead = await db.lead.create({
      data: {
        nome, whatsapp,
        email:       email       || '',
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

    // Processa abertura de forma síncrona — no Vercel serverless, setImmediate
    // não executa após res.json(). Por isso aguardamos antes de responder.
    let aberturaEnviada = false;
    try {
      const abertura = await sofia.gerarAbertura(lead);
      await db.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: abertura } });
      await sendWhatsApp(whatsapp, abertura);
      await db.lead.update({ where: { id: lead.id }, data: { score: 5, ultimaInteracao: new Date() } });
      aberturaEnviada = true;
      console.log(`[Sofia] Abertura enviada → ${lead.nome}`);
    } catch (err) {
      console.error('[Sofia] Erro ao enviar abertura:', err.message);
    }

    res.json({ success: true, lead, aberturaEnviada });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'WhatsApp já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
  try {
    const db = getPrisma();
    const { recontactar, ...rest } = req.body;
    const data = { ...rest };
    if (Array.isArray(data.instituicoes)) data.instituicoes = JSON.stringify(data.instituicoes);
    if (Array.isArray(data.tags))         data.tags         = JSON.stringify(data.tags);
    let lead = await db.lead.update({ where: { id: req.params.id }, data });

    // Recontato: processa de forma síncrona ANTES de responder
    // (no Vercel serverless, setImmediate não executa após res.json())
    if (recontactar && recontactar !== 'nao' && !lead.cessarContato) {
      try {
        const leadFull = await db.lead.findUnique({
          where: { id: lead.id },
          include: { mensagens: { orderBy: { timestamp: 'asc' }, take: 20 } }
        });
        const ac = new Anthropic();
        const primeiroNome = leadFull.nome.split(' ')[0];
        const userMsgs = leadFull.mensagens.filter(m => m.role === 'user').length;
        const ultimaMsg = leadFull.mensagens.slice(-1)[0];

        let instrucao;
        if (recontactar === 'nova_abordagem') {
          instrucao = `Gere uma mensagem de WhatsApp para ${primeiroNome} com um ÂNGULO TOTALMENTE NOVO.
Perfil: ${leadFull.profissao || 'profissional'}, ${leadFull.cidade || 'Brasil'}.
Patrimônio: ${leadFull.patrimonio || 'não informado'}.
${userMsgs > 0 ? `Já houve ${userMsgs} mensagem(ns) anterior(es) — use abordagem completamente diferente. Não repita o mesmo ângulo.` : 'Primeira abordagem — mensagem de abertura calorosa.'}
Gancho: use um fato de mercado recente ou uma perspectiva que o cliente ainda não ouviu.
Objetivo: despertar curiosidade e propor os 15 minutos com Hariton.
Tom: caloroso, direto, máximo 3 parágrafos curtos.`;
        } else {
          // continuar
          instrucao = `Gere uma mensagem de WhatsApp retomando a conversa com ${primeiroNome} de onde parou.
Perfil: ${leadFull.profissao || 'profissional'}, ${leadFull.cidade || 'Brasil'}.
${userMsgs > 0
  ? `Última mensagem enviada: "${ultimaMsg?.content?.slice(0, 150) || '...'}"
Retome naturalmente, como se o tempo passado fosse normal — sem mencionar "sumiu" ou "não respondeu".`
  : 'Ainda não houve conversa — inicie como primeiro contato.'}
Objetivo: continuar o fluxo em direção ao agendamento.
Tom: caloroso, natural, máximo 3 parágrafos curtos.`;
        }

        const r = await ac.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 380,
          system: `Você é Sofia Mendes — assessora executiva de Relações Institucionais & Private Wealth Management da Altum Wealth, representando o consultor sênior Hariton Andrade. Tom sofisticado, conciso, cirúrgico; postura de igual para igual; gatilho de exclusividade e escassez de tempo. Cria mensagens de WhatsApp personalizadas e humanizadas. Nunca menciona taxas ou produtos. Nunca pergunta valores. Zero jargão de telemarketing. Nunca usa diminutivos ("minutinhos", "conversinha", "rapidinho") — diga "15 minutos", "uma conversa". Português brasileiro refinado.`,
          messages: [{ role: 'user', content: instrucao }]
        });
        const msg = r.content[0].text.trim();
        await sendWhatsApp(leadFull.whatsapp, msg);
        await db.mensagem.create({ data: { leadId: leadFull.id, role: 'assistant', content: msg } });
        lead = await db.lead.update({ where: { id: leadFull.id }, data: { ultimaInteracao: new Date() } });
        console.log(`[Recontato·${recontactar}] ✓ ${leadFull.nome}`);
      } catch (err) {
        console.error('[Recontato] Erro:', err.message);
      }
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Apagar lead ──────────────────────────────────────────────────────────────

app.delete('/api/leads/:id', async (req, res) => {
  const db = getPrisma();
  try {
    await db.mensagem.deleteMany({ where: { leadId: req.params.id } });
    await db.reuniao.deleteMany({ where: { leadId: req.params.id } });
    await db.lead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WhatsApp Webhook ─────────────────────────────────────────────────────────
// IMPORTANTE: processa SINCRONAMENTE antes de responder.
// No Vercel serverless, res.json() encerra a função — setImmediate não roda.
// Z-API aguarda resposta por até 30s; Claude + sendWhatsApp leva ~5s total.

app.post('/api/webhook/whatsapp', async (req, res) => {
  // Log compacto do payload bruto — essencial para diagnosticar a config do Z-API.
  // (aparece em `vercel logs ... --follow`). Mantido enxuto para não poluir.
  console.log('[Webhook·raw]', JSON.stringify({
    type: req.body?.type, event: req.body?.event, fromMe: req.body?.fromMe,
    isStatusReply: req.body?.isStatusReply, status: req.body?.status, phone: req.body?.phone,
    text: req.body?.text?.message || req.body?.body || req.body?.message || null,
    incoming: isIncomingMessage(req.body)
  }));

  // Mensagens que não precisam de processamento respondem imediatamente
  if (!isIncomingMessage(req.body)) return res.json({ ok: true, skip: true });

  const phone     = extractPhoneFromWebhook(req.body);
  const userMsg   = extractTextFromWebhook(req.body);
  const messageId = extractMessageId(req.body);
  if (!phone || !userMsg) return res.json({ ok: true, skip: 'no_data' });

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
    if (!lead) return res.json({ ok: true, skip: 'lead_not_found' });

    // ── Deduplicação: o Z-API reenvia o webhook quando a resposta demora.
    // Se já processamos esta mensagem, ignoramos para a Sofia não responder 2x.
    if (messageId) {
      const jaProcessada = await db.mensagem.findFirst({ where: { zapiMessageId: messageId } });
      if (jaProcessada) {
        console.log(`[Webhook] Duplicata ignorada (messageId) → ${lead.nome}`);
        return res.json({ ok: true, skip: 'duplicate' });
      }
    } else {
      // Sem messageId: dedup leve por conteúdo idêntico nos últimos 30s
      const ha30s = new Date(Date.now() - 30 * 1000);
      const recente = await db.mensagem.findFirst({
        where: { leadId: lead.id, role: 'user', content: userMsg, timestamp: { gte: ha30s } }
      });
      if (recente) {
        console.log(`[Webhook] Duplicata ignorada (conteúdo/30s) → ${lead.nome}`);
        return res.json({ ok: true, skip: 'duplicate_soft' });
      }
    }

    // Cessar contato: apenas registra, não responde
    if (lead.cessarContato) {
      await salvarMsgUsuario(db, lead.id, userMsg, messageId);
      return res.json({ ok: true, skip: 'cessar_contato' });
    }

    // Transbordo manual: IA pausada (Hariton assumiu). Registra a mensagem do lead
    // para o histórico do CRM, mas a Sofia NÃO responde até a IA ser reativada.
    if (lead.pausarIA) {
      await salvarMsgUsuario(db, lead.id, userMsg, messageId);
      await db.lead.update({ where: { id: lead.id }, data: { ultimaInteracao: new Date() } });
      console.log(`[Webhook] IA pausada (atendimento humano) → ${lead.nome}`);
      return res.json({ ok: true, skip: 'ia_pausada' });
    }

    console.log(`[Webhook] ${lead.nome}: "${userMsg.slice(0, 60)}"`);
    const meuSave = await salvarMsgUsuario(db, lead.id, userMsg, messageId);
    if (!meuSave) {
      console.log(`[Webhook] Duplicata ignorada (corrida) → ${lead.nome}`);
      return res.json({ ok: true, skip: 'duplicate_race' });
    }

    // ── Debounce: agrupa mensagens enviadas em sequência ───────────────────────
    // Aguarda uma janela curta. Se o lead mandar outra mensagem nesse meio, ESTA
    // invocação cede a vez — quem responde é a invocação da última mensagem,
    // juntando o disparo inteiro. Evita resposta picotada; conversa mais humana.
    const DEBOUNCE_MS = parseInt(process.env.DEBOUNCE_MS || '6000');
    await sleep(DEBOUNCE_MS);
    const ultimaUser = await db.mensagem.findFirst({
      where: { leadId: lead.id, role: 'user' }, orderBy: { timestamp: 'desc' }
    });
    if (ultimaUser && ultimaUser.id !== meuSave.id) {
      console.log(`[Webhook] Debounce: mensagem mais nova chegou → cede a vez (${lead.nome})`);
      return res.json({ ok: true, skip: 'debounced' });
    }

    // Sou a última do disparo: recarrego e agrego as mensagens do lead ainda sem resposta
    const fresh = await db.lead.findUnique({
      where: { id: lead.id },
      include: { mensagens: { orderBy: { timestamp: 'asc' } }, reunioes: true }
    });
    const todasMsgs = fresh.mensagens;
    let corte = todasMsgs.length - 1;
    while (corte >= 0 && todasMsgs[corte].role === 'user') corte--;
    const disparo        = todasMsgs.slice(corte + 1);              // mensagens do lead sem resposta
    const historicoMsgs  = todasMsgs.slice(0, corte + 1).slice(-20); // contexto até a última resposta
    const msgCombinada   = disparo.map(m => m.content).join('\n');
    const leadCtx        = { ...fresh, mensagens: historicoMsgs };
    if (disparo.length > 1) console.log(`[Webhook] Disparo agregado: ${disparo.length} mensagens → ${lead.nome}`);

    // Sofia gera resposta + extração de dados em paralelo (sobre o disparo combinado)
    const [sofiaResult, dadosExtraidos] = await Promise.all([
      sofia.responder(leadCtx, msgCombinada),
      extrairDadosConversa(msgCombinada, leadCtx)
    ]);
    const { resposta, novoEstagio, agendou, dataReuniaoISO, cessarContato } = sofiaResult;

    await db.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: resposta } });

    const agora = new Date();
    const updateData = { estagioConv: novoEstagio, ultimaInteracao: agora, ...dadosExtraidos };

    if (cessarContato) {
      updateData.cessarContato = true;
      updateData.estagio = 'cessado';
      await db.lead.update({ where: { id: lead.id }, data: updateData });
      await sendWhatsApp(lead.whatsapp, resposta);
      console.log(`[Sofia] STOP → ${lead.nome}`);
      return res.json({ ok: true, action: 'cessar_contato' });
    }

    if (agendou) {
      // Usa o horário exato escolhido pelo cliente (ISO emitido pela Sofia);
      // se ausente/ inválido, cai na próxima janela livre.
      let dataReuniao = dataReuniaoISO ? new Date(dataReuniaoISO) : null;
      if (!dataReuniao || isNaN(dataReuniao.getTime())) {
        const janelas = await proximasDuasJanelas(new Date());
        dataReuniao = janelas[0]?.inicio || null;
      }
      if (dataReuniao) {
        const reuniao = await db.reuniao.create({
          data: { leadId: lead.id, data: dataReuniao, status: 'agendada', canal: 'whatsapp' }
        });
        updateData.estagio = 'reuniao';
        updateData.semInteresse = false;
        // Cria evento no Google Calendar (no-op se não configurado) + notifica Hariton
        const evento = await criarEventoReuniao({ ...lead, ...updateData }, dataReuniao);
        await notificarReuniaoConfirmada({ ...lead, ...updateData }, reuniao);
        console.log(`[Agenda] Reunião → ${lead.nome} em ${dataReuniao.toISOString()} | google=${evento.criado}`);
      }
    }

    const leadAtualizado = await db.lead.findUnique({
      where: { id: lead.id },
      include: { mensagens: true, reunioes: true }
    });
    updateData.score = calcularScore(leadAtualizado);

    await db.lead.update({ where: { id: lead.id }, data: updateData });

    // Envia resposta da Sofia via WhatsApp
    await sendWhatsApp(lead.whatsapp, resposta);

    console.log(`[Sofia] ✓ → ${lead.nome} | estágio: ${novoEstagio} | score: ${updateData.score}`);
    return res.json({ ok: true, action: 'responded' });

  } catch (err) {
    console.error('[Webhook] Erro:', err.message, err.stack);
    return res.json({ ok: true, error: err.message }); // sempre 200 p/ Z-API não retentar
  }
});

// ─── Envio manual de mensagem (CRM → lead) ───────────────────────────────────

app.post('/api/leads/:id/message', async (req, res) => {
  const { mensagem, canal = 'whatsapp', gerarComSofia = false, contextoExtra = '' } = req.body;
  if (!mensagem && !gerarComSofia) return res.status(400).json({ error: 'mensagem obrigatória' });

  const db = getPrisma();
  try {
    const lead = await db.lead.findUnique({
      where: { id: req.params.id },
      include: { mensagens: { orderBy: { timestamp: 'asc' }, take: 16 } }
    });
    if (!lead) return res.status(404).json({ error: 'lead não encontrado' });

    let textoFinal = mensagem;

    // Se pediu para Sofia gerar a mensagem
    if (gerarComSofia || !mensagem) {
      const { responder, gerarAbertura, NICHOS_CONTEXTO } = require('./sofia');
      const nichoCtx = NICHOS_CONTEXTO[lead.nicho] || NICHOS_CONTEXTO.medico_cirurgiao;
      const estagio  = lead.estagioConv || 'abertura';
      const userMsgs = lead.mensagens.filter(m => m.role === 'user').length;
      const Anthropic = require('@anthropic-ai/sdk');
      const ac = new Anthropic();

      // Foco por segmento (alinhado ao posicionamento high ticket)
      const focoSegmento = {
        ceo_empresario:        'eficiência de tempo, otimização de estrutura e transição do caixa corporativo (PJ) para a blindagem do patrimônio pessoal (PF)',
        medico_cirurgiao:      'blindagem patrimonial, falta de tempo para gerir ativos e transição da alta renda física para investimentos estruturados',
        dentista_especialista: 'blindagem patrimonial e eficiência do patrimônio acumulado, com pouco tempo para gerir',
        advogado_tributarista: 'sofisticação técnica, segurança jurídica institucional e diversificação internacional / estruturas fiduciárias',
        engenheiro_executivo:  'diversificação além das ações da empresa e estruturação do patrimônio acumulado'
      }[lead.nicho] || 'eficiência, proteção e diversificação do patrimônio';

      // One-Pager do segmento (link real servido por GET /api/one-pager)
      const seg = NICHO_TO_SEG[lead.nicho] || '';
      const linkOnePager = seg ? `${URL_ONE_PAGER}?seg=${seg}` : URL_ONE_PAGER;
      // Script estático de LinkedIn como base/few-shot (voz consistente) — toque 1 no
      // primeiro contato, toque 2 (insight + horários) se já houve troca.
      const baseLinkedin = obterScriptLinkedin(lead.nicho, userMsgs === 0 ? 1 : 2, lead.nome);

      const canalInstrucao = {
        whatsapp: 'WhatsApp Business — máximo 3 parágrafos curtos, cirúrgico e institucional. Follow-up de alto impacto: referencie o contato anterior e proponha conectar o consultor sênior, oferecendo dois horários específicos (ex.: "terça às 14h ou quinta às 10h").',
        linkedin: `LinkedIn — quebra de gelo institucional, máximo 4 linhas. Mapeie a atuação do lead, apresente o modelo fiduciário e ofereça dois horários (terça/quinta) para 15 minutos com o consultor sênior.
Use o SCRIPT BASE abaixo como referência de voz e estrutura; adapte ao histórico do lead, não copie cru:
"""${baseLinkedin}"""`,
        email:    `E-mail — formato "Assunto: ..." + corpo de no máximo 6 linhas, tom executivo. Assunto direto (ex.: "Gestão patrimonial fiduciária // [Nome]"). Feche oferecendo dois horários específicos e assine como Sofia — Relações Institucionais, Altum Wealth.
Se fizer sentido anexar material, referencie o One-Pager institucional do segmento por este link (não descreva produtos): ${linkOnePager}`
      }[canal] || 'WhatsApp';

      const instrucao = `Gere uma mensagem de ${canal} para ${lead.nome.split(' ')[0]} (${lead.profissao || nichoCtx.descricao}, ${lead.cidade || 'Brasil'}).
Estágio da conversa: ${estagio} (${userMsgs} mensagens trocadas). Patrimônio: ${lead.patrimonio || 'não informado'}.
Posição: assessora executiva / Relações Institucionais — postura de igual para igual, gatilho de exclusividade e escassez de tempo do lead.
Foco do segmento (ancore a dor aqui): ${focoSegmento}.
Canal: ${canalInstrucao}
Objetivo: vender o VALOR de uma conversa de 15 minutos com o Hariton (consultor sênior) — não o serviço.
Filtro de qualificação elegante: NUNCA pergunte valores ("quanto você tem"); sinalize padrão Private sem citar números.
${contextoExtra ? `Contexto adicional: ${contextoExtra}` : ''}
${userMsgs === 0 ? 'É o primeiro contato — quebra de gelo institucional, apresente-se e gere curiosidade.' : `Já houve ${userMsgs} resposta(s). Continue de onde parou, cirúrgica e sem repetir o que já foi dito.`}
Gere SOMENTE o texto da mensagem, sem explicação.`;

      const res2 = await ac.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: `Você é Sofia Mendes — assessora executiva de Relações Institucionais & Private Wealth Management da Altum Wealth, representando o consultor sênior Hariton Andrade. Tom sofisticado, conciso, cirúrgico e resolutivo; postura de igual para igual; gatilho de exclusividade e escassez de tempo. Cria mensagens de prospecção personalizadas e eficazes por canal. Nunca menciona taxas, rentabilidade ou produtos. Nunca pergunta valores ("quanto você tem"). Zero jargão de telemarketing. Nunca usa diminutivos ("minutinhos", "conversinha", "rapidinho") — diga "15 minutos", "uma conversa". Sempre em português brasileiro refinado.`,
        messages: [{ role: 'user', content: instrucao }]
      });
      textoFinal = res2.content[0].text.trim();
    }

    // Envia pelo canal — só envia via Z-API quando NÃO está em modo de geração
    // (gerarComSofia=true = apenas gera o texto para revisão; envio ocorre no segundo request)
    if (canal === 'whatsapp' && !gerarComSofia) {
      const { sendWhatsApp } = require('./zapi');
      await sendWhatsApp(lead.whatsapp, textoFinal);
      // Salva no histórico como mensagem da Sofia
      await db.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: textoFinal } });
      await db.lead.update({ where: { id: lead.id }, data: { ultimaInteracao: new Date() } });
    }
    // LinkedIn, Email e modo geração: apenas retorna o texto (envio manual pelo usuário)

    res.json({ ok: true, mensagem: textoFinal, canal });
  } catch (err) {
    console.error('[Message] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Meetings ─────────────────────────────────────────────────────────────────

app.get('/api/meetings/today', async (req, res) => {
  const db = getPrisma();
  // Dia em horário de Brasília (servidor roda em UTC)
  const p = partesBR(new Date());
  const start = instanteBR(p.ano, p.mes, p.dia, 0);
  const end   = new Date(start.getTime() + 86400000);
  const reunioes = await db.reuniao.findMany({
    where: { data: { gte: start, lt: end }, status: 'agendada' },
    include: { lead: true },
    orderBy: { data: 'asc' }
  });
  res.json({ count: reunioes.length, max: parseInt(process.env.MAX_REUNIOES_DIA || '2'), reunioes });
});

// ─── Sem Interesse / Reengajamento ───────────────────────────────────────────

// Marcar lead como sem interesse (move para coluna semInteresse no CRM)
app.post('/api/leads/:id/sem-interesse', async (req, res) => {
  try {
    const db = getPrisma();
    const agora = new Date();
    const reengajarEm = new Date(agora.getTime() + 4 * 30 * 24 * 60 * 60 * 1000); // +4 meses
    const lead = await db.lead.update({
      where: { id: req.params.id },
      data: { semInteresse: true, estagio: 'sem_interesse', ultimaInteracao: agora, reengajarEm }
    });
    console.log(`[CRM] Lead marcado sem interesse: ${lead.nome} | reengajar em ${reengajarEm.toLocaleDateString('pt-BR')}`);
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cron de reengajamento — chamado pelo GitHub Actions
app.post('/api/cron/reengajamento', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });

  const db = getPrisma();
  try {
    const r4m = await executarReengajamento4Meses(db);
    const r5d = await executarReengajamento5Dias(db);
    res.json({ success: true, reengajamento4meses: r4m.enviados, reengajamento5dias: r5d.enviados });
  } catch (err) {
    console.error('[Cron Reengajamento]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Diagnóstico da agenda (Google Calendar) ─────────────────────────────────
// Protegido pelo CRON_SECRET (?secret= ou header x-cron-secret) p/ não expor a agenda.
app.get('/api/agenda/diagnostico', async (req, res) => {
  const auth = req.headers['x-cron-secret'] || req.query.secret;
  if (auth !== (process.env.CRON_SECRET || 'altum-cron-secret')) {
    return res.status(401).json({ error: 'não autorizado' });
  }
  try {
    const { diagnostico } = require('./skills/agenda-google');
    res.json(await diagnostico());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  const db = getPrisma();
  try {
    const result = await executarFollowup(db);
    res.json({ ok: true, enviados: result.enviados });
  } catch (err) {
    console.error('[Cron Followup]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cron/reengagement', async (req, res) => {
  if (!verificarCron(req, res)) return;
  const { executarReengajamento4Meses, executarReengajamento5Dias } = require('./plugins/reengagement');
  const db = getPrisma();
  try {
    const [r4m, r5d] = await Promise.all([
      executarReengajamento4Meses(db),
      executarReengajamento5Dias(db)
    ]);
    res.json({ ok: true, reeng4meses: r4m.enviados, reeng5dias: r5d.enviados });
  } catch (err) {
    console.error('[Cron Reengagement]', err.message);
    res.status(500).json({ error: err.message });
  }
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
  const db = getPrisma();
  try {
    await enviarRelatorioDiario(db);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Cron Relatorio]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Vercel Native Crons (GET, chamado automaticamente pelo Vercel) ───────────
// Vercel chama estes endpoints automaticamente conforme o schedule em vercel.json.
// Não precisam de x-cron-secret — o próprio Vercel garante que só ele chama.

app.get('/api/cron/followup-vercel', async (req, res) => {
  const { executarFollowup } = require('./plugins/followup');
  const db = getPrisma();
  try {
    const result = await executarFollowup(db);
    console.log(`[Vercel Cron] Followup: ${result.enviados} enviados`);
    res.json({ ok: true, enviados: result.enviados });
  } catch (err) {
    console.error('[Vercel Cron Followup]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cron/reengagement-vercel', async (req, res) => {
  const { executarReengajamento4Meses, executarReengajamento5Dias } = require('./plugins/reengagement');
  const db = getPrisma();
  try {
    const [r4m, r5d] = await Promise.all([
      executarReengajamento4Meses(db),
      executarReengajamento5Dias(db)
    ]);
    console.log(`[Vercel Cron] Reeng: 4m=${r4m.enviados}, 5d=${r5d.enviados}`);
    res.json({ ok: true, reeng4meses: r4m.enviados, reeng5dias: r5d.enviados });
  } catch (err) {
    console.error('[Vercel Cron Reengagement]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cron/scoring-vercel', async (req, res) => {
  const { atualizarScores } = require('./plugins/scoring');
  const db = getPrisma();
  try {
    await atualizarScores(db);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Vercel Cron Scoring]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
