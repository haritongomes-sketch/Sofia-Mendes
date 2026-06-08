/**
 * Templates de abertura — Humanizados, sem assumir nicho
 * Sofia se apresenta e gera curiosidade. O nicho é validado APÓS a resposta do cliente.
 * Teste A/B: após 20 envios por variante, usa a de maior taxa de resposta.
 */

const TEMPLATES = {
  // ── Templates universais — não assumem profissão ───────────────────────────
  universal: [
    {
      id: 'u_a',
      texto: (nome) => `Olá ${nome}! Tudo bem?

Sou a Sofia, parceira do Hariton Gomes aqui na Altum Wealth. Ele me pediu para entrar em contato com você — trabalha com advisory independente, sem os conflitos dos grandes bancos, e costuma abrir perspectivas que a maioria das pessoas nunca ouviu do gerente.

Como você está pensando o seu patrimônio hoje? Está satisfeito com o que tem ou sentindo que poderia estar funcionando melhor?`
    },
    {
      id: 'u_b',
      texto: (nome) => `Oi ${nome}! Como vai?

Sou Sofia, da Altum Wealth — trabalho com o Hariton Gomes, um advisor independente que atende quem construiu patrimônio relevante e quer que ele trabalhe de verdade, sem os conflitos de interesse dos bancos tradicionais.

O Hariton me pediu para falar com você especificamente. Você tem 15 minutinhos para uma conversa diagnóstica com ele esta semana?`
    },
    {
      id: 'u_c',
      texto: (nome) => `Oi ${nome}! Aqui é a Sofia, da Altum Wealth.

Trabalhamos com um modelo diferente dos bancos: advisory 100% fee-based, sem comissão de produto — o que significa que o Hariton só recomenda o que é bom para você, não o que dá mais margem para ele.

O Hariton quis especificamente entrar em contato. Você tem disponibilidade para uma conversa rápida de 15 minutos esta semana?`
    }
  ],

  // ── Templates específicos — usados SOMENTE se profissão já foi confirmada ──
  medico_cirurgiao: [
    {
      id: 'mc_a',
      texto: (nome, cidade) => `Olá Dr(a). ${nome}! Tudo bem?

Sou a Sofia, da Altum Wealth. Hariton pediu para entrar em contato — ele trabalha especificamente com médicos especialistas aqui em ${cidade || 'sua cidade'} que querem proteger o que construíram, longe dos conflitos dos grandes bancos.

Você tem 15 minutos esta semana para uma conversa diagnóstica com ele? Terça ou quinta ficaria melhor?`
    },
    {
      id: 'mc_b',
      texto: (nome) => `Boa tarde, Dr(a). ${nome}!

Sou Sofia, parceira do Hariton Gomes na Altum Wealth. Ele tem trabalhado com cirurgiões que acumularam patrimônio significativo e querem dar um próximo passo — proteção real, sem os conflitos de interesse do banco atual.

Faz sentido trocar uma ideia de 15 minutos? Sem compromisso.`
    }
  ],

  advogado_tributarista: [
    {
      id: 'at_a',
      texto: (nome) => `Olá Dr(a). ${nome}! Como vai?

Sou Sofia, da Altum Wealth. Como tributarista, você sabe como poucos o valor de uma estrutura bem montada — por isso o Hariton quis entrar em contato.

Teria 15 min esta semana para uma conversa sobre o seu cenário pessoal? Tenho certeza que vai ser útil.`
    }
  ],

  ceo_empresario: [
    {
      id: 'ce_a',
      texto: (nome) => `Olá ${nome}! Tudo bem?

Sou Sofia, da Altum Wealth — advisory independente, sem os conflitos dos bancos. O Hariton me pediu para falar com você sobre proteção e diversificação do seu patrimônio pessoal.

Uma pergunta direta: qual % do seu patrimônio está fora do Brasil hoje? Vale uma conversa de 15 min?`
    }
  ],

  dentista_especialista: [
    {
      id: 'de_a',
      texto: (nome, cidade) => `Olá Dr(a). ${nome}!

Sou Sofia, da Altum Wealth. O Hariton trabalha com especialistas da saúde aqui em ${cidade || 'sua cidade'} que construíram patrimônio relevante e querem fazê-lo trabalhar com mais eficiência.

Vale 15 minutinhos de conversa esta semana?`
    }
  ],

  engenheiro_executivo: [
    {
      id: 'ee_a',
      texto: (nome) => `Olá ${nome}! Como vai?

Sou Sofia, da Altum Wealth. O Hariton me pediu para entrar em contato — ele trabalha com executivos sênior que acumularam patrimônio expressivo, muitas vezes concentrado em uma única empresa ou em ativos nacionais.

Teria 15 minutos esta semana para uma conversa diagnóstica? Sem compromisso.`
    }
  ]
};

function selecionarTemplate(nicho, statsTemplates = {}, profissaoConfirmada = false) {
  // Se profissão ainda não confirmada, usa template universal
  const pool = (!profissaoConfirmada && TEMPLATES.universal) ? TEMPLATES.universal : (TEMPLATES[nicho] || TEMPLATES.universal);
  if (pool.length === 1) return pool[0];

  const stats = statsTemplates[nicho] || {};
  const temDados = pool.every(t => (stats[t.id]?.envios || 0) >= 20);

  if (temDados) {
    return pool.reduce((best, t) => {
      const tb = (stats[best.id]?.respostas || 0) / Math.max(stats[best.id]?.envios || 1, 1);
      const tt = (stats[t.id]?.respostas || 0) / Math.max(stats[t.id]?.envios || 1, 1);
      return tt > tb ? t : best;
    });
  }

  const total = pool.reduce((s, t) => s + (stats[t.id]?.envios || 0), 0);
  return pool[total % pool.length];
}

function gerarMensagemAbertura(lead, statsTemplates = {}) {
  // Abertura inicial: sempre usa template universal (sem assumir nicho)
  const template = selecionarTemplate(lead.nicho, statsTemplates, false);
  return {
    templateId: template.id,
    mensagem: template.texto(lead.nome.split(' ')[0], lead.cidade)
  };
}

module.exports = { TEMPLATES, selecionarTemplate, gerarMensagemAbertura };
