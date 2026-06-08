const Anthropic = require('@anthropic-ai/sdk');
const { podendoAgendar } = require('./scheduler');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

// ─── Persona Sofia ────────────────────────────────────────────────────────────

const SOFIA_SYSTEM = `Você é Sofia Mendes — profissional sênior do mercado financeiro com 14 anos de experiência em Private Banking, Family Office e Wealth Management. Trabalha diretamente com o advisor Hariton Gomes na Altum Wealth.

QUEM VOCÊ É:
- Não é secretária, é parceira de negócios do Hariton — você entende profundamente de patrimônio, offshore, proteção e mercado
- Fala como alguém que já atendeu centenas de clientes de alta renda — com naturalidade, sem roteiro
- Você tem opiniões e perspectivas próprias baseadas em experiência real de mercado
- Se tratada como IA ou robô, responde com elegância: "Sou humana, sim — e muito atenta ao que o mercado está fazendo"

SEU ÚNICO OBJETIVO AGORA: Marcar 15 minutos de conversa diagnóstica entre o cliente e Hariton. Nada mais.

TOM E ESTILO:
- WhatsApp sênior de mercado: direto, caloroso, sem formalidade excessiva
- Usa o primeiro nome da pessoa naturalmente, como se já se conhecessem
- Máximo 3 parágrafos curtos — nunca parece um email corporativo
- Termina sempre com UMA pergunta fechada (sim/não ou 2 opções de horário)
- Demonstra empatia genuína com a realidade do cliente, não compaixão artificial
- Quando usa humor leve, é refinado — nunca soa forçado
- Referencia o mercado atual quando oportuno: "com o cenário que está aí..."

FLUXO DA CONVERSA — SIGA OBRIGATORIAMENTE:
1. ABERTURA: Contato inicial caloroso e humanizado. NUNCA mencione nicho/profissão neste momento. Apresente-se, gere curiosidade sobre a Altum e faça UMA pergunta suave e aberta sobre o momento atual do cliente.

2. VALIDAÇÃO DE NICHO (obrigatório antes de qualquer argumento de venda): Após a primeira resposta do cliente, confirme naturalmente quem ele é. Exemplo: "Pelo que o Hariton me contou, você é [profissão] — ainda é isso mesmo, certo?" ou "Você ainda está atuando na área de [área]?". SÓ avance para argumentos de nicho APÓS esta confirmação.

3. QUALIFICAÇÃO: Com o nicho confirmado, faça 1-2 perguntas sobre o cenário atual de investimentos. Natural, como curiosidade genuína.

4. CONEXÃO: Use os dados coletados para mostrar que você entende a situação específica dele. Crie urgência real (não apelo emocional vazio) baseado em fatos de mercado.

5. AGENDAMENTO: Proponha os 15 minutos com Hariton de forma natural. Ofereça 2 opções de dia.

6. CONFIRMAÇÃO: Ao confirmar reunião, inclua [REUNIAO_CONFIRMADA] ao final.

DIFERENCIAIS DA ALTUM QUE VOCÊ CONHECE BEM:
- Modelo fiduciário fee-based: Hariton não ganha comissão de produto — só alinhado com o cliente
- Não concorre com o banco atual: atua como auditoria patrimonial externa
- Especialidade real: diversificação internacional, offshore estruturado, proteção patrimonial, sucessão familiar
- Acesso a estruturas que os bancos tradicionais não oferecem diretamente

REGRAS INEGOCIÁVEIS:
1. NUNCA mencione taxas, rentabilidade passada ou produtos específicos
2. NUNCA pressione — quando o cliente hesita, ouça mais, pressione menos
3. Se o cliente pedir para parar o contato (qualquer variação: "não quero mais", "para de me mandar mensagem", "STOP", "me tire da lista"): responda com elegância e inclua [CESSAR_CONTATO] ao final
4. Se confirmar reunião: inclua [REUNIAO_CONFIRMADA] ao final
5. Responda SEMPRE em português brasileiro coloquial refinado

CONTEXTO DO MERCADO QUE VOCÊ USA QUANDO OPORTUNO:
- Dólar oscilando — patrimônio 100% em real está exposto
- Juros altos no Brasil parecem seguros mas não protegem contra inflação real de longo prazo
- Lei 14.754/2023 mudou o jogo para quem tem offshore — quem estruturou certo está se beneficiando
- Grandes bancos têm conflito de interesse estrutural — o produto que eles vendem é o produto que paga mais comissão para eles`;

// ─── Nichos — contexto e dores ────────────────────────────────────────────────

const NICHOS_CONTEXTO = {
  medico_cirurgiao:      'Médico cirurgião. Dor central: blindagem do patrimônio pessoal contra processos civis e trabalhistas — um processo pode comprometer décadas de trabalho. Segundo vetor: patrimônio inteiro em BRL, sem proteção cambial. Gatilho emocional: "o que você construiu pode desaparecer em uma sentença".',
  advogado_tributarista: 'Advogado tributarista — tecnicamente sofisticado, sabe da teoria mas muitas vezes negligencia o próprio patrimônio. Use linguagem técnica: trusts, offshore, Lei 14.754, eficiência fiscal. Dor: "você estrutura o patrimônio dos seus clientes com perfeição, mas e o seu?"',
  ceo_empresario:        'CEO/Empresário. Concentração de risco: empresa + patrimônio pessoal + exposição cambial — tudo no Brasil. Dor: "uma crise regulatória ou desvalorização do real pode desfazer o que você levou anos construindo". Gatilho: diversificação geográfica como gestão de risco, não fuga.',
  dentista_especialista: 'Dentista especialista (implante, ortodontia, etc.). Constrói patrimônio relevante mas raramente o organiza. Dor: "você trabalha muito para acumular — mas o dinheiro não está trabalhando para você com a mesma eficiência". Gatilho: simplicidade + proteção.',
  engenheiro_executivo:  'Executivo sênior com stock options e risco concentrado na empresa empregadora. Dor: "toda a sua riqueza depende de uma única empresa — se ela tropeçar ou te demitir, o que sobra?". Gatilho: diversificação além do empregador como inteligência patrimonial.'
};

const DORES_NICHO = {
  medico_cirurgiao:      ['exposição patrimonial a processos judiciais sem estrutura de proteção', 'patrimônio inteiro em reais sem hedge cambial', 'ausência de blindagem jurídica e planejamento sucessório'],
  advogado_tributarista: ['tributação crescente sem estrutura offshore eficiente', 'risco de sucessão sem planejamento formal apesar do conhecimento técnico', 'conflito entre saber e fazer no próprio patrimônio'],
  ceo_empresario:        ['concentração total de risco no Brasil e na empresa', 'exposição cambial sem hedge em momento de dólar volátil', 'ausência de governança para sucessão familiar e empresarial'],
  dentista_especialista: ['patrimônio acumulado sem estratégia de proteção ou diversificação', 'dependência total de uma única fonte de renda ativa', 'nenhuma estrutura de proteção contra imprevistos ou processos'],
  engenheiro_executivo:  ['80%+ da riqueza concentrada em uma única empresa', 'stock options sem plano de diversificação estruturado', 'risco de lockup ou demissão sem colchão patrimonial diversificado']
};

// ─── Contexto do lead ─────────────────────────────────────────────────────────

function temInformacoesCompletas(lead) {
  const patrimonio   = lead.patrimonio && lead.patrimonio !== '' && lead.patrimonio !== 'Não informado';
  const profissao    = lead.profissao  && lead.profissao  !== '';
  const instituicoes = lead.instituicoes && lead.instituicoes !== '[]';
  return { patrimonio, profissao, instituicoes, completo: patrimonio && profissao };
}

function nichoValidado(lead) {
  // Considera nicho validado se: houve conversa prévia E o nicho não é o default
  // OU se o usuário foi adicionado com profissão explícita
  const temHistorico = (lead.mensagens || []).filter(m => m.role === 'user').length >= 1;
  const temProfissao = lead.profissao && lead.profissao !== '';
  return temHistorico && temProfissao;
}

function construirContextoLead(lead) {
  const nichoCtx   = NICHOS_CONTEXTO[lead.nicho] || '';
  const insights   = extrairInsightsRespostas(lead.mensagens || []);
  const insightsStr = insights.length ? `\nInsights coletados: ${insights.join(', ')}` : '';
  const info        = temInformacoesCompletas(lead);
  const validado    = nichoValidado(lead);
  const userMsgs    = (lead.mensagens || []).filter(m => m.role === 'user').length;

  let modo;
  if (userMsgs === 0) {
    modo = 'MODO: ABERTURA — primeira mensagem. Não cite profissão/nicho. Seja calorosa e curiosa.';
  } else if (!validado || userMsgs === 1) {
    modo = `MODO: VALIDAÇÃO DE NICHO — confirme naturalmente se o lead é ${lead.profissao || 'profissional da área indicada'} antes de avançar com argumentos específicos.`;
  } else if (!info.completo) {
    modo = 'MODO: QUALIFICAÇÃO — nicho confirmado, colete dados de patrimônio e instituição atual de forma natural.';
  } else {
    modo = 'MODO: GERAÇÃO DE DOR → AGENDAMENTO — você já tem os dados. Use-os para criar urgência real e propor os 15 minutos.';
  }

  return `[CONTEXTO DO LEAD]
Nome: ${lead.nome} | Profissão cadastrada: ${lead.profissao || 'não informada'} | Cidade: ${lead.cidade || 'não informada'}
Patrimônio: ${lead.patrimonio || 'não informado'} | Perfil: ${lead.perfil} | Mensagens do cliente: ${userMsgs}
Instituições: ${lead.instituicoes !== '[]' ? lead.instituicoes : 'não informadas'}
Nicho (cadastrado, ainda não validado com cliente): ${nichoCtx}
Estágio: ${lead.estagioConv || 'abertura'}${insightsStr}

${modo}`;
}

// ─── Abertura ─────────────────────────────────────────────────────────────────

async function gerarAbertura(lead, statsTemplates = {}) {
  // Usa template se disponível
  try {
    const { mensagem } = gerarMensagemAbertura(lead, statsTemplates);
    return mensagem;
  } catch {
    // Fallback: abertura via IA — humanizada sem assumir nicho
    const horario = getContextoHorario();
    const primeiroNome = lead.nome.split(' ')[0];

    const instrucao = `INSTRUÇÃO DE ABERTURA:
Gere uma mensagem de abertura calorosa e humanizada para ${primeiroNome}.
- NÃO mencione profissão, nicho ou área de atuação — você vai confirmar isso depois
- Apresente-se brevemente como Sofia da Altum Wealth, parceira do Hariton Gomes
- Gere curiosidade genuína sobre a Altum (advisory independente, sem conflito de interesse — diferente dos bancos tradicionais)
- Faça UMA pergunta aberta e suave sobre o momento atual do cliente: "como você está pensando o seu patrimônio hoje?" ou similar
- Tom: como se fosse uma indicação de amigo comum — warm, não invasivo
- Máximo 3 parágrafos curtos`;

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: SOFIA_SYSTEM,
      messages: [{ role: 'user', content: `${horario}\n\n${instrucao}` }]
    });
    return res.content[0].text;
  }
}

// ─── Resposta ─────────────────────────────────────────────────────────────────

const FRASES_CESSAR = [
  'não quero mais', 'nao quero mais', 'para de me', 'pare de me', 'me tire da lista',
  'não me contate', 'nao me contate', 'não entre em contato', 'nao entre em contato',
  'não quero contato', 'nao quero contato', 'stop', 'chega de mensagem',
  'não tenho interesse', 'nao tenho interesse', 'me remova', 'cancela', 'cancele',
  'descadastrar', 'não me mande mais', 'me bloqueia', 'para de mandar mensagem'
];

function detectarCessarContato(mensagem) {
  const lower = mensagem.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FRASES_CESSAR.some(f => lower.includes(f.normalize('NFD').replace(/[̀-ͯ]/g, '')));
}

async function responder(lead, mensagemUsuario) {
  const ctx     = construirContextoLead(lead);
  const horario = getContextoHorario();
  const info    = temInformacoesCompletas(lead);
  const validado = nichoValidado(lead);

  // Opt-out
  if (detectarCessarContato(mensagemUsuario)) {
    const resposta = `${lead.nome.split(' ')[0]}, entendido e respeitado. Vou te tirar da lista agora — não haverá mais nenhum contato. Foi um prazer ter chegado até você. Tudo de bom! 🙏`;
    return { resposta, novoEstagio: lead.estagioConv, agendou: false, cessarContato: true, objecaoDetectada: null };
  }

  // Detectar objeção
  const objecao = detectarObjecao(mensagemUsuario);
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome) : '';

  // Detectar intenção de agendar
  const msgLower = mensagemUsuario.toLowerCase();
  const querAgendar = ['sim', 'pode', 'vamos', 'ok', 'claro', 'quando', 'horário', 'horario',
    'disponível', 'disponivel', 'agenda', 'quero', 'aceito', 'top', 'combinado', 'feito',
    'pode ser', 'bora', 'tá bom', 'ta bom'].some(w => msgLower.includes(w));

  let instrucaoAgendamento = '';
  if (querAgendar && !objecao) {
    const agendamento = await podendoAgendar(new Date());
    if (!agendamento.pode) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO DE AGENDA: ${agendamento.mensagemSofia}`;
    } else {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: Cliente quer agendar. Próxima janela disponível: ${agendamento.formatada}. Confirme com o cliente. Se aceitar, inclua [REUNIAO_CONFIRMADA] ao final da resposta.`;
    }
  }

  // Instrução de modo — baseada no estágio real da conversa
  let instrucaoModo = '';
  const estagioConv = lead.estagioConv || 'abertura';
  const userMsgs = (lead.mensagens || []).filter(m => m.role === 'user');

  if (!objecao && !querAgendar) {
    if (!validado && userMsgs.length <= 2) {
      // Validar nicho antes de qualquer argumento
      instrucaoModo = `\n\nINSTRUÇÃO (VALIDAÇÃO DE NICHO): Responda à mensagem do cliente com calor e naturalidade. Depois confirme suavemente a profissão/área do cliente antes de avançar — algo como "pelo que o Hariton me contou, você atua em [área], certo?" ou "ainda está na área de [profissão]?". Não avance para argumentos de nicho sem esta confirmação.`;
    } else if (!info.completo && validado) {
      // Qualificação suave
      const perguntas = {
        medico_cirurgiao:      ['Você concentra seus investimentos no Brasil ou já tem algo internacional?', 'Além da renda da medicina, você tem outros ativos relevantes — imóveis, participação em clínica?'],
        advogado_tributarista: ['Como você estrutura hoje o seu patrimônio pessoal — PF ou via holding?', 'Já explorou alguma estrutura offshore para eficiência fiscal?'],
        ceo_empresario:        ['Qual percentual do seu patrimônio pessoal está fora do Brasil hoje?', 'Você tem uma estrutura de holding familiar ou pensa em montar uma?'],
        dentista_especialista: ['Você investe principalmente onde — banco tradicional ou já tem corretora?', 'Já pensou em diversificar parte do que construiu fora do Brasil?'],
        engenheiro_executivo:  ['Além do salário, você tem stock options ou participações acumuladas?', 'Como você está pensando a independência financeira — já tem um plano estruturado?']
      };
      const listaPerguntas = perguntas[lead.nicho] || perguntas.medico_cirurgiao;
      const perguntaAtual = listaPerguntas[Math.min(userMsgs.length - 1, listaPerguntas.length - 1)];
      instrucaoModo = `\n\nINSTRUÇÃO (QUALIFICAÇÃO): Responda de forma genuína e empática. Incorpore naturalmente esta pergunta — como curiosidade real, não questionário: "${perguntaAtual}"`;
    } else if (info.completo && ['abertura', 'qualificacao', 'conexao'].includes(estagioConv)) {
      // Geração de dor com dados reais
      const dores = DORES_NICHO[lead.nicho] || [];
      const dorAtual = dores[Math.min(userMsgs.length - 1, dores.length - 1)] || dores[0];
      instrucaoModo = `\n\nINSTRUÇÃO (GERAÇÃO DE DOR → AGENDAMENTO): Você tem dados sobre este lead. Após responder, traga organicamente o tema de "${dorAtual}" — como alguém experiente que reconhece o padrão: "eu vejo isso muito com [perfil dele]...". O objetivo: ele deve sentir que você está falando exatamente da situação dele. Finalize propondo os 15 minutos com Hariton.`;
    }
  }

  const historico = (lead.mensagens || []).slice(-14).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const userContent = [ctx, horario, instrucaoObjecao, instrucaoAgendamento, instrucaoModo,
    '\n\nMENSAGEM DO CLIENTE:\n' + mensagemUsuario].filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 480,
    system: SOFIA_SYSTEM,
    messages
  });

  let resposta = res.content[0].text;
  const agendou       = resposta.includes('[REUNIAO_CONFIRMADA]');
  const cessarContato = resposta.includes('[CESSAR_CONTATO]');
  resposta = resposta.replace('[REUNIAO_CONFIRMADA]', '').replace('[CESSAR_CONTATO]', '').trim();

  // Determinar estágio
  const r = resposta.toLowerCase();
  let novoEstagio = estagioConv;
  if      (agendou)                                                                         novoEstagio = 'confirmado';
  else if (r.match(/terça|quinta|segunda|sexta|qual dia|qual horário|agenda para/))         novoEstagio = 'agendamento';
  else if (objecao)                                                                          novoEstagio = 'objecao';
  else if (r.match(/diagnóstico|cenário atual|patrimônio|investe|onde investe|estrutura/))  novoEstagio = 'qualificacao';
  else if (r.match(/custo|risco|blindagem|proteção|exposto|vulnerável|perdendo|dólar/))     novoEstagio = 'conexao';

  return { resposta, novoEstagio, agendou, cessarContato, objecaoDetectada: objecao?.id || null };
}

// ─── Mensagem de reengajamento (4 meses) ──────────────────────────────────────

const REENG4M_SYSTEM = `Você é Sofia Mendes, profissional sênior da Altum Wealth.
Está retomando contato com alguém que mostrou interesse anteriormente mas a conversa esfriou.
Tom: caloroso, respeitoso, sem pressão. Use um ângulo novo — uma mudança de mercado ou insight relevante.
Mencione o contato anterior de forma natural, sem ser invasivo.
Máximo 2 parágrafos curtos.
Se o cliente pediu para parar o contato antes, inclua [CESSAR_CONTATO].
Responda sempre em português brasileiro.`;

const INSIGHTS_REENG = {
  medico_cirurgiao:      'as recentes mudanças no CFM sobre responsabilidade civil e o aumento de ações contra médicos tornaram a blindagem patrimonial ainda mais urgente em 2025',
  advogado_tributarista: 'a Receita intensificou a fiscalização de offshores — quem regularizou certo está tranquilo, quem não regularizou está pagando caro agora',
  ceo_empresario:        'o dólar oscilou mais de 25% desde nossa última conversa — empresários com diversificação cambial protegeram o patrimônio enquanto outros viram o poder de compra cair',
  dentista_especialista: 'o mercado de saúde está consolidando rapidamente — dentistas que não têm o patrimônio organizado e protegido estão ficando vulneráveis nessa virada',
  engenheiro_executivo:  'saiu um relatório sobre executivos com stock options: os que não tinham plano de diversificação perderam em média 30% do valor líquido quando as ações da empresa oscilaram'
};

async function gerarMensagemReengajamento4Meses(lead) {
  const insight = INSIGHTS_REENG[lead.nicho] || 'o mercado financeiro mudou muito nos últimos meses e há oportunidades muito relevantes para o seu perfil';
  const primeiroNome = lead.nome.split(' ')[0];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: REENG4M_SYSTEM,
    messages: [{
      role: 'user',
      content: `Gere mensagem de reengajamento para ${primeiroNome}, ${lead.profissao || 'profissional'} em ${lead.cidade || 'Brasil'}.
Patrimônio: ${lead.patrimonio || 'não informado'}.
Contexto: nos falamos meses atrás, demonstrou interesse mas não chegamos a marcar.
Gancho atual: ${insight}.
Finalize com convite suave para 15 min diagnóstico com Hariton.`
    }]
  });

  return res.content[0].text;
}

// ─── Extração automática de dados do lead ────────────────────────────────────

const EXTRACAO_SYSTEM = `Extrator de dados estruturados para CRM de private banking.
Analise a mensagem e extraia APENAS informações explicitamente mencionadas.
Retorne JSON puro (sem markdown) com campos encontrados. Omita campos não mencionados.

Campos:
- email: string
- patrimonio: string (ex: "R$ 3 milhões")
- patrimonioNum: number (em reais: "3 milhões" → 3000000)
- cidade: string
- estado: string (sigla)
- profissao: string
- perfil: "Conservador" | "Moderado" | "Arrojado" (inferido pelo tom)
- instituicoes: array ["btg","xp","bradesco","itau","safra","nubank","outro"]
- investimentos: string (descrição livre)
- nicho: "medico_cirurgiao"|"advogado_tributarista"|"ceo_empresario"|"dentista_especialista"|"engenheiro_executivo"

Exemplo: {"email":"joao@gmail.com","patrimonio":"R$ 2 milhões","patrimonioNum":2000000,"instituicoes":["xp"]}`;

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

    if (json.email       && !lead.email)                                          update.email        = json.email;
    if (json.patrimonio  && !lead.patrimonio)                                     update.patrimonio   = json.patrimonio;
    if (json.patrimonioNum && json.patrimonioNum > 0 && !lead.patrimonioNum)      update.patrimonioNum = json.patrimonioNum;
    if (json.cidade      && !lead.cidade)                                         update.cidade       = json.cidade;
    if (json.estado      && !lead.estado)                                         update.estado       = json.estado;
    if (json.profissao   && !lead.profissao)                                      update.profissao    = json.profissao;
    if (json.perfil      && lead.perfil === 'Moderado')                           update.perfil       = json.perfil;
    if (json.nicho       && lead.nicho  === 'medico_cirurgiao')                   update.nicho        = json.nicho;

    if (json.investimentos) {
      const tags = (() => { try { return JSON.parse(lead.tags || '[]'); } catch { return []; } })();
      if (!tags.some(t => t.startsWith('inv:'))) {
        update.tags = JSON.stringify([...tags, `inv:${json.investimentos.slice(0,80)}`]);
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

module.exports = { gerarAbertura, responder, gerarMensagemReengajamento4Meses, detectarCessarContato, temInformacoesCompletas, extrairDadosConversa };
