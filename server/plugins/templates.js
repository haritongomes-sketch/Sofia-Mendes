/**
 * Templates de abertura — Scripts Validados Private Banking
 *
 * Estrutura validada (4 elementos obrigatórios):
 *  1. "Olá, [nome]! Me chamo Sofia Mendes, sou do time de Private Banking..."
 *  2. Gancho de INDICAÇÃO — prova social imediata
 *  3. Espelhamento do perfil + ângulo de valor (mercado / proteção / oportunidade)
 *  4. CTA: "15 minutos" + "Sem compromisso" + emoji
 *
 * 4 variações universais (A/B/C/D) + variações por nicho quando profissão já confirmada.
 * Rotação automática → teste A/B após 20 envios por variante.
 */

const TEMPLATES = {

  // ── Templates universais ──────────────────────────────────────────────────────
  // Usados sempre na abertura (profissão não confirmada ainda)

  universal: [
    {
      // Variante A — Ângulo: movimentações de mercado (SCRIPT VALIDADO 1)
      id: 'u_a',
      texto: (nome, cidade) =>
        `Olá, ${nome}! Sou a Sofia Mendes, assistente do Hariton Andrade — planejador financeiro e advisor independente, modelo fee-based (ele não vende produto nem recebe comissão).

Chego até você por indicação. O Hariton trabalha com pessoas${cidade ? ` em ${cidade}` : ''} que construíram um patrimônio relevante e querem organizá-lo melhor: proteção, diversificação internacional e eficiência tributária — com uma visão independente, fora do conflito de interesse dos bancos.

A proposta é direta: 15 minutos por vídeo com ele, um diagnóstico do seu cenário, sem compromisso e sem pitch. Faz sentido conversar essa semana?`
    },
    {
      // Variante B — Ângulo: crescimento inteligente e proteção (SCRIPT VALIDADO 2)
      id: 'u_b',
      texto: (nome) =>
        `Olá, ${nome}! Sou a Sofia Mendes, assistente do Hariton Andrade, planejador financeiro independente (fee-based, sem venda de produto). Seu nome chegou por indicação.

O Hariton ajuda quem construiu um patrimônio relevante a planejá-lo melhor — proteger o que já tem, diversificar e pagar menos imposto de forma legal — sem os conflitos de interesse de banco ou corretora.

Queria te propor uma conversa de 15 minutos com ele, por vídeo: um diagnóstico do seu momento, sem compromisso. Você teria essa semana?`
    },
    {
      // Variante C — Ângulo: próximo passo (diversificação / segunda opinião)
      id: 'u_c',
      texto: (nome, cidade) =>
        `Olá, ${nome}! Aqui é a Sofia Mendes, assistente do Hariton Andrade — planejador financeiro e advisor independente.

Trabalhamos com pessoas${cidade ? ` em ${cidade}` : ''} que já têm um patrimônio relevante e querem um plano claro para ele: proteção, diversificação e sucessão. Como o Hariton é remunerado pelo cliente (fee-based), a orientação é isenta — sem produto sendo empurrado.

A ideia é objetiva: 15 minutos por vídeo com ele, um diagnóstico do seu cenário, sem compromisso. Funciona conversar essa semana?`
    },
    {
      // Variante D — Ângulo: perfil seletivo + advisory independente
      id: 'u_d',
      texto: (nome) =>
        `Olá, ${nome}! Sou a Sofia Mendes, assistente do Hariton Andrade. Vou ser direta: ele é planejador financeiro e advisor independente (fee-based, sem comissão) e atende poucos perfis por vez — o seu chegou por indicação e faz sentido para o trabalho dele.

O Hariton cuida do planejamento patrimonial completo: proteção, diversificação internacional, eficiência tributária e sucessão — com independência total dos bancos.

Proposta clara: 15 minutos por vídeo com ele, um diagnóstico do seu cenário, sem compromisso e sem pitch. Tem disponibilidade essa semana?`
    }
  ],

  // ── Templates por nicho ───────────────────────────────────────────────────────
  // Usados SOMENTE quando a profissão já foi confirmada na conversa
  // Seguem a mesma estrutura validada, com gancho específico do nicho

  medico_cirurgiao: [
    {
      id: 'mc_a',
      texto: (nome, cidade) =>
        `Olá, Dr(a). ${nome}! Me chamo Sofia Mendes, sou do time de Private Banking. Seu nome chegou até mim por indicação — e o Hariton Andrade pediu especificamente para que eu entrasse em contato.

Trabalhamos com médicos especialistas${cidade ? ` em ${cidade}` : ''} que construíram patrimônio expressivo e querem que ele esteja de fato protegido — com a separação jurídica correta entre a atividade profissional e o patrimônio pessoal. É algo que poucos bancos tradicionais sequer mencionam.

Teria 15 minutos essa semana para uma conversa rápida com o Hariton? Sem compromisso nenhum — só para entender o seu momento atual. 🙏`
    },
    {
      id: 'mc_b',
      texto: (nome) =>
        `Olá, Dr(a). ${nome}! Aqui é a Sofia Mendes, do Private Banking. Chego até você por indicação — e fiquei curiosa para entender melhor o seu cenário.

Trabalho com médicos especialistas que, como você, construíram patrimônio relevante ao longo da carreira — e que agora querem garantir que ele esteja protegido e trabalhando com eficiência, independentemente do que aconteça.

Teria 15 minutos esta semana para uma conversa rápida? Sem compromisso, só para eu entender o seu momento. 😊`
    }
  ],

  advogado_tributarista: [
    {
      id: 'at_a',
      texto: (nome) =>
        `Olá, Dr(a). ${nome}! Me chamo Sofia Mendes, sou do time de Private Banking. Seu nome chegou até mim por indicação — e, sendo direta, advogados tributaristas têm um perfil muito específico que o Hariton Andrade gosta de atender.

Você estrutura o patrimônio dos seus clientes com perfeição. A pergunta que o Hariton queria te fazer é: e o seu próprio? Com a Lei 14.754/2023, quem não revisou a estrutura pode estar pagando mais do que deveria.

Teria 15 minutos essa semana para uma conversa rápida? Sem compromisso nenhum. 🙏`
    }
  ],

  ceo_empresario: [
    {
      id: 'ce_a',
      texto: (nome, cidade) =>
        `Olá, ${nome}! Me chamo Sofia Mendes, sou do time de Private Banking, aqui de São Paulo. Chego até você por indicação de alguém que conhece bem o que você construiu.

Trabalhamos com empresários${cidade ? ` em ${cidade}` : ''} que chegaram a um patrimônio expressivo — e que agora querem garantir que ele esteja diversificado e protegido, separado dos riscos da empresa. Há movimentações no mercado cambial e fiscal que têm gerado janelas relevantes para esse perfil.

Teria 15 minutos essa semana para uma conversa rápida? Sem compromisso — só para eu entender o seu momento atual. 😊`
    }
  ],

  dentista_especialista: [
    {
      id: 'de_a',
      texto: (nome, cidade) =>
        `Olá, Dr(a). ${nome}! Me chamo Sofia Mendes, sou do time de Private Banking. Seu nome chegou até mim por indicação — e fiquei curiosa para entender mais sobre o seu momento.

Trabalhamos com especialistas da saúde${cidade ? ` em ${cidade}` : ''} que construíram patrimônio relevante e querem que ele esteja trabalhando com mais eficiência e proteção — muito além do que os bancos tradicionais costumam oferecer.

Teria 15 minutos essa semana para uma conversa rápida? Sem compromisso nenhum. 🙏`
    }
  ],

  engenheiro_executivo: [
    {
      id: 'ee_a',
      texto: (nome) =>
        `Olá, ${nome}! Me chamo Sofia Mendes, sou do time de Private Banking. Seu nome chegou até mim por indicação — e o perfil que o Hariton Andrade atende com frequência tem muito a ver com o seu.

Trabalho com executivos sênior que acumularam patrimônio expressivo — muitas vezes concentrado na empresa onde trabalham — e que precisam de uma estratégia real de diversificação antes que o momento certo passe.

Teria 15 minutos essa semana para uma conversa rápida? Sem compromisso — só para eu entender o seu cenário atual. 😊`
    }
  ]
};

// ─── Seleção de template com A/B ─────────────────────────────────────────────

function selecionarTemplate(nicho, statsTemplates = {}, profissaoConfirmada = false, seed = 0) {
  // Abertura: sempre usa universal (profissão ainda não confirmada)
  const pool = (!profissaoConfirmada || !TEMPLATES[nicho])
    ? TEMPLATES.universal
    : TEMPLATES[nicho];

  if (pool.length === 1) return pool[0];

  const stats    = statsTemplates[nicho] || {};
  const temDados = pool.every(t => (stats[t.id]?.envios || 0) >= 20);

  if (temDados) {
    // A/B winner: usa o template com maior taxa de resposta
    return pool.reduce((best, t) => {
      const tb = (stats[best.id]?.respostas || 0) / Math.max(stats[best.id]?.envios || 1, 1);
      const tt = (stats[t.id]?.respostas    || 0) / Math.max(stats[t.id]?.envios    || 1, 1);
      return tt > tb ? t : best;
    });
  }

  // Round-robin distribuído: usa seed baseado no lead para não travar no index 0
  // quando stats ainda estão vazios
  const total = pool.reduce((s, t) => s + (stats[t.id]?.envios || 0), 0);
  const idx = (total + seed) % pool.length;
  return pool[idx];
}

function gerarMensagemAbertura(lead, statsTemplates = {}) {
  // Seed: usa os últimos 3 chars do lead ID como número para distribuir variantes
  const seed = lead.id
    ? parseInt(lead.id.replace(/\D/g, '').slice(-4) || '0', 10)
    : 0;
  const template = selecionarTemplate(lead.nicho, statsTemplates, false, seed);
  return {
    templateId: template.id,
    mensagem:   template.texto(lead.nome.split(' ')[0], lead.cidade)
  };
}

module.exports = { TEMPLATES, selecionarTemplate, gerarMensagemAbertura };
