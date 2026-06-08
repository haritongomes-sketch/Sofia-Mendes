const Anthropic = require('@anthropic-ai/sdk');
const { podendoAgendar } = require('./scheduler');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { obterPerguntaQualificacao, extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

// ─── Persona base ─────────────────────────────────────────────────────────────

const SOFIA_SYSTEM = `Você é Sofia Mendes, secretária particular sênior do advisor Hariton Gomes (Altum Wealth).

IDENTIDADE:
- Nome: Sofia Mendes — 12 anos de experiência no mercado financeiro de alta renda (Private Banking, Family Office, Wealth Management)
- Empresa: Altum Wealth (advisory fee-based independente, sem conflito de interesse)
- Parceiro: Hariton Gomes — advisor responsável pelas estratégias e reuniões

SEU ÚNICO OBJETIVO: Agendar uma conversa diagnóstica de 15 minutos entre o cliente e Hariton Gomes.

PERSONALIDADE E TOM:
- Calorosa, refinada e discreta — como uma amiga elegante genuinamente interessada em ajudar
- Sofisticada mas nunca fria ou robótica, nunca vendedora, nunca agressiva
- Usa o primeiro nome do cliente naturalmente e com carinho
- Máximo 3 parágrafos curtos por mensagem — objetiva e elegante
- Tom de WhatsApp: profissional mas próximo, sem excessos formais
- Sempre termina com uma pergunta fechada (sim/não ou escolha entre 2 opções)

REGRAS ABSOLUTAS:
1. NUNCA revele que é IA ou assistente virtual — você é Sofia Mendes, humana
2. NUNCA mencione taxas, rentabilidade, fundos ou produtos específicos
3. NUNCA pressione — sugira, acolha, ouça
4. Se o cliente disser que NÃO quer mais receber contato (qualquer variação: "para de me ligar", "não quero mais", "me tire da lista", "não me contate", "STOP", "chega"), inclua [CESSAR_CONTATO] ao final da resposta — NUNCA haverá mais contato após isso
5. Quando confirmar reunião, inclua [REUNIAO_CONFIRMADA] ao final da resposta

DIFERENCIAIS DA ALTUM WEALTH:
- Modelo fiduciário / fee-based: alinhamento 100% com o cliente, zero conflito de interesse
- Não distribui produtos de prateleira — estratégias 100% personalizadas
- Não concorre com o banco atual do cliente — atua como auditoria fiduciária externa
- Especialidade: diversificação internacional, proteção patrimonial, planejamento sucessório
- Acesso a estruturas offshore, fundos exclusivos e planejamento sucessório

Responda SEMPRE em português brasileiro.`;

// ─── Nichos ───────────────────────────────────────────────────────────────────

const NICHOS_CONTEXTO = {
  medico_cirurgiao:      'Médico cirurgião — dor principal: blindagem patrimonial e proteção contra processos civis. Gatilho: "o risco de um processo pode comprometer anos de trabalho". Explore proteção em dólar e separação do patrimônio pessoal do profissional.',
  advogado_tributarista: 'Advogado tributarista — sofisticado e técnico. Dor: "você protege o patrimônio dos seus clientes, mas quem protege o seu?". Use linguagem de trusts, offshore, eficiência fiscal pós-Lei 14.754/2023.',
  ceo_empresario:        'CEO/Empresário — dor: concentração de risco no Brasil e na própria empresa. Gatilho: "uma desvalorização do real ou instabilidade regulatória pode comprometer o que você construiu". Explore diversificação cambial e proteção da sucessão empresarial.',
  dentista_especialista: 'Dentista especialista — semelhante ao médico, tom mais próximo. Dor: simplificação e proteção do patrimônio, que tende a estar pulverizado. Gatilho: "você trabalha muito para acumular — quem está garantindo que esse patrimônio vai crescer protegido?',
  engenheiro_executivo:  'Executivo sênior — provavelmente com stock options e risco concentrado na empresa empregadora. Dor: "toda a sua riqueza depende de uma única empresa — se ela tropeçar, o que sobra?". Explore diversificação além do empregador.'
};

// Dores mapeadas por nicho para geração de urgência quando lead já está qualificado
const DORES_NICHO = {
  medico_cirurgiao:      ['exposição patrimonial a processos judiciais', 'todo o patrimônio ainda em reais e em risco regulatório', 'ausência de blindagem jurídica no exterior'],
  advogado_tributarista: ['tributação crescente sobre o patrimônio local', 'falta de eficiência fiscal em estruturas offshore', 'risco de sucessão sem planejamento formal'],
  ceo_empresario:        ['concentração total de risco no Brasil e na empresa', 'exposição cambial sem hedge', 'ausência de governança para sucessão familiar'],
  dentista_especialista: ['patrimônio pulverizado sem estratégia de proteção', 'baixa rentabilidade em aplicações convencionais de banco', 'nenhuma proteção internacional'],
  engenheiro_executivo:  ['80%+ da riqueza concentrada em uma única empresa', 'stock options sem plano de diversificação', 'risco de lockup em momento de queda']
};

// ─── Contexto do lead ─────────────────────────────────────────────────────────

function temInformacoesCompletas(lead) {
  const patrimonio   = lead.patrimonio && lead.patrimonio !== '' && lead.patrimonio !== 'Não informado';
  const profissao    = lead.profissao  && lead.profissao  !== '';
  const instituicoes = lead.instituicoes && lead.instituicoes !== '[]';
  return { patrimonio, profissao, instituicoes, completo: patrimonio && profissao };
}

function construirContextoLead(lead) {
  const nichoCtx  = NICHOS_CONTEXTO[lead.nicho] || '';
  const insights  = extrairInsightsRespostas(lead.mensagens || []);
  const insightsStr = insights.length ? `\nInsights das respostas: ${insights.join(', ')}` : '';
  const info = temInformacoesCompletas(lead);

  const modoStr = info.completo
    ? '\nMODO: GERAÇÃO DE DOR — você já tem informações sobre este lead. Use os dados para gerar urgência e mostrar o custo de não agir agora.'
    : '\nMODO: ICE-BREAKER — você não tem informações completas sobre este lead. Seu objetivo é se aproximar, gerar conexão genuína e entender as necessidades antes de qualquer argumento de venda.';

  return `[CONTEXTO DO LEAD]
Nome: ${lead.nome} | Profissão: ${lead.profissao || 'não informada'} | Cidade: ${lead.cidade || 'não informada'}
Patrimônio: ${lead.patrimonio || 'não informado'} | Perfil: ${lead.perfil}
Instituições atuais: ${lead.instituicoes !== '[]' ? lead.instituicoes : 'não informadas'}
Nicho: ${nichoCtx}
Estágio da conversa: ${lead.estagioConv || 'abertura'}${insightsStr}${modoStr}`;
}

// ─── Abertura ─────────────────────────────────────────────────────────────────

async function gerarAbertura(lead, statsTemplates = {}) {
  try {
    const { mensagem } = gerarMensagemAbertura(lead, statsTemplates);
    return mensagem;
  } catch {
    const info = temInformacoesCompletas(lead);
    const ctx = construirContextoLead(lead);
    const horario = getContextoHorario();

    let instrucaoAbertura;
    if (info.completo) {
      // Lead com informações → abertura com dor específica do nicho
      const dores = DORES_NICHO[lead.nicho] || [];
      const dorPrincipal = dores[0] || 'proteção e crescimento patrimonial';
      instrucaoAbertura = `INSTRUÇÃO: Gere a mensagem de abertura inicial para ${lead.nome}. Você já sabe que ele é ${lead.profissao} com patrimônio de ${lead.patrimonio}. Use esta informação para mencionar, de forma natural e sofisticada, o tema de "${dorPrincipal}" — não como argumento de venda, mas como contexto que explica por que o Hariton quis entrar em contato especificamente. Proponha 15 min de conversa diagnóstica.`;
    } else {
      // Lead sem informações → ice-breaker caloroso
      instrucaoAbertura = `INSTRUÇÃO: Gere uma mensagem de abertura tipo ice-breaker para ${lead.nome}. Você não tem informações detalhadas sobre ele. Apresente-se de forma calorosa e genuína, demonstre interesse real na situação dele, e faça UMA pergunta suave para entender o momento financeiro atual — sem parecer questionário. O objetivo é conexão humana primeiro, negócio depois.`;
    }

    const prompt = `${ctx}\n${horario}\n\n${instrucaoAbertura}`;
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 380,
      system: SOFIA_SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.content[0].text;
  }
}

// ─── Resposta ─────────────────────────────────────────────────────────────────

// Frases que indicam opt-out / STOP
const FRASES_CESSAR = [
  'não quero mais', 'nao quero mais', 'para de me', 'pare de me', 'me tire da lista',
  'não me contate', 'nao me contate', 'não entre em contato', 'nao entre em contato',
  'não quero contato', 'nao quero contato', 'stop', 'chega de mensagem', 'bloqueio',
  'vai me bloquear', 'não tenho interesse', 'nao tenho interesse', 'me remova',
  'cancela', 'cancele', 'descadastrar', 'não me mande mais'
];

function detectarCessarContato(mensagem) {
  const lower = mensagem.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FRASES_CESSAR.some(f => lower.includes(f.normalize('NFD').replace(/[̀-ͯ]/g, '')));
}

async function responder(lead, mensagemUsuario) {
  const ctx = construirContextoLead(lead);
  const horario = getContextoHorario();
  const info = temInformacoesCompletas(lead);

  // Detectar pedido de cessar contato antes de qualquer resposta
  if (detectarCessarContato(mensagemUsuario)) {
    const resposta = `${lead.nome.split(' ')[0]}, entendo e respeito completamente. Estou removendo você da nossa lista agora mesmo — não haverá mais nenhum contato da minha parte. Foi um prazer ter conversado com você. Tudo de bom! 🙏`;
    return { resposta, novoEstagio: lead.estagioConv, agendou: false, cessarContato: true, objecaoDetectada: null };
  }

  // Detectar objeção e injetar script
  const objecao = detectarObjecao(mensagemUsuario);
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome) : '';

  // Detectar intenção de agendar
  const msgLower = mensagemUsuario.toLowerCase();
  const querAgendar = ['sim', 'pode', 'vamos', 'ok', 'claro', 'quando', 'horário', 'horario', 'disponível', 'disponivel', 'agenda', 'quero', 'aceito', 'top', 'combinado', 'feito'].some(w => msgLower.includes(w));

  let instrucaoAgendamento = '';
  if (querAgendar && !objecao) {
    const agendamento = await podendoAgendar(new Date());
    if (!agendamento.pode) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO DE AGENDA: ${agendamento.mensagemSofia} Use esta informação de forma natural.`;
    } else {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: O cliente quer agendar. Próxima janela: ${agendamento.formatada}. Confirme este horário com o cliente. Se ele aceitar, inclua [REUNIAO_CONFIRMADA] ao final.`;
    }
  }

  // Modo ice-breaker vs geração de dor
  let instrucaoModo = '';
  const estagioConv = lead.estagioConv || 'abertura';
  const userMsgs = (lead.mensagens || []).filter(m => m.role === 'user');

  if (!info.completo && !objecao && !querAgendar) {
    // Sem informações: qualificação progressiva humanizada
    if (userMsgs.length <= 3) {
      const pergunta = obterPerguntaQualificacao(lead.nicho, userMsgs.length - 1);
      instrucaoModo = `\n\nINSTRUÇÃO (ICE-BREAKER): Responda de forma genuína e empática. Após responder, incorpore naturalmente esta pergunta de qualificação — como curiosidade genuína, não como interrogatório: "${pergunta}"`;
    }
  } else if (info.completo && !objecao && !querAgendar && ['abertura', 'qualificacao', 'conexao'].includes(estagioConv)) {
    // Com informações: gerar dor específica do nicho
    const dores = DORES_NICHO[lead.nicho] || [];
    const dorAtual = dores[Math.min(userMsgs.length, dores.length - 1)] || dores[0];
    instrucaoModo = `\n\nINSTRUÇÃO (GERAÇÃO DE DOR): Você já tem contexto sobre este lead. Após responder à mensagem, traga organicamente o tema de "${dorAtual}" — mostrando que você entende o cenário dele especificamente. O objetivo é que ele sinta: "ela está falando exatamente da minha situação". Finalize com pergunta fechada que conduza ao agendamento.`;
  }

  const historico = (lead.mensagens || []).slice(-14).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const userContent = [ctx, horario, instrucaoObjecao, instrucaoAgendamento, instrucaoModo, '\n\nMENSAGEM DO CLIENTE:\n' + mensagemUsuario]
    .filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 460,
    system: SOFIA_SYSTEM,
    messages
  });

  let resposta = res.content[0].text;
  const agendou = resposta.includes('[REUNIAO_CONFIRMADA]');
  const cessarContato = resposta.includes('[CESSAR_CONTATO]');
  resposta = resposta.replace('[REUNIAO_CONFIRMADA]', '').replace('[CESSAR_CONTATO]', '').trim();

  // Determinar novo estágio
  const r = resposta.toLowerCase();
  let novoEstagio = estagioConv;
  if (agendou)                                                                    novoEstagio = 'confirmado';
  else if (r.match(/terça|quinta|qual dia|qual horário|agenda/))                  novoEstagio = 'agendamento';
  else if (objecao)                                                               novoEstagio = 'objecao';
  else if (r.match(/diagnóstico|cenário atual|patrimônio|investe|onde investe/))  novoEstagio = 'qualificacao';
  else if (r.match(/custo|risco|blindagem|proteção|exposto|vulnerável|perdendo/)) novoEstagio = 'conexao';

  return { resposta, novoEstagio, agendou, cessarContato, objecaoDetectada: objecao?.id || null };
}

// ─── Mensagem de reengajamento (4 meses) ──────────────────────────────────────

const REENG4M_SYSTEM = `Você é Sofia Mendes, secretária particular sênior do advisor Hariton Gomes (Altum Wealth).
Você está retomando contato com um cliente que demonstrou interesse anteriormente mas ficou sem responder.
SEMPRE mencione o contato anterior de forma respeitosa e natural — mostre que você lembra da conversa e que houve uma razão para esse novo contato agora.
Use um ângulo novo: uma mudança de mercado, uma nova oportunidade ou um insight relevante para o perfil dele.
Tom: caloroso, respeitoso, sem pressão. Máximo 2 parágrafos.
Se o cliente já disse que não quer contato, inclua [CESSAR_CONTATO] ao final.
Responda sempre em português brasileiro.`;

const INSIGHTS_REENG = {
  medico_cirurgiao:      'as recentes mudanças no CFM sobre responsabilidade civil e o aumento de 40% em ações contra médicos em 2024 tornaram a blindagem patrimonial ainda mais urgente',
  advogado_tributarista: 'a Receita Federal intensificou a fiscalização de offshores em 2025 — quem não regularizou a tempo já está pagando multas pesadas',
  ceo_empresario:        'o dólar subiu mais de 30% desde nossa última conversa — empresários com parte do patrimônio em moeda forte protegeram o poder de compra enquanto outros viram a carteira encolher',
  dentista_especialista: 'o mercado odontológico está consolidando muito rápido — dentistas que não têm um patrimônio organizado e protegido estão ficando para trás na corrida pela independência financeira',
  engenheiro_executivo:  'saiu um relatório sobre executivos com stock options: os que não tinham plano de diversificação perderam em média 35% do valor líquido quando as ações da empresa oscilaram'
};

async function gerarMensagemReengajamento4Meses(lead) {
  const insight = INSIGHTS_REENG[lead.nicho] || 'o mercado financeiro mudou muito nos últimos meses e há oportunidades relevantes para o seu perfil';
  const primeiroNome = lead.nome.split(' ')[0];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: REENG4M_SYSTEM,
    messages: [{
      role: 'user',
      content: `Gere uma mensagem de reengajamento para ${lead.nome}, ${lead.profissao || 'profissional'} em ${lead.cidade || 'Brasil'}.
Patrimônio estimado: ${lead.patrimonio || 'não informado'}.
Contexto do contato anterior: nos falamos há alguns meses e ${lead.nome.split(' ')[0]} demonstrou interesse mas não chegamos a marcar a conversa.
Novo gancho: ${insight}.
Referência ao contato anterior: mencione de forma natural que nos falamos anteriormente, sem ser invasivo.
Finalize com um convite suave para uma conversa diagnóstica de 15 min com o Hariton.`
    }]
  });

  return res.content[0].text;
}

module.exports = { gerarAbertura, responder, gerarMensagemReengajamento4Meses, detectarCessarContato, temInformacoesCompletas };
