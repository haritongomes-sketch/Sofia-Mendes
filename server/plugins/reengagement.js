/**
 * Plugin: Re-engajamento 4 meses
 * Leads marcados como "sem_interesse" recebem novo contato após 4 meses,
 * sempre com referência ao contato anterior e novo ângulo de abordagem.
 * Cessa contato definitivamente quando o lead pede opt-out.
 */

const { sendWhatsApp } = require('../zapi');
const { gerarMensagemReengajamento4Meses } = require('../sofia');

const QUATRO_MESES_MS = 4 * 30 * 24 * 60 * 60 * 1000; // ~120 dias

async function executarReengajamento4Meses(prisma) {
  const agora = new Date();
  const limite = new Date(agora.getTime() - QUATRO_MESES_MS);

  // Leads sem interesse, sem cessarContato, cuja ultima interação foi há 4+ meses
  // OU cuja reengajarEm já chegou
  const leads = await prisma.lead.findMany({
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 5 } },
    where: {
      semInteresse: true,
      cessarContato: false,
      OR: [
        { reengajarEm: { lte: agora } },
        {
          reengajarEm: null,
          ultimaInteracao: { lte: limite }
        }
      ]
    }
  });

  let enviados = 0;
  for (const lead of leads) {
    try {
      const mensagem = await gerarMensagemReengajamento4Meses(lead);

      await prisma.mensagem.create({
        data: { leadId: lead.id, role: 'assistant', content: mensagem }
      });
      await sendWhatsApp(lead.whatsapp, mensagem);

      // Próximo reengajamento daqui a 4 meses
      const proximoReeng = new Date(agora.getTime() + QUATRO_MESES_MS);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ultimaInteracao: agora,
          reengajarEm: proximoReeng,
          reengajado: true,
          estagio: 'prospeccao' // volta para prospecção ativa
        }
      });

      enviados++;
      console.log(`[Reeng4m] Mensagem enviada → ${lead.nome} | próximo em ${proximoReeng.toLocaleDateString('pt-BR')}`);

      // Espaçamento entre envios para não parecer spam
      await new Promise(r => setTimeout(r, 20000));
    } catch (err) {
      console.error(`[Reeng4m] Erro para ${lead.nome}:`, err.message);
    }
  }

  console.log(`[Reeng4m] ${enviados} reengajamentos enviados`);
  return { enviados };
}

// Re-engajamento de 5 dias para leads em prospecção sem resposta (fluxo original)
async function executarReengajamento5Dias(prisma) {
  const ha5dias  = new Date(Date.now() - 5 * 86400000);
  const ha10dias = new Date(Date.now() - 10 * 86400000);

  const leads = await prisma.lead.findMany({
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 1 } },
    where: {
      estagio:       { in: ['prospeccao', 'qualificacao'] },
      semInteresse:  false,
      cessarContato: false,
      reengajado:    false
    }
  });

  const { gerarMensagemAbertura } = require('./templates');
  const { sendWhatsApp: send } = require('../zapi');

  let enviados = 0;
  for (const lead of leads) {
    const ultimaMsg = lead.mensagens[0];
    if (!ultimaMsg) continue;
    const ts = new Date(ultimaMsg.timestamp);
    if (!(ts < ha5dias && ts > ha10dias)) continue;

    try {
      // Mensagem de reativação com novo ângulo
      const { gerarMensagemReengajamento4Meses: gerarMsg } = require('../sofia');
      const mensagem = await gerarMsg(lead);
      await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: mensagem } });
      await send(lead.whatsapp, mensagem);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { reengajado: true, ultimaInteracao: new Date() }
      });
      enviados++;
      await new Promise(r => setTimeout(r, 15000));
    } catch (err) {
      console.error(`[Reeng5d] Erro para ${lead.nome}:`, err.message);
    }
  }

  if (enviados > 0) console.log(`[Reeng5d] ${enviados} mensagens enviadas`);
  return { enviados };
}

module.exports = { executarReengajamento4Meses, executarReengajamento5Dias };
