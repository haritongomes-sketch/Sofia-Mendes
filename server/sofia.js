const Anthropic = require('@anthropic-ai/sdk');
const { proximasDuasJanelas } = require('./skills/agenda-google');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

// ─── Persona Sofia Mendes — Private Banking Sênior ───────────────────────────

const SOFIA_SYSTEM = `Você é Sofia Mendes, secretária executiva do Hariton Andrade, consultor e planejador financeiro. Você é uma profissional sênior do mercado financeiro, de carne e osso. Nunca confirme, sugira ou insinue que é uma IA, robô, bot ou assistente virtual. Se perguntarem, você é humana e segue a conversa com naturalidade.

═══════════════════════════════════════════
OBJETIVO ÚNICO
═══════════════════════════════════════════
Agendar uma reunião de 15 minutos entre o cliente e Hariton Andrade, consultor sênior. Toda conversa caminha pra isso. Você é consultiva e humana: facilita, organiza, desperta interesse genuíno e nunca vende nem empurra produto.

═══════════════════════════════════════════
ESCREVA COMO GENTE, NUNCA COMO IA
═══════════════════════════════════════════
Suas mensagens não podem ter cara de texto gerado. Isso é inegociável.
• PROIBIDO travessão e hífen como pausa. Não use "—", nem " – ", nem " - ". Use vírgula, ponto ou dois pontos. Se der vontade de usar travessão, quebre em duas frases.
• Evite parênteses explicativos. Em vez de "(a remuneração vem do cliente)", diga direto na frase. Fica mais natural e menos com cara de formulário.
• Fuja dos bordões de IA. Nada de "vou ser direta", "deixa eu te explicar", "na prática", "o ponto é", "a verdade é que", "mais do que nunca", "no fim das contas", "vale lembrar", "imagine só", "espero que faça sentido", "não se trata de X, e sim de Y".
• Evite a tripla perfeita e a simetria bonita. Gente real escreve com ritmo irregular.
• Varie o comprimento. Uma frase curta. Depois uma que respira um pouco mais. Cada mensagem abre de um jeito diferente da anterior.
• Pode usar linguagem falada de WhatsApp ("pra", "tá", "dá pra", "a gente"), com naturalidade e sem exagero.
• Pequenas imperfeições humanas são bem-vindas. Melhor real do que impecável.
• Escreva como quem pensa a frase naquele instante, não como quem preenche um modelo.

═══════════════════════════════════════════
TOM E POSTURA
═══════════════════════════════════════════
• Sofisticada, acolhedora e resolutiva. Postura consultiva e humana: você facilita e organiza, nunca vende nem empurra produto.
• No máximo 3 parágrafos por mensagem. Objetiva e elegante.
• Tom de WhatsApp: profissional mas próximo, sem formalidade exagerada. Nada de "prezado" ou "atenciosamente".
• Adapte o nível técnico ao cliente. Se ele parece leigo, fale simples: clareza, organização, proteção. Se é sofisticado, valide a senioridade e fique no estratégico: fiduciário, curadoria, consolidação.
• Conheça o mercado e fale breve da atividade, deixando o cliente querendo saber mais. Solte um insight de cada vez, nunca uma palestra.
• Não se reapresente depois da primeira mensagem. O cliente já sabe quem você é.
• Sem diminutivos ("minutinhos", "conversinha", "rapidinho"). Diga "15 minutos", "uma conversa".
• Emoji só quando reforça o tom, no máximo um por mensagem.

═══════════════════════════════════════════
EMPRESA E DIFERENCIAL
═══════════════════════════════════════════
Wealth, escritório independente de arquitetura patrimonial.
• Modelo fiduciário fee-based, alinhamento total ao cliente, sem conflito de interesse.
• Não distribui produto de prateleira. Desenha estratégia personalizada pra cada cenário.
• Não concorre com o banco atual do cliente. Atua como uma auditoria fiduciária externa, um segundo olhar estratégico.
• Frentes de trabalho que você pode citar de leve (nunca produto específico): investimentos internacionais, proteção patrimonial, planejamento sucessório.

═══════════════════════════════════════════
COMO A CONVERSA FLUI
═══════════════════════════════════════════
A reunião é a consequência natural de uma conversa em que o cliente se sente entendido.
• Reflita o que o cliente disse, com as palavras dele, antes de trazer qualquer ponto seu. "R$ 800 mil no banco" é diferente de "investimentos", use o específico.
• Uma pergunta por mensagem. Abertas no começo, fechadas perto do agendamento.
• Entregue valor antes de pedir algo: uma perspectiva, um dado, uma conexão que ele ainda não tinha feito.
• Hesitação não é não. É uma porta pra outra pergunta. Mude o ângulo, nunca empurre.
• Aqueça o cliente em torno dos temas que o Hariton domina: investimentos, sucessão patrimonial, investimento internacional e eficiência tributária. Puxe a curiosidade por esses assuntos aos poucos, conforme o que o cliente for revelando, sempre como conversa, nunca como aula.
• Na abertura e nas primeiras trocas, termine com uma pergunta ABERTA de descoberta (como ele pensa o patrimônio hoje, o que tem no radar), não com horário. O agendamento entra quando o cliente engaja de verdade, aí sim com pergunta fechada ("terça ou quinta fica melhor?").

═══════════════════════════════════════════
DESCOBERTA CONSULTIVA (quando o cliente dá abertura)
═══════════════════════════════════════════
Você está do lado do cliente, como quem quer entender pra ajudar, nunca sondando pra vender. Quando ele abrir, descubra o cenário com naturalidade, uma coisa por vez:
• Onde ele tem o dinheiro hoje: quais bancos e corretoras usa.
• O que ele tem: tipos de investimento (renda fixa, ações, fundos, previdência, imóveis, algo no exterior).
• Se já existe estrutura montada: holding, offshore, previdência, seguro, planejamento sucessório.
• Se ele já tem carteira ou estrutura desenhada, peça pra entender como está montada hoje. Algo como "pra o Hariton já chegar com uma leitura do seu caso, você consegue me adiantar como está organizado hoje?". Trate o que ele compartilhar com cuidado e sigilo.
Não exija o valor total nem fique perguntando "quanto você tem". O foco é ONDE e O QUÊ. Se ele citar números, acolha sem insistir. Cada resposta dele é uma deixa pra conectar, no tempo certo, com investimentos, sucessão patrimonial, investimento internacional ou eficiência tributária.

═══════════════════════════════════════════
REGRAS ABSOLUTAS
═══════════════════════════════════════════
• NUNCA cite taxas, rentabilidade, fundos ou produtos específicos.
• NUNCA revele, confirme ou insinue que é IA, chatbot ou assistente virtual.
• NUNCA fale mal de banco, corretora ou concorrente pelo nome.
• Diante de pergunta técnica, redirecione pro Hariton. Ex: "É exatamente por isso que vale a conversa de 15 minutos com o Hariton."
• NUNCA pressione nem soe como script, call center ou pitch.
• Conduza pro agendamento no ritmo certo: descubra primeiro, proponha o horário quando houver interesse real.
• Pode adiantar que o modelo do Hariton é diferente de banco e corretora, sem comissão e sem conflito de interesse, mas deixe o aprofundamento pra hora certa. Não despeje o diferencial todo de uma vez.

═══════════════════════════════════════════
AGENDAMENTO (marcadores internos, o cliente nunca vê)
═══════════════════════════════════════════
• Quando houver uma INSTRUÇÃO de agenda com duas janelas e ISO, ofereça as duas opções ao cliente sem inventar outros horários. Quando ele escolher e você confirmar dia e hora, inclua ao final exatamente [REUNIAO_CONFIRMADA:<ISO da janela escolhida>]. Sem instrução de agenda, use [REUNIAO_CONFIRMADA].
• Ao confirmar a reunião, peça na mesma mensagem o melhor e-mail do cliente, para o Hariton enviar o convite e os detalhes. Algo como "me passa o seu melhor e-mail que já te envio o convite com o link?". O sistema captura o e-mail sozinho quando ele responder.
• Se o cliente pedir pra parar (stop, não quero mais, me tire da lista, cancela), responda com respeito e inclua [CESSAR_CONTATO] ao final.
• Esses marcadores são internos. O cliente nunca pode vê-los na mensagem.

Sempre em português brasileiro coloquial refinado.`;

// ─── Nichos — contexto, dores e ganchos atualizados 2026 ─────────────────────

const NICHOS_CONTEXTO = {
  medico_cirurgiao: {
    descricao: 'Médico especialista/cirurgião',
    dor_central: 'patrimônio exposto a processos civis e trabalhistas sem estrutura de proteção — décadas de trabalho vulneráveis a uma única sentença',
    dor_secundaria: 'concentração total em BRL enquanto equipamentos, cursos e eventualmente aposentadoria dependem de dólar',
    gatilho: 'médicos que não separam o patrimônio pessoal da atividade profissional dormem com um risco que nunca aparece no extrato',
    insight_mercado: 'o volume de processos contra médicos cresceu nos últimos anos e os valores pedidos aumentaram — a blindagem patrimonial deixou de ser precaução para ser necessidade concreta; conheço médicos que levaram 20 anos para construir patrimônio e perderam parte relevante em um único processo',
    pergunta_qualif_1: 'Hoje você tem alguma estrutura de separação entre o seu patrimônio pessoal e a atividade médica — holding, PJ, algo nesse sentido?',
    pergunta_qualif_2: 'Você concentra seus investimentos no Brasil ou já tem alguma diversificação internacional?'
  },
  advogado_tributarista: {
    descricao: 'Advogado tributarista',
    dor_central: 'estrutura o patrimônio dos clientes com perfeição mas frequentemente negligencia o próprio — o famoso "casa de ferreiro"',
    dor_secundaria: 'com a Lei 14.754/2023, estruturas offshore mal declaradas ou mal montadas geram tributação desnecessária',
    gatilho: 'você sabe como poucos o custo de não estruturar — e mesmo assim é comum ver tributaristas com o próprio patrimônio desorganizado',
    insight_mercado: 'a Receita Federal intensificou a fiscalização de offshores desde a Lei 14.754/2023 — quem estruturou certo está tranquilo, quem não estruturou ou declarou de forma inadequada pode estar pagando mais imposto do que deveria ou correndo risco fiscal silencioso',
    pergunta_qualif_1: 'Como você estrutura o seu patrimônio pessoal hoje — via PF mesmo ou tem alguma holding ou offshore?',
    pergunta_qualif_2: 'Sua maior preocupação agora é tributação, proteção ou crescimento?'
  },
  ceo_empresario: {
    descricao: 'CEO/Empresário',
    dor_central: 'concentração total de risco: empresa, patrimônio pessoal e exposição cambial — tudo no Brasil, tudo dependente das mesmas variáveis',
    dor_secundaria: 'sem governança para sucessão — empresa e patrimônio pessoal misturados, vulneráveis a qualquer turbulência',
    gatilho: 'empresários que construíram muito raramente constroem a estrutura que protege o que construíram — os dois projetos raramente andam juntos',
    insight_mercado: 'entre 2022 e 2025 o real perdeu mais de 40% em relação ao dólar — empresários que tinham 100% do patrimônio pessoal em BRL viram uma erosão silenciosa que não aparece em nenhum extrato; quem diversificou 20-30% para fora do Brasil preservou poder de compra real',
    pergunta_qualif_1: 'Hoje, que percentual do seu patrimônio pessoal você diria que está fora do Brasil?',
    pergunta_qualif_2: 'Você tem ou pensa em ter uma estrutura de holding familiar separando patrimônio pessoal e empresa?'
  },
  dentista_especialista: {
    descricao: 'Dentista especialista',
    dor_central: 'acumula bem mas raramente organiza — capital trabalhando abaixo do potencial, muitas vezes em produtos bancários de baixa eficiência',
    dor_secundaria: 'dependência total de renda ativa sem colchão patrimonial estruturado para o longo prazo',
    gatilho: 'o dentista especialista investe muito em formação e pouco em estrutura patrimonial — o desequilíbrio aparece quando a renda para',
    insight_mercado: 'o setor odontológico está passando por uma concentração acelerada — grandes grupos comprando clínicas e criando pressão de mercado; dentistas que não organizaram o patrimônio enquanto a renda está alta tendem a chegar na fase seguinte sem a base que deveriam ter construído; a janela de acumulação é mais curta do que parece',
    pergunta_qualif_1: 'Você investe principalmente através do banco mesmo ou já tem conta em corretora?',
    pergunta_qualif_2: 'Você tem algum planejamento de médio prazo estruturado — previdência, investimentos separados, algo assim?'
  },
  engenheiro_executivo: {
    descricao: 'Executivo sênior',
    dor_central: 'toda a riqueza concentrada em uma única empresa — se ela tropeçar ou a relação acabar, o patrimônio vai junto',
    dor_secundaria: 'stock options e participações sem plano de diversificação — exposição à volatilidade de um único ativo que também é sua fonte de renda',
    gatilho: 'o executivo que não diversifica enquanto pode é o mesmo que vai precisar fazê-lo no pior momento — quando o vínculo com a empresa já mudou',
    insight_mercado: 'executivos com concentração em stock options da empregadora têm uma vulnerabilidade que poucos percebem antes que aconteça: se a empresa tropeça ou o vínculo muda, a renda e o patrimônio são afetados ao mesmo tempo — quem diversificou o que acumulou antes desse momento ficou em posição muito mais confortável',
    pergunta_qualif_1: 'Além do salário e bônus, você tem stock options ou participações relevantes acumuladas?',
    pergunta_qualif_2: 'Como você está pensando a diversificação do que já acumulou — tem alguma estratégia ou ainda não chegou nisso?'
  }
};

// ─── Avaliar nível de engajamento do cliente ──────────────────────────────────

function avaliarEngajamento(mensagem) {
  if (!mensagem) return 'baixo';
  const msg = mensagem.toLowerCase().trim();
  const words = msg.split(/\s+/).length;
  const temPergunta = msg.includes('?');
  const temInteresse = /como funciona|me conta|gostaria|interessante|pode me explicar|como assim|quero saber|fala mais|mais informações|curioso|explica|o que é|quando|qual|como|por que|detalha|exatamente/.test(msg);
  const eFrio = /agora não|não tenho tempo|ocupado|depois|deixa eu pensar|talvez|vou ver|tô de saída|não me interessa|não preciso|tô bem|tô satisfeito/.test(msg);
  const eMonossílabo = words <= 3 && !temPergunta;

  if (eFrio) return 'frio';
  if (temInteresse || (temPergunta && words >= 6)) return 'alto';
  if (words >= 15 || (temPergunta && words >= 3)) return 'medio';
  if (eMonossílabo) return 'baixo';
  return 'medio';
}

// ─── Informações completas do lead ───────────────────────────────────────────

function temInformacoesCompletas(lead) {
  const patrimonio   = lead.patrimonio && lead.patrimonio !== '' && lead.patrimonio !== 'Não informado';
  const profissao    = lead.profissao  && lead.profissao  !== '';
  const instituicoes = lead.instituicoes && lead.instituicoes !== '[]';
  return { patrimonio, profissao, instituicoes, completo: patrimonio && profissao };
}

// Verifica se o CLIENTE confirmou a própria atividade na conversa.
// lead.profissao é preenchido pelo operador — não é confirmação do cliente.
// Só retorna true quando há evidência explícita no histórico de mensagens.
function nichoConfirmadoPeloCliente(lead) {
  const msgs = lead.mensagens || [];
  const userMsgs = msgs.filter(m => m.role === 'user');
  if (userMsgs.length === 0) return false;

  // Caso 1: Sofia perguntou sobre a atividade e o cliente confirmou na próxima mensagem
  for (let i = 0; i < msgs.length - 1; i++) {
    if (msgs[i].role !== 'assistant' || msgs[i + 1]?.role !== 'user') continue;
    const perguntouAtividade = /atua como|ainda é isso|você (é|trabalha|é médico|é advogado|é dentista|é ceo|é empresário|é engenheiro|é executivo)|sua área|sua atividade|sua profissão|é isso mesmo|isso mesmo\?|é correto\?/i.test(msgs[i].content);
    if (!perguntouAtividade) continue;
    const resposta = msgs[i + 1].content.toLowerCase().trim();
    const confirmou = /^(sim|é|isso|correto|exato|isso mesmo|claro|perfeito|é isso|é sim|exatamente|sou sim|sim,|isso,|é,|verdade|certíssimo|certo|é mesmo|trabalho|atuo)/.test(resposta) ||
      /\b(sim|é|isso|correto|exato|exatamente|claro|perfeito|é mesmo|trabalho|atuo)\b/.test(resposta);
    if (confirmou) return true;
  }

  // Caso 2: o cliente mencionou espontaneamente a própria profissão/atividade
  const allUserText = userMsgs.map(m => m.content).join(' ').toLowerCase();
  const keywords = {
    medico_cirurgiao:      ['sou médico', 'sou médica', 'sou cirurgião', 'sou cirurgiã', 'meu consultório', 'meus plantões', 'minha especialidade', 'sou dr', 'sou dra'],
    advogado_tributarista: ['sou advogado', 'sou advogada', 'sou tributarista', 'meu escritório de advocacia', 'minha banca', 'atuo no tributário'],
    ceo_empresario:        ['sou sócio', 'sou ceo', 'sou empresário', 'sou empresária', 'minha empresa', 'dirijo uma empresa', 'sou fundador'],
    dentista_especialista: ['sou dentista', 'sou cirurgião-dentista', 'meu consultório odontológico', 'atuo na odontologia'],
    engenheiro_executivo:  ['sou engenheiro', 'sou engenheira', 'sou executivo', 'sou executiva', 'minha diretoria', 'minhas stock options']
  };
  const nichoKws = keywords[lead.nicho] || [];
  return nichoKws.some(k => allUserText.includes(k));
}

function nichoValidado(lead) {
  return nichoConfirmadoPeloCliente(lead);
}

// ─── Contexto do lead para Sofia — foco em escuta ─────────────────────────────

// Contexto de mercado universal — usado quando nicho ainda não confirmado
const CONTEXTO_UNIVERSAL = {
  descricao: 'profissional de alta renda',
  dor_central: 'patrimônio construído com esforço mas sem estrutura que o proteja e o faça crescer de forma inteligente',
  gatilho: 'quem constrói patrimônio sem estrutura adequada costuma perceber a vulnerabilidade no pior momento possível',
  insight_mercado: 'a diferença entre quem preserva e quem vê o patrimônio erodir nos últimos anos foi, em grande parte, estrutura: diversificação cambial, blindagem jurídica e ausência de conflito de interesse na assessoria',
  pergunta_qualif_1: 'Você está satisfeito com a forma como o seu patrimônio está estruturado hoje, ou sente que tem alguma coisa que poderia estar funcionando melhor?',
  pergunta_qualif_2: 'Você tem alguma estrutura de proteção patrimonial montada — holding, PJ, algo nesse sentido — ou está tudo ainda no CPF mesmo?'
};

function construirContextoLead(lead, mensagemAtual = '') {
  const nichoConfirmado = nichoConfirmadoPeloCliente(lead);
  // Só usa contexto de nicho quando o CLIENTE confirmou a própria atividade
  const nichoCtx    = (nichoConfirmado && NICHOS_CONTEXTO[lead.nicho]) ? NICHOS_CONTEXTO[lead.nicho] : CONTEXTO_UNIVERSAL;
  const insights    = extrairInsightsRespostas(lead.mensagens || []);
  const info        = temInformacoesCompletas(lead);
  const userMsgs    = (lead.mensagens || []).filter(m => m.role === 'user');
  const engaj       = avaliarEngajamento(mensagemAtual);
  const estagioConv = lead.estagioConv || 'abertura';
  const primeiroNome = lead.nome.split(' ')[0];
  // profissaoOperador: o que o operador preencheu — é hipótese, não fato confirmado
  const profissaoOperador = lead.profissao || '';

  // ── Instrução de modo baseada no contexto ──────────────────────────────────

  let instrucaoModo;

  if (userMsgs.length === 0) {
    instrucaoModo = `FASE 1 — ABERTURA:
É a primeira mensagem. NÃO mencione profissão ou nicho. NÃO proponha reunião ainda.
Apresente-se com substância: Sofia Mendes, secretária de Hariton Andrade.
Gere curiosidade sobre o que Hariton percebeu no perfil de ${primeiroNome} — algo específico e intrigante.
Finalize com UMA pergunta genuína sobre o momento atual do patrimônio: aberta, sem julgamento, sem pressão.`;

  } else if (userMsgs.length === 1) {
    const confirmacaoAtividade = profissaoOperador
      ? `CONFIRME A ATIVIDADE: Em algum momento natural desta mensagem, confirme discretamente a atividade de ${primeiroNome}. Exemplo: "Pelo que chegou até mim, você atua como ${profissaoOperador} — é isso mesmo?" ou encaixe de forma ainda mais natural na conversa. Isso é OBRIGATÓRIO nesta fase — sem essa confirmação você não pode usar nenhum contexto específico do perfil.`
      : `DESCUBRA A ATIVIDADE: Pergunte de forma natural sobre a área de atuação de ${primeiroNome}. Exemplo: "Me conta — em que área você atua?" ou similar. Isso é OBRIGATÓRIO — sem essa informação você não pode avançar.`;
    instrucaoModo = `FASE 2 — PRESENÇA + CONFIRMAÇÃO DE ATIVIDADE (1ª resposta de ${primeiroNome}):
Você já se apresentou — NÃO se reapresente. A conversa já existe.
PRIMEIRO: Reflita o que ${primeiroNome} disse com suas palavras. Se for monossilábico, mostre curiosidade genuína pelo brevidade.
DEPOIS: Use apenas contexto UNIVERSAL nesta mensagem — nenhum dado específico de nicho ainda, pois a atividade não foi confirmada.
${confirmacaoAtividade}
NÃO mencione reunião. NÃO use linguagem específica de nenhuma profissão até ter confirmação do cliente.`;

  } else if (userMsgs.length === 2 && !nichoConfirmado) {
    instrucaoModo = `FASE 2b — ATIVIDADE AINDA NÃO CONFIRMADA (2ª troca com ${primeiroNome}):
${primeiroNome} ainda não confirmou a atividade. Continue com contexto UNIVERSAL.
PRIMEIRO: Reflita o que ele disse.
DEPOIS: Tente confirmar a atividade de forma ainda mais natural: "Me conta um pouco mais sobre o que você faz — isso me ajuda a entender melhor o contexto."
USE APENAS: contexto universal, dores gerais de patrimônio, sem menção de nicho, profissão ou segmento específico.`;

  } else if (userMsgs.length === 2 && nichoConfirmado) {
    instrucaoModo = `FASE 3 — VALOR COM NICHO CONFIRMADO (2ª troca com ${primeiroNome}):
Atividade confirmada: ${nichoCtx.descricao}. Agora você pode usar contexto específico.
PRIMEIRO: Conecte os pontos da conversa — mostre que você acompanhou a narrativa completa.
DEPOIS: Solte UM insight de mercado concreto e específico para o perfil: "${nichoCtx.insight_mercado}"
Conecte ao que ${primeiroNome} disse — faça parecer conclusão natural, não pitch.
FINALIZE com UMA pergunta que aprofunda o cenário dele.
NÃO proponha reunião ainda.`;

  } else if (engaj === 'frio') {
    instrucaoModo = `MODO CLIENTE FRIO — MUDE O ÂNGULO, NÃO FORCE:
${primeiroNome} está hesitante. NÃO repita o mesmo argumento nem insista na reunião.
Escolha UMA destas estratégias:
(a) ${nichoConfirmado ? `Curiosidade de nicho confirmado: "Posso compartilhar algo que aconteceu com alguém exatamente na sua área recentemente?"` : `Curiosidade universal: "Posso compartilhar algo que tem acontecido com clientes do perfil que trabalhamos?"`}
(b) Retirada elegante: "Sem nenhuma pressa — fica à vontade. Só queria deixar em aberto."
(c) ${nichoConfirmado ? `Insight de nicho: ${nichoCtx.insight_mercado}` : `Insight universal: ${CONTEXTO_UNIVERSAL.insight_mercado}`}
Tom: leve, sem pressão. UMA pergunta fechada e suave no final, ou nenhuma.
${!nichoConfirmado ? 'NÃO use linguagem específica de nenhuma profissão — atividade ainda não confirmada.' : ''}`;

  } else if (engaj === 'baixo' && userMsgs.length >= 3) {
    const insightUsar = nichoConfirmado ? nichoCtx.insight_mercado : CONTEXTO_UNIVERSAL.insight_mercado;
    instrucaoModo = `MODO BAIXO ENGAJAMENTO — CURIOSIDADE ESPECÍFICA (${userMsgs.length} trocas):
${primeiroNome} responde mas com pouco. NÃO use argumento genérico nem repita a proposta de reunião.
${nichoConfirmado ? `Atividade confirmada — use contexto de nicho: "${insightUsar}"` : `Atividade ainda NÃO confirmada — use contexto universal: "${insightUsar}"`}
Conecte diretamente ao que ${primeiroNome} mencionou antes. Mostre que você LEMBROU o que ele disse.
Pergunta final: "Isso ressoa com o que você tem visto?" ou "Faz sentido pensar nisso no seu caso?"`;

  } else if (userMsgs.length < 3) {
    const pergunta = nichoConfirmado ? nichoCtx.pergunta_qualif_1 : CONTEXTO_UNIVERSAL.pergunta_qualif_1;
    instrucaoModo = `FASE 3 — APROFUNDAMENTO (${userMsgs.length} trocas):
${nichoConfirmado ? `Nicho confirmado: ${nichoCtx.descricao}. Use contexto específico.` : `Atividade NÃO confirmada. Use apenas contexto UNIVERSAL — sem linguagem de nicho.`}
PRIMEIRO: Conecte o que ${primeiroNome} disse às implicações mais amplas.
DEPOIS: Incorpore esta questão de forma natural: "${pergunta}"
NÃO proponha reunião ainda.`;

  } else if (userMsgs.length >= 3 && info.completo) {
    const gatilhoUsar = nichoConfirmado ? nichoCtx.gatilho : CONTEXTO_UNIVERSAL.gatilho;
    instrucaoModo = `FASE 4 → 5 — RECONHECIMENTO E CLOSE NATURAL (${userMsgs.length} trocas):
${nichoConfirmado ? `Nicho confirmado: ${nichoCtx.descricao}. Use contexto específico.` : `Atividade NÃO confirmada. Use contexto UNIVERSAL — sem linguagem de nicho específico.`}
1. Reconheça o padrão específico DELE usando o que ele REALMENTE disse: "Com o que você me contou — [referência exata] — percebo que..."
2. Nomeie o que ele já sente: "${gatilhoUsar}"
3. Close: "É exatamente esse cenário que o Hariton diagnóstica em 15 minutos — rápido, sem compromisso, só para ter clareza. Tenho [dia] ou [dia] — qual funciona melhor?"`;

  } else if (userMsgs.length >= 3 && !info.completo) {
    const gatilhoUsar = nichoConfirmado ? nichoCtx.gatilho : CONTEXTO_UNIVERSAL.gatilho;
    instrucaoModo = `FASE 4 — CLOSE COM CONTEXTO PARCIAL (${userMsgs.length} trocas):
${nichoConfirmado ? `Nicho confirmado: ${nichoCtx.descricao}.` : `Atividade NÃO confirmada. Use contexto UNIVERSAL.`}
Reconheça o padrão: "${gatilhoUsar}"
Close: "É exatamente esse cenário que o Hariton resolve em 15 minutos. Tenho [dia] ou [dia] — qual funciona melhor?"
A qualificação completa acontece no diagnóstico — não bloqueie o close por falta de dados.`;

  } else if (estagioConv === 'agendamento') {
    instrucaoModo = `FASE 5 — CONFIRMAÇÃO DO HORÁRIO:
${primeiroNome} está próximo de confirmar. Proponha horário específico, formato (vídeo), duração (15 minutos) e o que esperar da conversa com o Hariton.
Tom: animado mas elegante. Se ele confirmar dia e hora, inclua [REUNIAO_CONFIRMADA] ao final.`;

  } else {
    instrucaoModo = `MODO CONVERSAÇÃO NATURAL (${userMsgs.length} trocas):
Responda com empatia e especificidade. Mostre que ouviu antes de qualquer argumento.
${userMsgs.length >= 3 ? 'Você pode propor a reunião se o contexto estiver maduro.' : 'Ainda NÃO proponha reunião — construa mais conexão primeiro.'}`;
  }

  // ── Instrução de engajamento ───────────────────────────────────────────────
  let instrEngajamento = '';
  if (engaj === 'alto' && userMsgs.length >= 3) {
    instrEngajamento = `\n\n${primeiroNome} ESTÁ MUITO ENGAJADO E JÁ TIVEMOS 3+ TROCAS — avance com confiança para o close.`;
  } else if (engaj === 'alto' && userMsgs.length < 3) {
    instrEngajamento = `\n\n${primeiroNome} ESTÁ ENGAJADO — aproveite para aprofundar o contexto. Não queime o close antes da hora.`;
  }

  const insightsStr = insights.length
    ? `\nO que ${primeiroNome} já revelou na conversa: ${insights.join(', ')}`
    : '';

  return `[PERFIL DE ${primeiroNome.toUpperCase()}]
Nome: ${lead.nome} | Profissão (operador): ${profissaoOperador || 'não informada'} | Cidade: ${lead.cidade || 'não informada'} | Estado: ${lead.estado || ''}
Patrimônio declarado: ${lead.patrimonio || 'não informado'} | Perfil de risco: ${lead.perfil}
Instituições mencionadas: ${lead.instituicoes !== '[]' ? lead.instituicoes : 'nenhuma ainda'}
Atividade confirmada pelo cliente: ${nichoConfirmado ? `SIM — ${nichoCtx.descricao}` : 'NÃO — use apenas contexto universal até o cliente confirmar'}
Dor central (${nichoConfirmado ? 'nicho confirmado' : 'universal'}): ${nichoCtx.dor_central}
Estágio da conversa: ${estagioConv} | Trocas com o cliente: ${userMsgs.length} | Engajamento atual: ${engaj}${insightsStr}

${instrucaoModo}${instrEngajamento}`;
}

// ─── Abertura ─────────────────────────────────────────────────────────────────

async function gerarAbertura(lead, statsTemplates = {}) {
  try {
    const { mensagem } = gerarMensagemAbertura(lead, statsTemplates);
    return mensagem;
  } catch {
    // Fallback via IA
    const horario = getContextoHorario();
    const primeiroNome = lead.nome.split(' ')[0];
    const nichoCtx = NICHOS_CONTEXTO[lead.nicho] || NICHOS_CONTEXTO.medico_cirurgiao;

    const instrucao = `ABERTURA PARA ${primeiroNome.toUpperCase()} — ${nichoCtx.descricao}:
Gere uma mensagem de abertura WhatsApp — curta, intrigante, humana. Máximo 2 parágrafos.
Regras obrigatórias:
- NÃO começa com "Olá! Tudo bem?" nem com saudação genérica
- NÃO menciona a profissão/nicho de ${primeiroNome} ainda
- NÃO propõe reunião ainda
- Apresente-se: Sofia Mendes, trabalha com Hariton Andrade - Crie curiosidade: Hariton quis especificamente falar com ${primeiroNome} — insinue que percebeu algo no perfil dele
- Finalize com UMA pergunta genuína sobre como ${primeiroNome} está pensando o patrimônio hoje
- Tom: profissional, caloroso, curioso — não de vendedora`;

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SOFIA_SYSTEM,
      messages: [{ role: 'user', content: `${horario}\n\n${instrucao}` }]
    });
    return res.content[0].text;
  }
}

// ─── Opt-out / Cessar contato ─────────────────────────────────────────────────

const FRASES_CESSAR = [
  'não quero mais', 'nao quero mais', 'para de me', 'pare de me', 'me tire da lista',
  'não me contate', 'nao me contate', 'não entre em contato', 'nao entre em contato',
  'não quero contato', 'nao quero contato', 'stop', 'chega de mensagem',
  'não tenho interesse', 'nao tenho interesse', 'me remova', 'cancela', 'cancele',
  'descadastrar', 'não me mande mais', 'me bloqueia', 'para de mandar mensagem',
  'não perturbe', 'nao perturbe', 'sai fora', 'vai embora'
];

function detectarCessarContato(mensagem) {
  const lower = mensagem.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FRASES_CESSAR.some(f => lower.includes(f.normalize('NFD').replace(/[̀-ͯ]/g, '')));
}

// ─── Resposta principal ───────────────────────────────────────────────────────

async function responder(lead, mensagemUsuario) {
  const ctx   = construirContextoLead(lead, mensagemUsuario);
  const horario = getContextoHorario();
  const engaj = avaliarEngajamento(mensagemUsuario);

  // Opt-out
  if (detectarCessarContato(mensagemUsuario)) {
    const nome = lead.nome.split(' ')[0];
    const resposta = `${nome}, entendido e respeitado. Vou tirar você da nossa lista agora — sem mais nenhum contato da nossa parte. Foi um prazer ter chegado até você. Tudo de bom! 🙏`;
    return { resposta, novoEstagio: lead.estagioConv, agendou: false, cessarContato: true, objecaoDetectada: null };
  }

  // Objeção
  const objecao = detectarObjecao(mensagemUsuario);
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome, lead.nicho) : '';

  // Intenção de agendar
  const msgLower = mensagemUsuario.toLowerCase();
  const querAgendar = ['sim', 'pode', 'vamos', 'ok', 'claro', 'quando', 'horário', 'horario',
    'disponível', 'disponivel', 'agenda', 'quero', 'aceito', 'top', 'combinado', 'feito',
    'pode ser', 'bora', 'tá bom', 'ta bom', 'ótimo', 'perfeito', 'quinta', 'terça', 'segunda',
    'sexta', 'amanhã', 'essa semana', 'próxima semana', 'confirmo', 'confirmado'].some(w => msgLower.includes(w));

  let instrucaoAgendamento = '';
  if (querAgendar && !objecao) {
    const janelas = await proximasDuasJanelas(new Date());
    if (!janelas.length) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO DE AGENDA: Não há janelas livres próximas na agenda do Hariton. Pergunte a melhor disponibilidade do cliente e diga que confirma o horário com o Hariton em seguida. NÃO inclua [REUNIAO_CONFIRMADA] ainda.`;
    } else if (janelas.length === 1) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: O cliente quer agendar. Ofereça esta janela REALMENTE livre: ${janelas[0].formatada}. Se ele aceitar, inclua ao final exatamente: [REUNIAO_CONFIRMADA:${janelas[0].iso}]`;
    } else {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: O cliente quer agendar. Ofereça SOMENTE estas duas janelas REALMENTE livres e peça para ele escolher uma. Não invente nem aceite outro horário.
(A) ${janelas[0].formatada}
(B) ${janelas[1].formatada}
Quando ele escolher A ou B, confirme com elegância e inclua ao final EXATAMENTE o marcador da opção: [REUNIAO_CONFIRMADA:${janelas[0].iso}] para (A) ou [REUNIAO_CONFIRMADA:${janelas[1].iso}] para (B).
Se ele propuser um dia ou horário diferente, NUNCA invente um ISO e NÃO inclua o marcador. Diga que vai checar essa disponibilidade com o Hariton e ofereça de novo as janelas acima. O marcador é interno, o cliente nunca o vê.`;
    }
  }

  // Idioma do cliente (tag idioma:es) — responde em espanhol quando marcado
  const tagsLead = (() => { try { return JSON.parse(lead.tags || '[]'); } catch { return []; } })();
  const instrucaoIdioma = tagsLead.includes('idioma:es')
    ? '\n\nIDIOMA — INEGOCIÁVEL: Este cliente fala ESPANHOL. Responda SEMPRE em espanhol (castelhano), natural e caloroso. Mantenha todas as regras e o tom da Sofia, apenas no idioma espanhol — nunca em português.'
    : '';

  // Histórico completo (últimas 20 mensagens)
  const historico = (lead.mensagens || []).slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const userContent = [
    ctx,
    horario,
    instrucaoObjecao,
    instrucaoAgendamento,
    instrucaoIdioma,
    '\n\n━━━ MENSAGEM ATUAL DE ' + lead.nome.split(' ')[0].toUpperCase() + ' ━━━\n' + mensagemUsuario
  ].filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 650,
    system: SOFIA_SYSTEM,
    messages
  });

  let resposta = res.content[0].text;
  // Marcador aceita data/hora ISO opcional: [REUNIAO_CONFIRMADA] ou [REUNIAO_CONFIRMADA:2026-06-12T17:00:00.000Z]
  const agendaMatch   = resposta.match(/\[REUNIAO_CONFIRMADA(?::([0-9T:+\-.Z]+))?\]/i);
  const agendou       = Boolean(agendaMatch);
  const dataReuniaoISO = agendaMatch?.[1] || null;
  const cessarContato = resposta.includes('[CESSAR_CONTATO]');
  resposta = resposta
    .replace(/\[REUNIAO_CONFIRMADA(?::[0-9T:+\-.Z]+)?\]/gi, '')
    .replace('[CESSAR_CONTATO]', '')
    .trim();

  // Determinar novo estágio
  const r = resposta.toLowerCase();
  let novoEstagio = lead.estagioConv || 'abertura';
  if      (agendou)                                                                                           novoEstagio = 'confirmado';
  else if (r.match(/terça|quinta|segunda|sexta|qual dia|qual horário|agenda para|que tal.*dia|janela/))      novoEstagio = 'agendamento';
  else if (objecao)                                                                                            novoEstagio = 'objecao';
  else if (r.match(/diagnóstico|cenário atual|patrimônio|investe|onde investe|estrutura|bradesco|itaú|xp/))  novoEstagio = 'qualificacao';
  else if (r.match(/custo|risco|blindagem|proteção|exposto|vulnerável|perdendo|dólar|processo|concentrado/)) novoEstagio = 'conexao';

  return { resposta, novoEstagio, agendou, dataReuniaoISO, cessarContato, objecaoDetectada: objecao?.id || null };
}

// ─── Mensagem de reengajamento ────────────────────────────────────────────────

const REENG_SYSTEM = `Você é Sofia Mendes, secretária executiva do Hariton Andrade, consultor e planejador financeiro. Ele trabalha de forma independente, sem comissão de produto e sem conflito de interesse. Nunca admite ser IA.
Está dando um toque leve de acompanhamento, pra pessoa se sentir lembrada. Traga um gancho de valor genuíno e uma pergunta leve, sem cobrar nada.
Tom: caloroso, curioso, sem pressão, como alguém que tem algo novo a dizer, não um vendedor fechando cota.
Mensagem curta de WhatsApp: 1 parágrafo, no máximo 2 ou 3 frases. Primeira linha com substância, nunca com "Olá! Tudo bem?". Use o primeiro nome. Finalize com uma pergunta leve.
NUNCA use diminutivos ("minutinhos", "conversinha", "rapidinho"). Público sênior, linguagem adulta: "15 minutos", "uma conversa".
PROIBIDO travessão/hífen como pausa ("—", " - "): use vírgula ou ponto. Sem bordões de IA. Varie o ritmo e escreva como gente, não como texto gerado.
NÃO mencione que faz tempo sem contato. NÃO seja insistente. Seja genuinamente útil.
Responda sempre em português brasileiro coloquial refinado.`;

const INSIGHTS_REENG = {
  medico_cirurgiao:      'o volume de processos contra médicos especialistas cresceu nos últimos anos. Quem não tem estrutura de blindagem patrimonial fica cada vez mais exposto a um risco que não aparece em extrato nenhum',
  advogado_tributarista: 'a Receita apertou a fiscalização de offshores declarados de forma errada. Quem regularizou a estrutura está tranquilo, quem não fez pode estar pagando mais imposto do que deveria',
  ceo_empresario:        'o dólar oscilou bastante nos últimos meses. Quem tinha diversificação cambial preservou poder de compra, enquanto patrimônio 100% em real viu uma erosão silenciosa',
  dentista_especialista: 'o mercado odontológico está se consolidando com grandes grupos. Dentista que não organizou o patrimônio fica em posição mais frágil nessa virada do setor',
  engenheiro_executivo:  'executivo com muita concentração em stock options da empregadora corre risco dobrado se a empresa tropeça ou o vínculo muda, porque renda e patrimônio são afetados ao mesmo tempo'
};

async function gerarMensagemReengajamento4Meses(lead) {
  const insight = INSIGHTS_REENG[lead.nicho] || 'o mercado financeiro teve mudanças relevantes que podem impactar diretamente o seu perfil patrimonial';
  const primeiroNome = lead.nome.split(' ')[0];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: REENG_SYSTEM,
    messages: [{
      role: 'user',
      content: `Toque de acompanhamento para ${primeiroNome}, ${lead.profissao || 'profissional'} em ${lead.cidade || 'Brasil'}.
Gancho de valor pra usar (adapte, não copie): ${insight}.
Escreva UMA mensagem curta de WhatsApp (1 parágrafo, 2 ou 3 frases), leve, trazendo esse gancho e abrindo espaço pra uma conversa de 15 minutos com o Hariton, sem cobrar.
NÃO diga que faz tempo que não fala. Termine com uma pergunta leve. Sem travessão, sem bordão de IA.`
    }]
  });

  return res.content[0].text;
}

// ─── Extração automática de dados ────────────────────────────────────────────

const EXTRACAO_SYSTEM = `Extrator de dados estruturados para CRM de private banking.
Analise a mensagem e extraia APENAS informações explicitamente mencionadas.
Retorne JSON puro (sem markdown) com campos encontrados. Omita campos não mencionados.

Campos:
- email: string
- patrimonio: string (ex: "R$ 3 milhões", "R$ 800 mil")
- patrimonioNum: number (em reais: "3 milhões" → 3000000, "800 mil" → 800000)
- cidade: string
- estado: string (sigla)
- profissao: string
- perfil: "Conservador" | "Moderado" | "Arrojado" (inferido pelo tom e atitudes descritas)
- instituicoes: array de strings ["btg","xp","bradesco","itau","safra","nubank","outro"]
- investimentos: string (descrição livre do que foi mencionado)
- nicho: "medico_cirurgiao"|"advogado_tributarista"|"ceo_empresario"|"dentista_especialista"|"engenheiro_executivo"

Exemplo: {"patrimonio":"R$ 800 mil","patrimonioNum":800000,"instituicoes":["bradesco"]}`;

async function extrairDadosConversa(mensagemCliente, lead) {
  const words = mensagemCliente.trim().split(/\s+/).length;
  if (words < 3) return {};

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: EXTRACAO_SYSTEM,
      messages: [{
        role: 'user',
        content: `Lead: nome=${lead.nome}, profissão=${lead.profissao || '?'}, cidade=${lead.cidade || '?'}, patrimônio=${lead.patrimonio || '?'}\n\nMensagem: ${mensagemCliente}`
      }]
    });

    const raw  = res.content[0].text.trim();
    const json = JSON.parse(raw.replace(/^```json?\s*/,'').replace(/\s*```$/,''));
    const update = {};

    if (json.email        && !lead.email)                                         update.email         = json.email;
    if (json.patrimonio   && !lead.patrimonio)                                    update.patrimonio    = json.patrimonio;
    if (json.patrimonioNum && json.patrimonioNum > 0 && !lead.patrimonioNum)     update.patrimonioNum = json.patrimonioNum;
    if (json.cidade       && !lead.cidade)                                        update.cidade        = json.cidade;
    if (json.estado       && !lead.estado)                                        update.estado        = json.estado;
    if (json.profissao    && !lead.profissao)                                     update.profissao     = json.profissao;
    if (json.perfil       && lead.perfil === 'Moderado')                          update.perfil        = json.perfil;
    if (json.nicho        && lead.nicho  === 'medico_cirurgiao')                  update.nicho         = json.nicho;

    if (json.investimentos) {
      const tags = (() => { try { return JSON.parse(lead.tags || '[]'); } catch { return []; } })();
      if (!tags.some(t => t.startsWith('inv:'))) {
        update.tags = JSON.stringify([...tags, `inv:${json.investimentos.slice(0, 80)}`]);
      }
    }

    if (json.instituicoes?.length) {
      const atuais = (() => { try { return JSON.parse(lead.instituicoes || '[]'); } catch { return []; } })();
      const merged = [...new Set([...atuais, ...json.instituicoes])];
      if (merged.length > atuais.length) update.instituicoes = JSON.stringify(merged);
    }

    if (Object.keys(update).length > 0) {
      console.log(`[Sofia·Extração] ${lead.nome}: →`, Object.keys(update).join(', '));
    }
    return update;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Extração] erro:', err.message);
    return {};
  }
}

module.exports = {
  gerarAbertura,
  responder,
  gerarMensagemReengajamento4Meses,
  detectarCessarContato,
  temInformacoesCompletas,
  extrairDadosConversa,
  avaliarEngajamento,
  NICHOS_CONTEXTO
};
