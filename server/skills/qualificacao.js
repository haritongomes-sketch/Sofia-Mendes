/**
 * Skill: Qualificação Inteligente
 * Sofia faz perguntas de qualificação progressivas e estruturadas,
 * adaptadas ao nicho. Identifica automaticamente o perfil do lead
 * pelas respostas e passa contexto enriquecido para as próximas mensagens.
 */

const PERGUNTAS_POR_NICHO = {
  medico_cirurgiao: [
    'Qual é o seu cenário de investimentos hoje? Você concentra tudo no Brasil ou já tem algo internacional?',
    'Além da sua renda da medicina, você tem outros ativos relevantes — imóveis, participação em clínica, previdência?',
    'Você já pensou em como proteger o seu patrimônio em caso de processo trabalhista ou cível?'
  ],
  advogado_tributarista: [
    'Como você estrutura hoje o seu patrimônio pessoal — PF ou via holding?',
    'Você já explorou alguma estrutura offshore para eficiência fiscal ou sucessão?',
    'Qual é a sua principal preocupação hoje: tributação, proteção ou crescimento do patrimônio?'
  ],
  ceo_empresario: [
    'Qual percentual do seu patrimônio pessoal está fora do Brasil hoje?',
    'Você tem uma estrutura de holding familiar ou planeja montar uma?',
    'Como você pensa a sucessão da empresa e do patrimônio pessoal?'
  ],
  dentista_especialista: [
    'Hoje você investe principalmente onde — banco, corretora ou deixa parado?',
    'Você tem previdência privada ou PGBL estruturado?',
    'Já pensou em diversificar parte do que você construiu fora do Brasil?'
  ],
  engenheiro_executivo: [
    'Além do seu salário e bônus, você tem stock options ou participações acumuladas?',
    'Você já pensou nos riscos de ter grande parte do patrimônio atrelado à empresa onde trabalha?',
    'Como você está pensando a aposentadoria e a independência financeira?'
  ]
};

function obterPerguntaQualificacao(nicho, indiceConversa) {
  const perguntas = PERGUNTAS_POR_NICHO[nicho] || PERGUNTAS_POR_NICHO.medico_cirurgiao;
  return perguntas[indiceConversa % perguntas.length];
}

function extrairInsightsRespostas(mensagens) {
  const insights = [];
  const textos = mensagens.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');

  if (textos.includes('holding') || textos.includes('pj')) insights.push('Tem estrutura PJ/holding');
  if (textos.includes('offshore') || textos.includes('exterior') || textos.includes('internacional')) insights.push('Já conhece/tem offshore');
  if (textos.includes('xp') || textos.includes('btg') || textos.includes('itaú')) insights.push('Já tem corretora/banco mencionado');
  if (textos.includes('previdência') || textos.includes('pgbl') || textos.includes('vgbl')) insights.push('Tem previdência privada');
  if (textos.includes('imóvel') || textos.includes('apartamento') || textos.includes('casa')) insights.push('Patrimônio imobiliário relevante');
  if (textos.includes('processo') || textos.includes('ação judicial')) insights.push('Preocupado com proteção patrimonial');
  if (textos.includes('aposentadoria') || textos.includes('independência')) insights.push('Foco em longo prazo/independência');

  return insights;
}

module.exports = { obterPerguntaQualificacao, extrairInsightsRespostas };
