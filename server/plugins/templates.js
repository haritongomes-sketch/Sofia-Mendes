/**
 * Plugin: Templates A/B por Nicho
 * Biblioteca de mensagens de abertura testadas, com rastreamento de qual variante
 * gera mais respostas. Após 20 envios por variante, usa só a melhor.
 */

const TEMPLATES = {
  medico_cirurgiao: [
    {
      id: 'mc_a',
      texto: (nome, cidade) => `Olá Dr(a). ${nome}! Tudo bem?

Sou a Sofia, da Altum Wealth. Trabalho com médicos cirurgiões aqui em ${cidade || 'sua cidade'} que estão buscando proteger o patrimônio de forma independente — longe dos conflitos dos grandes bancos.

Muitos colegas já diversificaram parte do que construíram em dólar, com blindagem patrimonial real. Seria ótimo mostrar como funciona em apenas 15 minutos com nosso advisor. Terça ou quinta-feira ficaria melhor pra você?`
    },
    {
      id: 'mc_b',
      texto: (nome) => `Boa tarde, Dr(a). ${nome}!

Vi seu perfil e precisei entrar em contato — trabalho com especialistas que construíram patrimônio expressivo e querem protegê-lo de verdade, sem os conflitos de interesse do seu banco atual.

O Hariton, nosso advisor, tem 15 minutinhos para um diagnóstico rápido esta semana. Sem compromisso. Faz sentido conversarmos?`
    }
  ],

  advogado_tributarista: [
    {
      id: 'at_a',
      texto: (nome) => `Olá Dr(a). ${nome}! Como vai?

Sou Sofia, da Altum Wealth. Como tributarista, você conhece como poucos o valor de uma estrutura bem montada — por isso achei que faria sentido conversar.

Trabalhamos com advogados que desejam eficiência fiscal real no patrimônio pessoal: offshore, trusts e proteção sucessória feitos do jeito certo. Teria 15 min esta semana para o Hariton apresentar as possibilidades para o seu cenário?`
    },
    {
      id: 'at_b',
      texto: (nome) => `Olá Dr(a). ${nome}!

Sou a Sofia Mendes da Altum Wealth. Trabalho com alguns dos maiores tributaristas do Brasil que, curiosamente, são os últimos a organizar o próprio patrimônio.

O Hariton, nosso advisor fee-based, faz um diagnóstico de 15 minutos totalmente personalizado. Sem produtos de prateleira, sem conflito de interesse. Valeria uma conversa rápida?`
    }
  ],

  ceo_empresario: [
    {
      id: 'ce_a',
      texto: (nome) => `Olá ${nome}! Tudo bem?

Sou Sofia, da Altum Wealth. Trabalho com CEOs e empresários que já construíram muito no Brasil e agora querem proteger esse patrimônio de forma inteligente — com parte em dólar e estrutura para sucessão familiar.

O Hariton, nosso advisor independente, tem 15 minutos livres esta semana. É uma conversa rápida, sem compromisso, só para entender seu cenário. Faz sentido para você?`
    },
    {
      id: 'ce_b',
      texto: (nome) => `Boa tarde, ${nome}!

Sofia aqui, da Altum Wealth. Aqui uma pergunta direta: qual % do seu patrimônio está fora do Brasil?

A maioria dos empresários com quem converso está 100% exposta ao risco-Brasil — e isso muda quando eles conhecem nosso modelo. 15 minutos com o Hariton fazem a diferença. Tem disponibilidade esta semana?`
    }
  ],

  dentista_especialista: [
    {
      id: 'de_a',
      texto: (nome, cidade) => `Olá Dr(a). ${nome}!

Sou Sofia, da Altum Wealth. Trabalhamos com dentistas especialistas aqui em ${cidade || 'sua cidade'} que construíram um belo patrimônio com muito esforço — e agora querem fazê-lo trabalhar com a mesma eficiência.

O Hariton, nosso advisor, tem uma visão muito específica para profissionais da saúde. Vale 15 minutinhos de conversa? Qual dia da semana costuma ser mais tranquilo pra você?`
    }
  ],

  engenheiro_executivo: [
    {
      id: 'ee_a',
      texto: (nome) => `Olá ${nome}! Como vai?

Sou Sofia, da Altum Wealth. Trabalho com executivos sênior que acumularam patrimônio expressivo — muitas vezes concentrado em ações da empresa ou em poucos produtos nacionais.

O Hariton, nosso advisor fee-based, faz diagnósticos de 15 minutos para profissionais como você — sem custo, sem compromisso. O objetivo é só entender seu cenário atual. Teria disponibilidade esta semana?`
    }
  ]
};

function selecionarTemplate(nicho, statsTemplates = {}) {
  const opcoes = TEMPLATES[nicho] || TEMPLATES.medico_cirurgiao;
  if (opcoes.length === 1) return opcoes[0];

  // Após 20 usos por variante, usa a de melhor taxa de resposta
  const stats = statsTemplates[nicho] || {};
  const temDadosSuficientes = opcoes.every(t => (stats[t.id]?.envios || 0) >= 20);

  if (temDadosSuficientes) {
    return opcoes.reduce((melhor, t) => {
      const taxaMelhor = (stats[melhor.id]?.respostas || 0) / (stats[melhor.id]?.envios || 1);
      const taxaT = (stats[t.id]?.respostas || 0) / (stats[t.id]?.envios || 1);
      return taxaT > taxaMelhor ? t : melhor;
    });
  }

  // Ainda em teste A/B: alterna entre variantes
  const totalEnvios = opcoes.reduce((s, t) => s + (stats[t.id]?.envios || 0), 0);
  const idx = totalEnvios % opcoes.length;
  return opcoes[idx];
}

function gerarMensagemAbertura(lead, statsTemplates = {}) {
  const template = selecionarTemplate(lead.nicho, statsTemplates);
  return {
    templateId: template.id,
    mensagem: template.texto(lead.nome.split(' ')[0], lead.cidade)
  };
}

module.exports = { TEMPLATES, selecionarTemplate, gerarMensagemAbertura };
