/**
 * Plugin: Follow-up Automático
 * Verifica a cada hora leads que tiveram contato mas não responderam.
 * Sofia envia follow-up humanizado após 24h e 72h de silêncio.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { sendWhatsApp } = require('../zapi');

const client = new Anthropic();

const FOLLOWUP_SYSTEM = `Você é Sofia Mendes, secretária particular sênior do advisor Hariton Gomes (Altum Wealth).
Você está fazendo um follow-up de uma mensagem anterior que o cliente não respondeu.
Tom: caloroso, sem pressão, como uma amiga elegante que está genuinamente tentando ajudar.
Máximo 2 parágrafos. Seja natural — não mencione "follow-up" nem "não respondeu".
Finalize com uma pergunta suave e fechada.
Responda sempre em português brasileiro.`;

async function gerarFollowup(lead, tentativa) {
  const contextoNicho = {
    medico_cirurgiao: 'médico cirurgião preocupado com proteção patrimonial',
    advogado_tributarista: 'advogado tributarista com interesse em estruturas offshore',
    ceo_empresario: 'empresário que quer diversificar fora do Brasil',
    dentista_especialista: 'dentista especialista construindo patrimônio',
    engenheiro_executivo: 'executivo sênior com concentração em ações da empresa'
  }[lead.nicho] || 'profissional de alta renda';

  const prompts = {
    1: `Gere uma mensagem de follow-up SUAVE para ${lead.nome}, ${contextoNicho} em ${lead.cidade}.
Você entrou em contato há 24 horas e não obteve resposta.
Reacenda o interesse sem pressionar. Use o primeiro nome. Tom caloroso e leve.`,
    2: `Gere uma mensagem de reativação para ${lead.nome}, ${contextoNicho}.
Você tentou contato 2 vezes nos últimos dias. Desta vez, use uma abordagem diferente —
compartilhe um insight relevante para o nicho dele e convide para uma conversa rápida.
Seja Sofia — elegante, sem pressão alguma.`
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: FOLLOWUP_SYSTEM,
    messages: [{ role: 'user', content: prompts[tentativa] || prompts[1] }]
  });

  return response.content[0].text;
}

async function executarFollowup(prisma) {
  const agora = new Date();
  const ha24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const ha72h = new Date(agora.getTime() - 72 * 60 * 60 * 1000);
  const ha96h = new Date(agora.getTime() - 96 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 5 } },
    where: { estagio: { in: ['prospeccao', 'qualificacao'] } }
  });

  let enviados = 0;
  for (const lead of leads) {
    const msgs = lead.mensagens;
    if (!msgs.length) continue;

    const ultimaMsg = msgs[0];
    const ultimaTs = new Date(ultimaMsg.timestamp);
    const foiSofia = ultimaMsg.role === 'assistant';
    const clienteNaoRespondeu = foiSofia && msgs.every(m => m.role === 'assistant' || new Date(m.timestamp) < ha72h);

    // 1º follow-up: 24h após mensagem da Sofia sem resposta do cliente
    const deve1oFollowup = foiSofia && ultimaTs < ha24h && ultimaTs > ha72h;
    // 2º follow-up: 72h após o 1º, ainda sem resposta
    const deve2oFollowup = foiSofia && ultimaTs < ha72h && ultimaTs > ha96h;

    if (!deve1oFollowup && !deve2oFollowup) continue;

    const tentativa = deve2oFollowup ? 2 : 1;

    try {
      const mensagem = await gerarFollowup(lead, tentativa);
      await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: mensagem } });
      await sendWhatsApp(lead.whatsapp, mensagem);
      enviados++;
      console.log(`[Follow-up] Tentativa ${tentativa} enviada para ${lead.nome}`);

      // Aguarda 10s entre envios para não parecer spam
      await new Promise(r => setTimeout(r, 10000));
    } catch (err) {
      console.error(`[Follow-up] Erro para ${lead.nome}:`, err.message);
    }
  }

  if (enviados > 0) console.log(`[Follow-up] ${enviados} follow-ups enviados`);
}

module.exports = { executarFollowup };
