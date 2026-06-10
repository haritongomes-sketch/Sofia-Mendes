/**
 * Plugin: Régua de Cadência Multicanal — fonte única de verdade
 *
 * Orquestra a prospecção de cada lead do D0 ao fechamento, combinando:
 *   • LinkedIn (manual — scripts em skills/linkedin.js)
 *   • WhatsApp (automático — Sofia: abertura + followup.js T1–T4)
 *   • E-mail   (semi-auto — One-Pager do segmento via /api/leads/:id/message)
 *
 * Meta operacional: 10 leads novos/dia → ~2 reuniões/dia.
 * Princípio: cada toque muda de ÂNGULO e de CANAL — nunca repete argumento.
 *
 * Os timings de WhatsApp (auto) espelham followup.js. Esta régua adiciona os
 * toques manuais de LinkedIn/e-mail e expõe `proximaAcaoCadencia(lead)` para o
 * CRM e o relatório diário mostrarem "o que fazer hoje" por lead.
 */

// dia = dias corridos desde o cadastro do lead (D0 = dia do cadastro)
const REGUA = [
  { dia: 0,  canal: 'linkedin', toque: 'convite', auto: false, acao: 'Convite de conexão (sem pitch) + cadastrar no CRM' },
  { dia: 0,  canal: 'whatsapp', toque: 'abertura', auto: true,  acao: 'Abertura da Sofia (se telefone conhecido)' },
  { dia: 1,  canal: 'linkedin', toque: 1,          auto: false, acao: 'Mensagem 1 institucional (ao aceitar conexão)' },
  { dia: 1,  canal: 'whatsapp', toque: 'followup_t1', auto: true, acao: 'Toque 1 — retomada + curiosidade do nicho' },
  { dia: 3,  canal: 'linkedin', toque: 2,          auto: false, acao: 'Mensagem 2 — insight de mercado + dois horários' },
  { dia: 3,  canal: 'whatsapp', toque: 'followup_t2', auto: true, acao: 'Toque 2 — insight de mercado' },
  { dia: 5,  canal: 'email',    toque: 'one_pager', auto: false, acao: 'Enviar One-Pager do segmento (se e-mail capturado)' },
  { dia: 7,  canal: 'whatsapp', toque: 'followup_t3', auto: true, acao: 'Toque 3 — urgência real + close presumptivo' },
  { dia: 10, canal: 'linkedin', toque: 3,          auto: false, acao: 'Mensagem 3 — breakup elegante (porta aberta)' },
  { dia: 14, canal: 'whatsapp', toque: 'followup_t4', auto: true, acao: 'Toque 4 — despedida → sem interesse + reengajar +4 meses' }
];

// Estágios em que a cadência de prospecção é encerrada (lead saiu do funil de topo).
const ESTAGIOS_ENCERRADOS = ['confirmado', 'reuniao', 'cessado', 'sem_interesse'];

function diasDesde(data) {
  if (!data) return 0;
  return Math.floor((Date.now() - new Date(data).getTime()) / 86400000);
}

function parseTags(tagsJson) {
  try { return JSON.parse(tagsJson || '[]'); } catch { return []; }
}

/**
 * Próxima ação MANUAL de cadência sugerida para o lead (LinkedIn/e-mail).
 * Os toques automáticos de WhatsApp são executados por followup.js — aqui
 * destacamos o que depende do operador (Hariton).
 *
 * @param {object} lead  precisa de { createdAt, estagio, tags }
 * @returns {null | { canal, toque, acao, dia, atrasada }}
 *   null quando o lead respondeu/avançou (sai da régua) ou não há ação pendente.
 */
function proximaAcaoCadencia(lead) {
  if (!lead) return null;
  if (ESTAGIOS_ENCERRADOS.includes(lead.estagio)) return null;

  const dias = diasDesde(lead.createdAt);
  const tags = parseTags(lead.tags);

  // Considera apenas passos manuais ainda não marcados como executados.
  // Convenção de tag para registrar execução manual: `cad_<canal>_<toque>`.
  const pendentes = REGUA
    .filter(p => !p.auto)
    .filter(p => !tags.includes(`cad_${p.canal}_${p.toque}`));

  // O passo "devido" é o de maior `dia` que já venceu (dias >= p.dia);
  // se nenhum venceu ainda, sugere o próximo passo futuro mais próximo.
  const vencidos = pendentes.filter(p => dias >= p.dia);
  const alvo = vencidos.length
    ? vencidos[vencidos.length - 1]
    : pendentes[0];

  if (!alvo) return null;

  return {
    canal: alvo.canal,
    toque: alvo.toque,
    acao: alvo.acao,
    dia: alvo.dia,
    atrasada: dias > alvo.dia + 1   // passou da janela ideal (+1 dia de tolerância)
  };
}

module.exports = { REGUA, ESTAGIOS_ENCERRADOS, proximaAcaoCadencia, diasDesde };
