/**
 * Plugin: Re-engajamento
 * Leads que ficaram em silêncio por 5+ dias recebem mensagem de reativação
 * com um novo ângulo — insight de mercado ou convite direto.
 * Máximo 1 tentativa de reengajamento por lead.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { sendWhatsApp } = require('../zapi');

const client = new Anthropic();

const REENG_SYSTEM = `Você é Sofia Mendes, secretária particular sênior do advisor Hariton Gomes (Altum Wealth).
Você está retomando contato com um cliente que não respondeu há alguns dias.
NÃO mencione que faz tempo que não falam. Aborde como se fosse um novo insight importante que você quis compartilhar.
Use um ângulo completamente diferente da primeira abordagem — notícia de mercado, mudança regulatória ou oportunidade sazonal.
Tom: caloroso, genuíno, sem pressão. Máximo 2 parágrafos.
Responda sempre em português brasileiro.`;

const INSIGHTS_POR_NICHO = {
  medico_cirurgiao: 'mudanças recentes na regulamentação de proteção patrimonial para médicos e o aumento de processos no setor de saúde',
  advogado_tributarista: 'as novas regras de tributação de offshores (Lei 14.754/2023) e como estruturas bem montadas ainda garantem eficiência fiscal',
  ceo_empresario: 'a desvalorização do real em 2024 e como empresários com parte do patrimônio em dólar protegeram o poder de compra',
  dentista_especialista: 'o crescimento de dentistas especialistas entre os clientes de private banking e as estratégias mais usadas por eles',
  engenheiro_executivo: 'os riscos de concentração em stock options e como executivos sênior estão diversificando além da empresa empregadora'
};

async function gerarMensagemReengajamento(lead) {
  const insight = INSIGHTS_POR_NICHO[lead.nicho] || 'tendências do mercado de investimentos internacionais para profissionais de alta renda';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 280,
    system: REENG_SYSTEM,
    messages: [{
      role: 'user',
      content: `Gere uma mensagem de reativação para ${lead.nome}, ${lead.profissao} em ${lead.cidade}.
Patrimônio estimado: ${lead.patrimonio}.
Use como gancho: ${insight}.
Finalize com um convite suave para uma conversa de 15 min com o Hariton.`
    }]
  });

  return response.content[0].text;
}

async function executarReengajamento(prisma) {
  const ha5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const ha10dias = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    include: { mensagens: { orderBy: { timestamp: 'desc' }, take: 1 } },
    where: {
      estagio: { in: ['prospeccao', 'qualificacao'] },
      reengajado: { not: true }
    }
  });

  let enviados = 0;
  for (const lead of leads) {
    const ultimaMsg = lead.mensagens[0];
    if (!ultimaMsg) continue;

    const ts = new Date(ultimaMsg.timestamp);
    const silencioLongo = ts < ha5dias && ts > ha10dias;
    if (!silencioLongo) continue;

    try {
      const mensagem = await gerarMensagemReengajamento(lead);
      await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: mensagem } });
      await sendWhatsApp(lead.whatsapp, mensagem);
      await prisma.lead.update({ where: { id: lead.id }, data: { reengajado: true } });
      enviados++;
      console.log(`[Re-engajamento] Mensagem enviada para ${lead.nome}`);
      await new Promise(r => setTimeout(r, 15000)); // 15s entre envios
    } catch (err) {
      console.error(`[Re-engajamento] Erro para ${lead.nome}:`, err.message);
    }
  }

  if (enviados > 0) console.log(`[Re-engajamento] ${enviados} mensagens enviadas`);
}

module.exports = { executarReengajamento };
