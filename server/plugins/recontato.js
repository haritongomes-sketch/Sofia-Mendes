/**
 * Plugin: Recontato Programado (themed follow-up agendado por data)
 *
 * Permite agendar um recontato da Sofia para uma DATA futura, com um TEMA.
 * Marcação no lead via tags:
 *   recontato:<YYYY-MM-DD>        → data em que deve recontatar
 *   recontato_tema:<id>           → tema da mensagem (ex.: seguro_protecao)
 * Quando a data chega, a Sofia gera e envia a mensagem do tema, e a tag
 * `recontato:` vira `recontato_feito:<data>` (dispara uma única vez).
 *
 * Executado pelo cron de reengajamento (3x/dia). Gate de horário comercial.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { sendWhatsApp } = require('../zapi');

const client = new Anthropic();

const RECONTATO_SYSTEM = `Você é Sofia Mendes — assessora executiva de Hariton Andrade, planejador financeiro e advisor independente (fee-based, sem comissão e sem venda de produto). Tom caloroso, sênior, cirúrgico; português brasileiro refinado. Máximo 3 parágrafos CURTOS de WhatsApp. Começa com substância (nunca "Oi, tudo bem?"). Finaliza com UMA pergunta aberta e leve.
REGRAS INEGOCIÁVEIS: NUNCA cite produtos específicos, nomes de produtos, taxas ou rentabilidade. NUNCA use diminutivos. O objetivo é DESPERTAR INTERESSE, não vender.`;

// Temas de recontato — direção de conteúdo (sem produtos).
const TEMAS = {
  seguro_protecao: {
    instrucao: `TEMA: SEGURO (estruturado/internacional) como instrumento de PROTEÇÃO PATRIMONIAL e SUCESSÃO — nunca como "produto".
ÂNGULO (desperte interesse, escolha 1-2 pontos e use com naturalidade, sem listar):
- Proteger o que a pessoa construiu e garantir que chegue intacto a quem ela ama.
- A maior parte do patrimônio de famílias fica exposta a inventário, processos e câmbio — e isso só aparece quando já é tarde.
- Estruturas internacionais de proteção/sucessão permitem transmitir patrimônio com liquidez imediata aos beneficiários, fora do inventário, com eficiência fiscal e segurança jurídica.
- Não é sobre "ter um seguro" — é sobre arquitetura de proteção e legado: quem estrutura cedo protege em vida e na sucessão.
Retome com naturalidade lembrando que ela já conversou com o Hariton recentemente. Convide para uma segunda conversa de 15 minutos especificamente sobre proteção patrimonial e sucessão.`
  }
};

function hojeBR() {
  // en-CA formata como YYYY-MM-DD; timeZone garante a data de Brasília
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function horaBR() {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
}
function parseTags(j) { try { return JSON.parse(j || '[]'); } catch { return []; } }

async function gerarMensagemRecontato(lead, temaId) {
  const tema = TEMAS[temaId] || TEMAS.seguro_protecao;
  const primeiroNome = lead.nome.split(' ')[0];
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 340,
    system: RECONTATO_SYSTEM,
    messages: [{ role: 'user', content:
`Recontato programado para ${primeiroNome} (${lead.profissao || 'profissional'}, ${lead.cidade || 'Brasil'}). Vocês já tiveram uma reunião com o Hariton recentemente — retome com naturalidade, sem mencionar "sumiço" nem "faz tempo".
${tema.instrucao}
Gere SOMENTE o texto da mensagem de WhatsApp.` }]
  });
  return res.content[0].text.trim();
}

/**
 * Envia os recontatos cujo `recontato:<data>` já venceu (data <= hoje BRT),
 * em horário comercial. Marca `recontato_feito:<hoje>` para não repetir.
 */
async function executarRecontatosProgramados(prisma) {
  const h = horaBR();
  if (h < 9 || h >= 19) return { enviados: 0, skip: 'fora_horario' }; // só horário comercial

  const hoje = hojeBR();
  const leads = await prisma.lead.findMany({ where: { cessarContato: false } });
  let enviados = 0;

  for (const lead of leads) {
    const tags = parseTags(lead.tags);
    const tagData = tags.find(t => t.startsWith('recontato:'));
    if (!tagData) continue;
    const data = tagData.slice('recontato:'.length);
    if (data > hoje) continue; // ainda não chegou a data (ISO yyyy-mm-dd compara lexicograficamente)

    const temaTag = tags.find(t => t.startsWith('recontato_tema:'));
    const temaId = temaTag ? temaTag.slice('recontato_tema:'.length) : 'seguro_protecao';

    try {
      const msg = await gerarMensagemRecontato(lead, temaId);
      await sendWhatsApp(lead.whatsapp, msg);
      await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: msg } });
      const novasTags = tags.filter(t => t !== tagData).concat(`recontato_feito:${hoje}`);
      await prisma.lead.update({ where: { id: lead.id }, data: { tags: JSON.stringify(novasTags), ultimaInteracao: new Date() } });
      enviados++;
      console.log(`[Recontato] ✓ ${lead.nome} (tema ${temaId})`);
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error('[Recontato] erro', lead.nome, err.message);
    }
  }

  if (enviados) console.log(`[Recontato] ${enviados} enviados`);
  return { enviados };
}

// ─── Check-in recorrente (ex.: semanal) — "precisa de algo?" ─────────────────

const CHECKIN_SYSTEM = `Você é Sofia Mendes, assessora de Hariton Andrade. Envie um check-in CURTO e caloroso para um cliente: no máximo 2 frases. Pergunte se está tudo bem e se ele precisa de alguma coisa. Sem vender nada, sem produtos, sem diminutivos. Português brasileiro natural e leve.`;
const CHECKIN_SYSTEM_ES = `Eres Sofía, asistente de Hariton Andrade. Envía un mensaje de seguimiento CORTO y cálido a un cliente: máximo 2 frases. Pregunta si todo está bien y si necesita algo. Sin vender nada, sin productos. Español natural y cercano.`;

function addDias(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function gerarCheckin(lead) {
  const tags = parseTags(lead.tags);
  const es = tags.includes('idioma:es');
  const nome = lead.nome.split(' ')[0];
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 130,
    system: es ? CHECKIN_SYSTEM_ES : CHECKIN_SYSTEM,
    messages: [{ role: 'user', content: `Check-in curto para ${nome} (cliente). Pergunte se está tudo bem e se precisa de alguma coisa. No máximo 2 frases.` }]
  });
  return res.content[0].text.trim();
}

/**
 * Check-ins recorrentes: leads com tag `checkin:<data>` (+ `checkin_intervalo:<dias>`,
 * default 7). Ao vencer, envia um check-in curto e reagenda para +intervalo (recorrente).
 * Pula (mas reagenda) se houve interação nos últimos 5 dias — não atrapalha conversa ativa.
 */
async function executarCheckins(prisma) {
  const h = horaBR();
  if (h < 9 || h >= 19) return { enviados: 0, skip: 'fora_horario' };

  const hoje = hojeBR();
  const leads = await prisma.lead.findMany({ where: { cessarContato: false } });
  let enviados = 0;

  for (const lead of leads) {
    const tags = parseTags(lead.tags);
    const tagData = tags.find(t => t.startsWith('checkin:'));
    if (!tagData) continue;
    const data = tagData.slice('checkin:'.length);
    if (data > hoje) continue;

    const intervaloTag = tags.find(t => t.startsWith('checkin_intervalo:'));
    const intervalo = parseInt(intervaloTag ? intervaloTag.split(':')[1] : '7') || 7;
    const prox = addDias(hoje, intervalo);
    const reagendar = (extra = {}) => prisma.lead.update({
      where: { id: lead.id },
      data: { tags: JSON.stringify(tags.filter(t => t !== tagData).concat(`checkin:${prox}`)), ...extra }
    });

    // Conversa ativa nos últimos 5 dias → não envia agora, só reagenda
    if (lead.ultimaInteracao && (Date.now() - new Date(lead.ultimaInteracao).getTime()) / 86400000 < 5) {
      await reagendar();
      continue;
    }

    try {
      const msg = await gerarCheckin(lead);
      await sendWhatsApp(lead.whatsapp, msg);
      await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: msg } });
      await reagendar({ ultimaInteracao: new Date() });
      enviados++;
      console.log(`[Check-in] ✓ ${lead.nome} → próximo ${prox}`);
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error('[Check-in] erro', lead.nome, err.message);
    }
  }

  if (enviados) console.log(`[Check-in] ${enviados} enviados`);
  return { enviados };
}

module.exports = { executarRecontatosProgramados, executarCheckins, gerarMensagemRecontato, TEMAS };
