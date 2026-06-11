/**
 * Plugin: Notificação Hariton
 * Hariton recebe alerta no WhatsApp quando:
 * - Sofia confirma uma reunião
 * - Lead muda para estágio "proposta"
 * - Lead quente (score > 80) não atendido há 2h+
 */

const { sendWhatsApp } = require('../zapi');

const NICHOS_LABEL = {
  medico_cirurgiao: '🏥 Médico Cirurgião',
  advogado_tributarista: '⚖️ Adv. Tributarista',
  ceo_empresario: '💼 CEO/Empresário',
  dentista_especialista: '🦷 Dentista Especialista',
  engenheiro_executivo: '⚙️ Eng. Executivo'
};

async function notificarReuniaoConfirmada(lead, reuniao) {
  const haritonWA = process.env.HARITON_WHATSAPP;
  if (!haritonWA) return;

  const dataFormatada = new Date(reuniao.data).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  });

  const msg = [
    `🎉 *REUNIÃO CONFIRMADA!*`,
    ``,
    `*Lead:* ${lead.nome}`,
    `*Profissão:* ${lead.profissao}`,
    `*Nicho:* ${NICHOS_LABEL[lead.nicho] || lead.nicho}`,
    `*Patrimônio:* ${lead.patrimonio}`,
    `*Cidade:* ${lead.cidade}`,
    ``,
    `📅 *Data:* ${dataFormatada}`,
    `📱 *WhatsApp:* ${lead.whatsapp}`,
    `📧 *E-mail:* ${lead.email || 'a coletar'}`,
    ``,
    `Sofia conduziu a conversa com sucesso! Prepare-se para o diagnóstico. 💎`
  ].join('\n');

  try {
    await sendWhatsApp(haritonWA, msg);
    console.log(`[Notificação] Hariton notificado sobre reunião com ${lead.nome}`);
  } catch (err) {
    console.error('[Notificação] Erro:', err.message);
  }
}

async function notificarLeadHot(lead) {
  const haritonWA = process.env.HARITON_WHATSAPP;
  if (!haritonWA) return;

  const msg = [
    `🔥 *Lead HOT detectado!*`,
    ``,
    `*${lead.nome}* (${NICHOS_LABEL[lead.nicho] || lead.nicho})`,
    `${lead.profissao} · ${lead.cidade}`,
    `Patrimônio: ${lead.patrimonio}`,
    `Score: ${lead.score}/100`,
    ``,
    `Sofia está cuidando — mas este lead merece atenção especial!`
  ].join('\n');

  try {
    await sendWhatsApp(haritonWA, msg);
  } catch {}
}

async function verificarLeadsHot(prisma) {
  if (!process.env.HARITON_WHATSAPP) return;

  const ha2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: { score: { gte: 80 }, estagio: { in: ['qualificacao', 'reuniao'] } },
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 1 } }
  });

  for (const lead of leads) {
    const ultimaMsg = lead.mensagens[0];
    if (ultimaMsg && ultimaMsg.role === 'user' && new Date(ultimaMsg.timestamp) < ha2h) {
      await notificarLeadHot(lead);
    }
  }
}

module.exports = { notificarReuniaoConfirmada, verificarLeadsHot };
