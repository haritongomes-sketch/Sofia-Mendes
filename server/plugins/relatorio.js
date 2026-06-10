/**
 * Plugin: Relatório Diário para Hariton
 * Todo dia às 7h45, Hariton recebe no WhatsApp um resumo do dia:
 * - Reuniões agendadas hoje
 * - Leads mais quentes
 * - Conversas ativas
 * - Métricas gerais
 */

const { sendWhatsApp } = require('../zapi');
const { proximaAcaoCadencia } = require('./cadencia');

const CANAL_LABEL = { linkedin: '🔗 LinkedIn', email: '✉️ E-mail', whatsapp: '💬 WhatsApp' };

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }

const NICHOS_LABEL = {
  medico_cirurgiao: '🏥 Médico',
  advogado_tributarista: '⚖️ Adv. Tributarista',
  ceo_empresario: '💼 CEO',
  dentista_especialista: '🦷 Dentista',
  engenheiro_executivo: '⚙️ Eng. Executivo'
};

const ESTAGIO_LABEL = {
  prospeccao: 'Prospecção',
  qualificacao: 'Qualificação',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  conversao: 'Conversão'
};

async function enviarRelatorioDiario(prisma) {
  const haritonWA = process.env.HARITON_WHATSAPP;
  if (!haritonWA) {
    console.log('[Relatório] HARITON_WHATSAPP não configurado — pulando relatório');
    return;
  }

  const hoje = new Date();
  const leads = await prisma.lead.findMany({
    include: {
      mensagens: { orderBy: { timestamp: 'desc' }, take: 3 },
      reunioes: true
    }
  });

  // Reuniões de hoje
  const reunioesHoje = [];
  for (const lead of leads) {
    const r = lead.reunioes.filter(r =>
      r.status === 'agendada' &&
      new Date(r.data) >= startOfDay(hoje) &&
      new Date(r.data) <= endOfDay(hoje)
    );
    if (r.length) reunioesHoje.push({ lead, reuniao: r[0] });
  }

  // Leads ativos (responderam nas últimas 24h)
  const ha24h = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  const leadsAtivos = leads.filter(l =>
    l.mensagens.some(m => m.role === 'user' && new Date(m.timestamp) > ha24h)
  );

  // Métricas gerais
  const totalLeads = leads.length;
  const responderam = leads.filter(l => l.mensagens.some(m => m.role === 'user')).length;
  const totalReunioes = leads.reduce((s, l) => s + l.reunioes.length, 0);

  const maxReunioesHoje = parseInt(process.env.MAX_REUNIOES_DIA || '2');

  // Monta mensagem
  const linhas = [
    `🌅 *Bom dia, Hariton!*`,
    `📊 Relatório Private CRM — ${hoje.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}`,
    ``,
    `*📅 Reuniões de hoje (${reunioesHoje.length}/${maxReunioesHoje})*`,
  ];

  if (reunioesHoje.length === 0) {
    linhas.push(`Nenhuma reunião agendada para hoje.`);
  } else {
    reunioesHoje.forEach(({ lead, reuniao }) => {
      const hora = new Date(reuniao.data).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      linhas.push(`• ${hora}h — *${lead.nome}* (${NICHOS_LABEL[lead.nicho] || lead.nicho})`);
      linhas.push(`  ${lead.profissao} · ${lead.cidade} · ${lead.patrimonio}`);
    });
  }

  linhas.push(``);
  linhas.push(`*💬 Leads ativos nas últimas 24h (${leadsAtivos.length})*`);

  if (leadsAtivos.length === 0) {
    linhas.push(`Nenhuma conversa ativa no momento.`);
  } else {
    leadsAtivos.slice(0, 5).forEach(l => {
      const ultimaMsg = l.mensagens.find(m => m.role === 'user');
      linhas.push(`• *${l.nome}* — ${ESTAGIO_LABEL[l.estagio] || l.estagio}`);
      if (ultimaMsg) linhas.push(`  "${ultimaMsg.content.slice(0, 60)}..."`);
    });
    if (leadsAtivos.length > 5) linhas.push(`  ... e mais ${leadsAtivos.length - 5} outros`);
  }

  // Toques manuais de cadência devidos hoje (LinkedIn / e-mail) — WhatsApp é automático
  const toquesManuais = [];
  for (const l of leads) {
    const acao = proximaAcaoCadencia(l);
    if (acao && acao.canal !== 'whatsapp') toquesManuais.push({ lead: l, acao });
  }
  // Atrasados primeiro, depois por dia da régua
  toquesManuais.sort((a, b) =>
    (b.acao.atrasada - a.acao.atrasada) || (a.acao.dia - b.acao.dia));

  linhas.push(``);
  linhas.push(`*✋ Toques manuais de hoje (${toquesManuais.length})*`);
  if (toquesManuais.length === 0) {
    linhas.push(`Nenhum toque manual pendente.`);
  } else {
    toquesManuais.slice(0, 8).forEach(({ lead, acao }) => {
      const flag = acao.atrasada ? ' ⚠️' : '';
      linhas.push(`• ${CANAL_LABEL[acao.canal] || acao.canal} — *${lead.nome}*${flag}`);
      linhas.push(`  ${acao.acao}`);
    });
    if (toquesManuais.length > 8) linhas.push(`  ... e mais ${toquesManuais.length - 8} outros`);
  }

  linhas.push(``);
  linhas.push(`*📈 Métricas gerais*`);
  linhas.push(`• Total de leads: ${totalLeads}`);
  linhas.push(`• Responderam: ${responderam} (${totalLeads > 0 ? Math.round(responderam/totalLeads*100) : 0}%)`);
  linhas.push(`• Total de reuniões agendadas: ${totalReunioes}`);

  linhas.push(``);
  linhas.push(`Sofia está ativa 24/7. Boa performance hoje! 💎`);

  const mensagem = linhas.join('\n');

  try {
    await sendWhatsApp(haritonWA, mensagem);
    console.log('[Relatório] Relatório diário enviado para Hariton');
  } catch (err) {
    console.error('[Relatório] Erro ao enviar:', err.message);
  }
}

module.exports = { enviarRelatorioDiario };
