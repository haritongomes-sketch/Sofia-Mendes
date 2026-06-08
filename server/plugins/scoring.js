/**
 * Plugin: Lead Scoring
 * Calcula score 0–100 para cada lead baseado em engajamento e perfil.
 * Roda automaticamente após cada mensagem recebida.
 */

const PESOS = {
  respondeu:          30,   // Lead respondeu ao menos uma vez
  multiplas_msgs:     15,   // Mais de 3 mensagens do lead
  muito_engajado:     10,   // Mais de 7 mensagens do lead
  reuniao_agendada:   25,   // Reunião criada
  estagio_reuniao:    10,   // Pipeline em "reunião" ou além
  estagio_proposta:   15,
  estagio_conversao:  25,
  patrimonio_alto:    10,   // patrimonioNum > 5M
  patrimonio_medio:    5,   // patrimonioNum > 2M
  nicho_premium:       5,   // CEO ou advogado tributarista
  linkedin_respondeu:  5,
  linkedin_qualificado:10,
};

function calcularScore(lead) {
  let score = 0;
  const msgs = lead.mensagens || [];
  const userMsgs = msgs.filter(m => m.role === 'user');
  const reunioes = lead.reunioes || [];

  if (userMsgs.length >= 1)  score += PESOS.respondeu;
  if (userMsgs.length >= 3)  score += PESOS.multiplas_msgs;
  if (userMsgs.length >= 7)  score += PESOS.muito_engajado;
  if (reunioes.length >= 1)  score += PESOS.reuniao_agendada;

  const estagio = lead.estagio || 'prospeccao';
  if (estagio === 'reuniao')   score += PESOS.estagio_reuniao;
  if (estagio === 'proposta')  score += PESOS.estagio_proposta;
  if (estagio === 'conversao') score += PESOS.estagio_conversao;

  const pat = lead.patrimonioNum || 0;
  if (pat > 5000000) score += PESOS.patrimonio_alto;
  else if (pat > 2000000) score += PESOS.patrimonio_medio;

  const nichoPremium = ['ceo_empresario', 'advogado_tributarista'];
  if (nichoPremium.includes(lead.nicho)) score += PESOS.nicho_premium;

  const liStatus = lead.linkedinStatus || '';
  if (liStatus === 'respondeu')   score += PESOS.linkedin_respondeu;
  if (liStatus === 'qualificado') score += PESOS.linkedin_qualificado;

  return Math.min(100, score);
}

function labelScore(score) {
  if (score >= 80) return { label: '🔥 Hot', color: '#34d399' };
  if (score >= 50) return { label: '⚡ Morno', color: '#f59e0b' };
  if (score >= 25) return { label: '🌱 Frio', color: '#5b8df5' };
  return { label: '❄️ Gelado', color: '#6b7280' };
}

async function atualizarScores(prisma) {
  const leads = await prisma.lead.findMany({ include: { mensagens: true, reunioes: true } });
  for (const lead of leads) {
    const score = calcularScore(lead);
    await prisma.lead.update({ where: { id: lead.id }, data: { score } });
  }
  console.log(`[Scoring] Scores atualizados para ${leads.length} leads`);
}

module.exports = { calcularScore, labelScore, atualizarScores };
