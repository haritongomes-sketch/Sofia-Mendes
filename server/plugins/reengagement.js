/**
 * Plugin: Nurture contínuo (~28 dias)
 * Regra de ouro: nenhum lead fica mais de ~1 mês sem contato. Qualquer lead que
 * não recebeu nem enviou mensagem nos últimos ~28 dias (e não está agendado nem
 * pediu opt-out) recebe um toque curto e de valor, e o ciclo se repete sempre.
 * Mantém a função `executarReengajamento4Meses` por compatibilidade de import.
 */

const { sendWhatsApp } = require('../zapi');
const { gerarMensagemReengajamento4Meses } = require('../sofia');

const NURTURE_MS = 28 * 24 * 60 * 60 * 1000; // ~28 dias (nunca > 1 mês)

async function executarReengajamento4Meses(prisma) {
  const agora = new Date();
  const limite = new Date(agora.getTime() - NURTURE_MS);

  // Qualquer lead sem contato há ~28 dias, fora de estágios encerrados/agendados.
  const leads = await prisma.lead.findMany({
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 5 } },
    where: {
      cessarContato: false,
      estagio: { notIn: ['reuniao', 'confirmado', 'cessado', 'fila'] },
      ultimaInteracao: { lte: limite }
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

      // Reagenda o próximo toque para ~28 dias (ciclo perpétuo).
      const proximo = new Date(agora.getTime() + NURTURE_MS);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ultimaInteracao: agora,
          reengajarEm: proximo,
          reengajado: true
        }
      });

      enviados++;
      console.log(`[Nurture28d] Toque enviado → ${lead.nome} | próximo ~${proximo.toLocaleDateString('pt-BR')}`);

      // Espaçamento entre envios para não parecer spam
      await new Promise(r => setTimeout(r, 20000));
    } catch (err) {
      console.error(`[Nurture28d] Erro para ${lead.nome}:`, err.message);
    }
  }

  if (enviados > 0) console.log(`[Nurture28d] ${enviados} toques de nurture enviados`);
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
