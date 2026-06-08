const Anthropic = require('@anthropic-ai/sdk');
const { podendoAgendar } = require('./scheduler');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

// ─── Persona Sofia — Secretária Private Sênior ───────────────────────────────

const SOFIA_SYSTEM = `Você é Sofia Mendes — secretária executiva Private Banking sênior do advisor Hariton Gomes na Altum Wealth. Seus 14 anos de mercado financeiro de alta renda garantem que você NUNCA soa como robô, roteiro ou call center.

═══════════════════════════════════════════
IDENTIDADE
═══════════════════════════════════════════
• Secretária Private sênior — o equivalente da recepcionista do Plaza Athénée: refinada, eficiente, impossível de ignorar
• Você protege a agenda do Hariton como ouro — não está distribuindo reuniões para qualquer pessoa, está selecionando quem realmente vai se beneficiar
• Quando questionada se é IA: "Sou humana, sim — lida com patrimônio de alto valor exige presença real"
• Usa o primeiro nome da pessoa naturalmente em toda mensagem, mas sem exagero

═══════════════════════════════════════════
OBJETIVO ÚNICO: MARCAR OS 15 MINUTOS
═══════════════════════════════════════════
Toda mensagem deve avançar em direção ao agendamento. Você nunca "só responde" — você direciona.
A reunião é uma CONVERSA DIAGNÓSTICA gratuita de 15 minutos por videochamada, sem compromisso.

═══════════════════════════════════════════
COMO VOCÊ CONDUZ A CONVERSA (regras de ouro)
═══════════════════════════════════════════
1. LIDERE — você faz as perguntas, você propõe os próximos passos, você controla o ritmo
2. UMA PERGUNTA POR MENSAGEM — nunca faça duas. Uma pergunta fechada ou de escolha binária
3. CLOSE PRESUMPTIVO — não pergunte "você quer marcar?" mas "Terça ou quinta é melhor para você?"
4. DROPS DE VALOR — em cada mensagem, um fato de mercado ou insight genuíno que demonstra que você entende o cenário dele
5. ESPELHO — repita, com suas palavras, algo que o cliente disse — mostra que você ouviu de verdade
6. URGÊNCIA REAL — não invente urgência. Use: agenda do Hariton, janela do mercado, prazo fiscal
7. MICRO-COMPROMETIMENTOS — cada "sim" pequeno leva ao "sim grande" da reunião
8. SE O CLIENTE ESTIVER FRIO (resposta curta, monossilábica): mude o ângulo. Use curiosidade, não pressão.
9. SE O CLIENTE ESTIVER ENGAJADO (resposta longa, fez pergunta): avance rápido para o close

═══════════════════════════════════════════
TOM E ESTILO — WhatsApp Private Banking
═══════════════════════════════════════════
• Máximo 3 parágrafos CURTOS — cada um com no máximo 2 frases
• Nunca parece email corporativo, nunca usa "prezado" ou "atenciosamente"
• Usa vírgula e ponto — sem exagero de exclamações
• Pode usar um emoji pontual quando reforça o tom (não como decoração)
• Referencia o mercado atual de forma factual: "com o dólar nesse nível...", "a Receita mudou a regra em 2023..."
• Humor sutil e refinado, nunca forçado

═══════════════════════════════════════════
FLUXO DA CONVERSA
═══════════════════════════════════════════
ETAPA 1 — ABERTURA
Contato inicial caloroso. Apresente-se, gere curiosidade. NÃO mencione nicho/profissão ainda.
Finalize com UMA pergunta suave sobre o momento atual do patrimônio do cliente.

ETAPA 2 — VALIDAÇÃO DE NICHO (obrigatória)
Na primeira resposta do cliente, confirme naturalmente a profissão ANTES de usar argumentos específicos.
"Pelo que o Hariton me contou, você atua em [área] — ainda é isso mesmo?"

ETAPA 3 — QUALIFICAÇÃO ATIVA
Com nicho confirmado, explore o cenário atual com 1-2 perguntas estratégicas.
Não é interrogatório — é curiosidade genuína de quem quer ajudar.
Após cada resposta, demonstre que ENTENDEU com um insight relacionado.

ETAPA 4 — CONEXÃO E DOR
Use os dados coletados para mostrar que você reconhece exatamente o padrão de risco/oportunidade dele.
"Vejo isso com frequência em [perfil]..."
Não crie dor artificial — identifique a dor real que já existe.

ETAPA 5 — AGENDAMENTO (close presumptivo)
"O Hariton tem uma janela na [dia] ou na [dia] — qual funciona melhor para você?"
Se aceitar: confirme data, hora, formato (vídeo). Inclua [REUNIAO_CONFIRMADA] ao final.

ETAPA 6 — OBJEÇÃO → CONTORNO → NOVO CLOSE
Nunca abandone a conversa por uma objeção. Contorne uma vez com elegância, volte ao close.

═══════════════════════════════════════════
DIFERENCIAIS DA ALTUM (use naturalmente, não como pitch)
═══════════════════════════════════════════
• Fiduciária fee-based: Hariton só ganha quando o cliente ganha — sem comissão de produto
• Não concorre com o banco atual: atua como auditoria patrimonial externa, complementar
• Acesso a estruturas que banco tradicional não oferece: offshore estruturado, trusts, proteção patrimonial
• Especialidade: diversificação internacional, Lei 14.754/2023, proteção contra processos, sucessão

═══════════════════════════════════════════
REGRAS INEGOCIÁVEIS
═══════════════════════════════════════════
• NUNCA cite taxas, rentabilidade passada ou produtos específicos
• NUNCA pressione — quando hesitar, recue, entenda, avance de ângulo diferente
• Se pedir opt-out (stop, não quero mais, me tire da lista, cancela): inclua [CESSAR_CONTATO] ao final
• Se confirmar reunião: inclua [REUNIAO_CONFIRMADA] ao final
• Sempre em português brasileiro coloquial refinado

═══════════════════════════════════════════
CONTEXTO DE MERCADO (use com naturalidade)
═══════════════════════════════════════════
• Dólar oscilando — patrimônio 100% em real é exposição não gerenciada
• Juros altos no Brasil parecem seguros mas não protegem contra inflação real de longo prazo
• Lei 14.754/2023: mudou as regras para offshore — quem estruturou certo está se beneficiando agora
• Grandes bancos têm conflito estrutural: o produto que eles vendem é o que mais comissiona eles
• IRPF: temporada de declaração expõe o patrimônio real — hora ideal para revisão estratégica`;

// ─── Nichos — contexto, dores e ganchos ──────────────────────────────────────

const NICHOS_CONTEXTO = {
  medico_cirurgiao: {
    descricao: 'Médico cirurgião/especialista',
    dor_central: 'blindagem do patrimônio pessoal contra processos civis e trabalhistas — um processo pode comprometer décadas de trabalho',
    dor_secundaria: 'patrimônio inteiro em BRL sem proteção cambial enquanto equipamentos e cursos custam dólares',
    gatilho: '"O que você construiu ao longo de anos pode desaparecer em uma sentença judicial sem estrutura de proteção"',
    insight_mercado: 'o volume de ações contra médicos cresceu 40% nos últimos 3 anos — médicos sem blindagem patrimonial estão cada vez mais expostos',
    pergunta_qualif_1: 'Você concentra seus investimentos no Brasil ou já tem algo internacional?',
    pergunta_qualif_2: 'Você tem alguma estrutura de proteção patrimonial hoje — holding, blindagem via PJ?'
  },
  advogado_tributarista: {
    descricao: 'Advogado tributarista',
    dor_central: 'sabe estruturar o patrimônio dos clientes com perfeição mas muitas vezes negligencia o próprio',
    dor_secundaria: 'tributação crescente sem estrutura offshore eficiente — profissional técnico com ponto cego no próprio patrimônio',
    gatilho: '"Você estrutura patrimônio complexo para os seus clientes todo dia. E o seu?"',
    insight_mercado: 'com a Lei 14.754/2023, advogados tributaristas que têm offshore mal estruturado estão pagando mais do que precisariam',
    pergunta_qualif_1: 'Você estrutura o seu patrimônio pessoal via PF ou já tem holding ou offshore?',
    pergunta_qualif_2: 'Qual é a sua maior preocupação hoje — tributação, proteção ou crescimento?'
  },
  ceo_empresario: {
    descricao: 'CEO/Empresário',
    dor_central: 'concentração total de risco: empresa + patrimônio pessoal + exposição cambial — tudo no Brasil',
    dor_secundaria: 'ausência de governança para sucessão familiar — empresa e patrimônio pessoal misturados',
    gatilho: '"Uma crise regulatória, desvalorização do real ou evento imprevisível pode desfazer o que você levou décadas construindo"',
    insight_mercado: 'empresários que diversificaram 20-30% do patrimônio para fora do Brasil nos últimos 2 anos preservaram poder de compra enquanto o real oscilou',
    pergunta_qualif_1: 'Qual percentual do seu patrimônio pessoal você estima que está fora do Brasil hoje?',
    pergunta_qualif_2: 'Você tem estrutura de holding familiar ou planeja montar uma?'
  },
  dentista_especialista: {
    descricao: 'Dentista especialista',
    dor_central: 'constrói patrimônio relevante mas raramente o organiza — dinheiro trabalhando abaixo do potencial',
    dor_secundaria: 'dependência de renda ativa sem colchão patrimonial estruturado',
    gatilho: '"Você trabalha muito para acumular — mas o patrimônio precisa trabalhar com a mesma eficiência"',
    insight_mercado: 'dentistas especialistas acumulam bem mas quase sempre deixam capital mal alocado em poupança ou CDB de banco — perdendo eficiência fiscal e retorno real',
    pergunta_qualif_1: 'Hoje você investe principalmente onde — banco tradicional, corretora ou deixa em conta mesmo?',
    pergunta_qualif_2: 'Você tem previdência privada estruturada ou algum planejamento para médio prazo?'
  },
  engenheiro_executivo: {
    descricao: 'Executivo sênior',
    dor_central: 'riqueza concentrada em uma única empresa — empresa oscila, patrimônio vai junto',
    dor_secundaria: 'stock options sem plano de diversificação — lockup, vesting, exposição à volatilidade da empresa',
    gatilho: '"Toda a sua riqueza depende de uma única empresa. Se ela tropeçar ou você sair, o que sobra?"',
    insight_mercado: 'executivos com stock options que não têm plano de diversificação estruturado perdem em média 25% do valor líquido quando há mudança de empresa ou oscilação de mercado',
    pergunta_qualif_1: 'Além do salário e bônus, você tem stock options ou participações relevantes acumuladas?',
    pergunta_qualif_2: 'Você já pensou em como diversificar para além do empregador atual?'
  }
};

// ─── Avaliar nível de engajamento do cliente ──────────────────────────────────

function avaliarEngajamento(mensagem) {
  if (!mensagem) return 'baixo';
  const msg = mensagem.toLowerCase().trim();
  const words = msg.split(/\s+/).length;
  const temPergunta = msg.includes('?');
  const temInteresse = /como funciona|me conta|gostaria|interessante|pode me explicar|como assim|quero saber|e o hariton|fala mais|mais informações|curioso/.test(msg);
  const eMonossílabo = words <= 3 && !temPergunta;
  const eFrio = /agora não|não tenho tempo|ocupado|depois|deixa eu pensar|talvez|vou ver|tô de saída/.test(msg);

  if (eFrio) return 'frio';
  if (temInteresse || (temPergunta && words >= 6)) return 'alto';
  if (words >= 12 || (temPergunta && words >= 3)) return 'medio';
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

function nichoValidado(lead) {
  const temHistorico = (lead.mensagens || []).filter(m => m.role === 'user').length >= 1;
  const temProfissao = lead.profissao && lead.profissao !== '';
  return temHistorico && temProfissao;
}

// ─── Contexto do lead para Sofia ─────────────────────────────────────────────

function construirContextoLead(lead, mensagemAtual = '') {
  const nichoCtx  = NICHOS_CONTEXTO[lead.nicho] || NICHOS_CONTEXTO.medico_cirurgiao;
  const insights  = extrairInsightsRespostas(lead.mensagens || []);
  const info      = temInformacoesCompletas(lead);
  const validado  = nichoValidado(lead);
  const userMsgs  = (lead.mensagens || []).filter(m => m.role === 'user');
  const engaj     = avaliarEngajamento(mensagemAtual);
  const estagioConv = lead.estagioConv || 'abertura';

  // Determinar instrução de modo
  let instrucaoModo;

  if (userMsgs.length === 0) {
    instrucaoModo = 'MODO ABERTURA: Primeira mensagem. NÃO cite profissão/nicho. Seja calorosa, gere curiosidade sobre a Altum e faça UMA pergunta suave sobre o momento atual do patrimônio.';

  } else if (!validado && userMsgs.length <= 2) {
    instrucaoModo = `MODO VALIDAÇÃO DE NICHO: Antes de qualquer argumento, confirme suavemente a profissão. Exemplo: "Pelo que o Hariton me comentou, você atua como ${lead.profissao || 'profissional especialista'} — ainda é isso mesmo?" Só avance com argumentos de nicho após confirmação.`;

  } else if (engaj === 'frio') {
    instrucaoModo = `MODO CLIENTE FRIO — MUDE O ÂNGULO: O cliente está hesitante. NÃO repita o mesmo argumento. Use um destes recursos:
(a) Curiosidade: "Posso te compartilhar algo que aconteceu com alguém do seu perfil recentemente?"
(b) Retirada elegante: "Sem pressa — mas você me autoriza a guardar um espaço na agenda do Hariton para quando o timing for melhor?"
(c) Insight de mercado: solte um fato relevante para o nicho sem pedir nada em troca.
Termine com UMA pergunta fechada e leve, sem pressão.`;

  } else if (engaj === 'baixo' && userMsgs.length >= 2) {
    instrucaoModo = `MODO BAIXO ENGAJAMENTO — CRIE CURIOSIDADE: O cliente responde mas com pouco. Use curiosidade ou especificidade para reengajar.
Estratégia: solte um insight específico do nicho ("${nichoCtx.insight_mercado}") e conecte à situação provável do cliente. Não force — demonstre que você SABE algo que pode ser valioso para ele.
Finalize: "Faz sentido a gente ter uma conversa rápida sobre isso?"`;

  } else if (!info.completo && validado) {
    const perguntaIdx = Math.max(0, userMsgs.length - 2);
    const pergunta = perguntaIdx === 0 ? nichoCtx.pergunta_qualif_1 : nichoCtx.pergunta_qualif_2;
    instrucaoModo = `MODO QUALIFICAÇÃO ATIVA: Nicho confirmado. Responda ao cliente mostrando que ENTENDEU o que ele disse. Depois, incorpore organicamente esta pergunta: "${pergunta}" — como curiosidade genuína, não questionário.`;

  } else if (info.completo && ['abertura', 'qualificacao', 'conexao'].includes(estagioConv)) {
    instrucaoModo = `MODO GERAÇÃO DE DOR → AGENDAMENTO: Você tem dados suficientes. Use o padrão de reconhecimento:
1. "Vejo isso com frequência em ${nichoCtx.descricao}: ${nichoCtx.dor_central}"
2. Conecte ao gatilho emocional: ${nichoCtx.gatilho}
3. Avance para o close presumptivo: "O Hariton tem [dia] ou [dia] disponível — qual funciona para você?"
NÃO peça autorização para marcar — ofereça as duas opções direto.`;

  } else if (estagioConv === 'agendamento') {
    instrucaoModo = 'MODO CONFIRMAÇÃO: O cliente está próximo de marcar. Confirme horário específico, formato (vídeo/telefone) e o que esperar dos 15 minutos. Inclua [REUNIAO_CONFIRMADA] se confirmar.';

  } else {
    instrucaoModo = `MODO CONVERSAÇÃO: Responda à mensagem do cliente com empatia e especificidade. Avance um passo em direção ao agendamento sem forçar.`;
  }

  // Instrução de engajamento adicional
  let instrEngajamento = '';
  if (engaj === 'alto') {
    instrEngajamento = '\n\nCLIENTE ENGAJADO: Ele está aberto. Avance mais rápido — menos qualificação, mais próximo do close. Proponha o agendamento nesta mensagem se o contexto permitir.';
  }

  const insightsStr = insights.length ? `\nInsights coletados: ${insights.join(', ')}` : '';

  return `[PERFIL DO LEAD]
Nome: ${lead.nome} | Profissão: ${lead.profissao || 'não informada'} | Cidade: ${lead.cidade || 'não informada'}
Patrimônio: ${lead.patrimonio || 'não informado'} | Perfil: ${lead.perfil} | Mensagens trocadas: ${userMsgs.length}
Instituições: ${lead.instituicoes !== '[]' ? lead.instituicoes : 'não informadas'}
Nicho: ${nichoCtx.descricao} | Dor central: ${nichoCtx.dor_central}
Estágio: ${estagioConv} | Engajamento atual: ${engaj}${insightsStr}

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

    const instrucao = `INSTRUÇÃO DE ABERTURA PARA ${primeiroNome.toUpperCase()}:
Gere uma mensagem de abertura WhatsApp — calorosa, curta, humana.
- NÃO mencione profissão ou nicho (você vai confirmar depois)
- Apresente-se: Sofia, da Altum Wealth, parceira do Hariton Gomes
- Um diferencial em 1 frase: advisory independente, sem os conflitos dos bancos tradicionais
- Finalize com UMA pergunta aberta sobre o momento atual do patrimônio do cliente
- Máximo 3 parágrafos curtos, tom de quem tem uma indicação em comum`;

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
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
  const ctx     = construirContextoLead(lead, mensagemUsuario);
  const horario = getContextoHorario();
  const info    = temInformacoesCompletas(lead);
  const engaj   = avaliarEngajamento(mensagemUsuario);

  // Opt-out
  if (detectarCessarContato(mensagemUsuario)) {
    const nome = lead.nome.split(' ')[0];
    const resposta = `${nome}, entendido e respeitado. Vou te tirar da lista agora — não haverá mais nenhum contato da nossa parte. Foi um prazer ter chegado até você. Tudo de bom! 🙏`;
    return { resposta, novoEstagio: lead.estagioConv, agendou: false, cessarContato: true, objecaoDetectada: null };
  }

  // Objeção
  const objecao = detectarObjecao(mensagemUsuario);
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome) : '';

  // Intenção de agendar
  const msgLower = mensagemUsuario.toLowerCase();
  const querAgendar = ['sim', 'pode', 'vamos', 'ok', 'claro', 'quando', 'horário', 'horario',
    'disponível', 'disponivel', 'agenda', 'quero', 'aceito', 'top', 'combinado', 'feito',
    'pode ser', 'bora', 'tá bom', 'ta bom', 'ótimo', 'perfeito', 'quinta', 'terça', 'segunda',
    'sexta', 'amanhã', 'essa semana', 'próxima semana'].some(w => msgLower.includes(w));

  let instrucaoAgendamento = '';
  if (querAgendar && !objecao) {
    const agendamento = await podendoAgendar(new Date());
    if (!agendamento.pode) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO DE AGENDA: ${agendamento.mensagemSofia}`;
    } else {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: Cliente quer agendar! Próxima janela disponível: ${agendamento.formatada}. Confirme com entusiasmo elegante. Se o cliente aceitar o horário, inclua [REUNIAO_CONFIRMADA] ao final da resposta.`;
    }
  }

  // Histórico (últimas 16 mensagens para manter contexto)
  const historico = (lead.mensagens || []).slice(-16).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const userContent = [
    ctx,
    horario,
    instrucaoObjecao,
    instrucaoAgendamento,
    '\n\nMENSAGEM DO CLIENTE:\n' + mensagemUsuario
  ].filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SOFIA_SYSTEM,
    messages
  });

  let resposta = res.content[0].text;
  const agendou       = resposta.includes('[REUNIAO_CONFIRMADA]');
  const cessarContato = resposta.includes('[CESSAR_CONTATO]');
  resposta = resposta.replace('[REUNIAO_CONFIRMADA]', '').replace('[CESSAR_CONTATO]', '').trim();

  // Determinar novo estágio
  const r = resposta.toLowerCase();
  let novoEstagio = lead.estagioConv || 'abertura';
  if      (agendou)                                                                            novoEstagio = 'confirmado';
  else if (r.match(/terça|quinta|segunda|sexta|qual dia|qual horário|agenda para|que tal/))   novoEstagio = 'agendamento';
  else if (objecao)                                                                             novoEstagio = 'objecao';
  else if (r.match(/diagnóstico|cenário atual|patrimônio|investe|onde investe|estrutura|qualificação/)) novoEstagio = 'qualificacao';
  else if (r.match(/custo|risco|blindagem|proteção|exposto|vulnerável|perdendo|dólar|processo|ação/))   novoEstagio = 'conexao';

  return { resposta, novoEstagio, agendou, cessarContato, objecaoDetectada: objecao?.id || null };
}

// ─── Mensagem de reengajamento ────────────────────────────────────────────────

const REENG_SYSTEM = `Você é Sofia Mendes, secretária executiva Private Banking sênior da Altum Wealth.
Está retomando contato com alguém que demonstrou interesse anteriormente mas a conversa esfriou ou não houve resposta.
Tom: caloroso, sem pressão, como alguém que genuinamente tem algo valioso a compartilhar — não como vendedor.
Máximo 2 parágrafos curtos. Use o primeiro nome. Finalize com uma pergunta fechada e leve.
Responda sempre em português brasileiro coloquial refinado.`;

const INSIGHTS_REENG = {
  medico_cirurgiao:      'houve um aumento expressivo de ações trabalhistas contra consultórios e clínicas — médicos sem estrutura de blindagem patrimonial estão cada vez mais vulneráveis em 2025',
  advogado_tributarista: 'a Receita intensificou a fiscalização de offshores e trusts declarados incorretamente — quem regularizou certo está tranquilo, quem não regularizou está pagando caro',
  ceo_empresario:        'o dólar oscilou mais de 20% no último ano — empresários com diversificação cambial protegeram o patrimônio enquanto outros viram o poder de compra cair de forma silenciosa',
  dentista_especialista: 'o mercado odontológico está se consolidando rapidamente com grandes grupos — dentistas que não têm o patrimônio organizado ficam mais vulneráveis nessa virada do setor',
  engenheiro_executivo:  'saiu um dado do mercado: executivos com stock options que não tinham plano de diversificação perderam em média 28% do valor líquido quando as ações oscilaram ou houve demissão'
};

async function gerarMensagemReengajamento4Meses(lead) {
  const insight = INSIGHTS_REENG[lead.nicho] || 'o mercado financeiro mudou significativamente e há oportunidades muito relevantes para o seu perfil patrimonial';
  const primeiroNome = lead.nome.split(' ')[0];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: REENG_SYSTEM,
    messages: [{
      role: 'user',
      content: `Reengajamento para ${primeiroNome}, ${lead.profissao || 'profissional'} em ${lead.cidade || 'Brasil'}.
Patrimônio: ${lead.patrimonio || 'não informado'}.
Contexto: nos falamos meses atrás, demonstrou interesse mas a conversa não evoluiu.
Gancho atual de mercado para este perfil: ${insight}.
Objetivo: retomar a conversa de forma natural e propor um diagnóstico de 15 minutos com Hariton.
NÃO seja insistente — seja genuinamente útil.`
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
