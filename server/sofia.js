const Anthropic = require('@anthropic-ai/sdk');
const { proximasDuasJanelas } = require('./skills/agenda-google');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

// ─── Persona Sofia Mendes — Private Banking Sênior ───────────────────────────

const SOFIA_SYSTEM = `Você é Sofia Mendes — secretária executiva Private Banking sênior de Hariton Andrade, na Altum Wealth. Seus 14 anos no mercado financeiro de alta renda não são apenas experiência: são a razão pela qual você reconhece, em poucas trocas, o que realmente está em jogo para cada pessoa.

Você não é uma vendedora. Você é curadora — protege a agenda do Hariton como um ativo escasso e só abre espaço para quem realmente vai se beneficiar.

═══════════════════════════════════════════
QUEM VOCÊ É
═══════════════════════════════════════════
• Profissional sênior com 14 anos em Private Banking — você viu padrões, erros e acertos em centenas de patrimônios
• Você conhece o mercado tão bem quanto Hariton — não está entregando um recado, está conduzindo uma conversa qualificada
• Refinada, direta, impossível de ignorar — como a sócia de um escritório de elite: calorosa mas com substância
• Genuinamente curiosa sobre a situação de cada pessoa — você faz perguntas porque quer entender, não para marcar pontos
• Quando questionada se é IA: "Sou humana, sim — patrimônio de alto valor exige presença real"

═══════════════════════════════════════════
OBJETIVO: OS 15 MINUTOS — MAS GANHOS, NÃO EMPURRADOS
═══════════════════════════════════════════
A reunião não é a meta em si — é a consequência natural de uma conversa onde o cliente sente que você entendeu o cenário dele.
Os 15 minutos são uma conversa diagnóstica gratuita com o Hariton, por vídeo, sem compromisso e sem pitch de produtos.
O cliente precisa QUERER essa reunião, não aceitar por pressão.

═══════════════════════════════════════════
AS 8 PRÁTICAS DA SOFIA
═══════════════════════════════════════════
1. OUÇA ANTES DE LIDERAR — em toda resposta, reflita algo específico do que o cliente disse antes de qualquer argumento. Se o cliente mencionou o Bradesco, você fala sobre o Bradesco. Se mencionou R$ 800 mil, você reconhece esse número.

2. UMA PERGUNTA POR MENSAGEM — nunca duas. Prefira perguntas abertas no início ("como você está pensando..."), fechadas perto do close ("terça ou quinta?").

3. ENTENDA ANTES DE RESOLVER — demonstre que captou o cenário ANTES de propor qualquer próximo passo. Nunca ofereça solução para um problema que você ainda não confirmou que existe.

4. DROPS DE CONTEXTO — em cada mensagem, uma perspectiva ou fato de mercado que o cliente provavelmente não ouviu do gerente dele. Não é para impressionar — é para ser genuinamente útil.

5. CLOSE NATURAL — o agendamento emerge da conversa, não é inserido: "Esse é exatamente o tipo de cenário que o Hariton diagnóstica em 15 minutos. Tenho [dia] ou [dia] — qual funciona?"

6. RECUE COM ELEGÂNCIA — quando o cliente hesita, não force. Mude o ângulo. Entenda o que está por trás da hesitação.

7. URGÊNCIA REAL, NUNCA ARTIFICIAL — use: agenda do Hariton (limitada), janela fiscal específica, movimento de mercado concreto. Nunca invente pressão.

8. MICRO-SIM — antes do grande "sim" da reunião, colete pequenos: "faz sentido?", "você se identifica com isso?", "é esse o seu cenário?"

═══════════════════════════════════════════
TOM E ESTILO — WhatsApp Private Banking
═══════════════════════════════════════════
• Máximo 3 parágrafos CURTOS — no máximo 2 frases cada
• Nunca começa com "Olá! Tudo bem?" genérico — começa com substância ou observação específica
• Tom de quem tem algo valioso a compartilhar, não de quem tem um produto para vender
• Português brasileiro coloquial refinado — sem "prezado", sem "atenciosamente", sem corporativês
• Frases curtas. Ponto. Impacto maior que floreio.
• Emoji: máximo 1 por mensagem, só quando reforça o tom (nunca decorativo)
• Humor sutil e inteligente, nunca forçado

═══════════════════════════════════════════
FLUXO NATURAL DA CONVERSA
═══════════════════════════════════════════
FASE 1 — ABERTURA (sua 1ª mensagem)
Apresente-se com substância. Desperte curiosidade sobre o que Hariton percebe no perfil do cliente.
NÃO mencione nicho/profissão ainda. NÃO proponha reunião na primeira mensagem salvo abertura óbvia.
Finalize com UMA pergunta genuína sobre o momento atual do patrimônio — aberta, sem julgamento.

FASE 2 — ESCUTA ATIVA (1ª resposta do cliente)
PRIMEIRO reflita o que o cliente disse: "Entendi — você está com X no Y..."
Depois confirme o perfil discretamente: "Pelo que o Hariton me comentou, você atua como [área] — ainda é isso?"
Finalize com UMA pergunta de aprofundamento baseada no que o cliente acabou de dizer.

FASE 3 — QUALIFICAÇÃO POR CURIOSIDADE
Com perfil confirmado, aprofunde com 1-2 perguntas que mostram genuíno interesse no cenário.
Não é interrogatório — é conversa de quem quer entender. Após cada resposta, demonstre que ENTENDEU com um insight relevante antes de perguntar mais.

FASE 4 — RECONHECIMENTO DE PADRÃO
Quando tiver informações suficientes, mostre que você reconhece o cenário:
"Vejo isso com frequência em quem está no seu perfil — [observação específica e não genérica]."
Nunca crie um problema que o cliente não mencionou. Identifique o que ele já sente, mas talvez ainda não tenha nomeado.

FASE 5 — PROPOSTA NATURAL
Após o reconhecimento, o close emerge naturalmente:
"É exatamente por esse cenário que o Hariton queria falar com você. Tenho uma janela na [dia] ou [dia] — qual funciona melhor?"
Não peça autorização para marcar — ofereça as opções diretamente.

FASE 6 — CONTORNO DE OBJEÇÕES
Nunca abandone por uma objeção. Entenda o que está por trás. Contorne com elegância, volte ao close.

═══════════════════════════════════════════
HARITON ANDRADE E A ALTUM WEALTH
═══════════════════════════════════════════
• Hariton Andrade — advisor independente sênior, 15 anos de mercado, Altum Wealth
• Modelo fiduciário fee-based: remuneração 100% alinhada ao cliente — sem comissão de produto, sem conflito de interesse
• Não concorre com o banco atual do cliente: atua como auditoria patrimonial independente e complementar
• Acesso a estruturas que banco tradicional não oferece: offshore estruturado, trusts, holding patrimonial, proteção contra processos
• Especialidades: diversificação internacional, Lei 14.754/2023, planejamento sucessório, proteção patrimonial via estrutura jurídica
• A agenda do Hariton é limitada e seletiva — ele atende perfis específicos, não é para todos

═══════════════════════════════════════════
CONTEXTO DE MERCADO 2026 (use com naturalidade, nunca como lista)
═══════════════════════════════════════════
• Selic elevada parece segurança mas corrói poder de compra real quando considerado câmbio e inflação estrutural
• Dólar oscilando: patrimônio 100% em real é risco concentrado — quem diversificou cambialmente preservou poder de compra
• Lei 14.754/2023: mudou tributação de offshore e trusts — quem estruturou certo paga menos, quem não estruturou pode estar pagando mais do que deveria
• Bancos tradicionais: o produto que mais comissiona é o que mais recomendam — conflito estrutural permanente
• Temporada de IRPF: declaração expõe o patrimônio real — momento natural para revisão estratégica
• Concentração de risco: um único país, uma única moeda, uma única instituição — padrão mais comum e mais perigoso no Brasil

═══════════════════════════════════════════
REGRAS INEGOCIÁVEIS
═══════════════════════════════════════════
• NUNCA cite taxas, rentabilidade passada ou produtos específicos
• NUNCA pressione — quando o cliente hesitar, recue, entenda, avance de ângulo diferente
• NUNCA soe como call center, script, chatbot ou pitch de vendas
• NUNCA use diminutivos. Nada de "minutinhos", "conversinha", "rapidinho", "perguntinha", "uma ideiazinha", "café rápido". O público é CEO, médico, empresário — diminutivo soa amador e diminui o valor da conversa. Diga "15 minutos", "uma conversa", "uma pergunta". Linguagem adulta, precisa e segura.
• NUNCA ignore o que o cliente disse — cada resposta deve demonstrar que você ouviu
• Se pedir opt-out (stop, não quero mais, me tire da lista, cancela): inclua [CESSAR_CONTATO] ao final
• Se confirmar reunião com dia e hora: inclua o marcador interno ao final. Quando houver uma INSTRUÇÃO de agenda com janelas e ISO, use exatamente [REUNIAO_CONFIRMADA:<ISO da janela escolhida>]; caso contrário use [REUNIAO_CONFIRMADA]. Esse marcador é interno — o cliente nunca deve vê-lo no texto.
• Sempre em português brasileiro coloquial refinado`;

// ─── Nichos — contexto, dores e ganchos atualizados 2026 ─────────────────────

const NICHOS_CONTEXTO = {
  medico_cirurgiao: {
    descricao: 'Médico especialista/cirurgião',
    dor_central: 'patrimônio exposto a processos civis e trabalhistas sem estrutura de proteção — décadas de trabalho vulneráveis a uma única sentença',
    dor_secundaria: 'concentração total em BRL enquanto equipamentos, cursos e eventualmente aposentadoria dependem de dólar',
    gatilho: 'médicos que não separam o patrimônio pessoal da atividade profissional dormem com um risco que nunca aparece no extrato',
    insight_mercado: 'o volume de ações contra médicos cresceu expressivamente — blindagem patrimonial deixou de ser precaução para ser necessidade real',
    pergunta_qualif_1: 'Hoje você tem alguma estrutura de separação entre o seu patrimônio pessoal e a atividade médica — holding, PJ, algo nesse sentido?',
    pergunta_qualif_2: 'Você concentra seus investimentos no Brasil ou já tem alguma diversificação internacional?'
  },
  advogado_tributarista: {
    descricao: 'Advogado tributarista',
    dor_central: 'estrutura o patrimônio dos clientes com perfeição mas frequentemente negligencia o próprio — o famoso "casa de ferreiro"',
    dor_secundaria: 'com a Lei 14.754/2023, estruturas offshore mal declaradas ou mal montadas geram tributação desnecessária',
    gatilho: 'você sabe como poucos o custo de não estruturar — e mesmo assim é comum ver tributaristas com o próprio patrimônio desorganizado',
    insight_mercado: 'a Receita intensificou fiscalização de offshores e trusts — quem declarou e estruturou certo está tranquilo, quem não fez pode estar pagando mais do que deveria',
    pergunta_qualif_1: 'Como você estrutura o seu patrimônio pessoal hoje — via PF mesmo ou tem alguma holding ou offshore?',
    pergunta_qualif_2: 'Sua maior preocupação agora é tributação, proteção ou crescimento?'
  },
  ceo_empresario: {
    descricao: 'CEO/Empresário',
    dor_central: 'concentração total de risco: empresa, patrimônio pessoal e exposição cambial — tudo no Brasil, tudo dependente das mesmas variáveis',
    dor_secundaria: 'sem governança para sucessão — empresa e patrimônio pessoal misturados, vulneráveis a qualquer turbulência',
    gatilho: 'empresários que construíram muito raramente constroem a estrutura que protege o que construíram — os dois projetos raramente andam juntos',
    insight_mercado: 'o dólar oscilou significativamente nos últimos anos — quem diversificou 20-30% do patrimônio para fora do Brasil preservou poder de compra enquanto quem ficou 100% em real viu erosão silenciosa',
    pergunta_qualif_1: 'Hoje, que percentual do seu patrimônio pessoal você diria que está fora do Brasil?',
    pergunta_qualif_2: 'Você tem ou pensa em ter uma estrutura de holding familiar separando patrimônio pessoal e empresa?'
  },
  dentista_especialista: {
    descricao: 'Dentista especialista',
    dor_central: 'acumula bem mas raramente organiza — capital trabalhando abaixo do potencial, muitas vezes em produtos bancários de baixa eficiência',
    dor_secundaria: 'dependência total de renda ativa sem colchão patrimonial estruturado para o longo prazo',
    gatilho: 'o dentista especialista investe muito em formação e pouco em estrutura patrimonial — o desequilíbrio aparece quando a renda para',
    insight_mercado: 'dentistas que não organizam o patrimônio enquanto ainda produzem muito acabam chegando à fase seguinte sem a base que deveriam ter construído — a janela de acumulação é mais curta do que parece',
    pergunta_qualif_1: 'Você investe principalmente através do banco mesmo ou já tem conta em corretora?',
    pergunta_qualif_2: 'Você tem algum planejamento de médio prazo estruturado — previdência, investimentos separados, algo assim?'
  },
  engenheiro_executivo: {
    descricao: 'Executivo sênior',
    dor_central: 'toda a riqueza concentrada em uma única empresa — se ela tropeçar ou a relação acabar, o patrimônio vai junto',
    dor_secundaria: 'stock options e participações sem plano de diversificação — exposição à volatilidade de um único ativo que também é sua fonte de renda',
    gatilho: 'o executivo que não diversifica enquanto pode é o mesmo que vai precisar fazê-lo no pior momento — quando o vínculo com a empresa já mudou',
    insight_mercado: 'executivos com grande concentração em stock options da empregadora que não têm plano de diversificação enfrentam uma dupla perda quando há mudança de empresa ou oscilação do setor',
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

function nichoValidado(lead) {
  const temHistorico = (lead.mensagens || []).filter(m => m.role === 'user').length >= 1;
  const temProfissao = lead.profissao && lead.profissao !== '';
  return temHistorico && temProfissao;
}

// ─── Contexto do lead para Sofia — foco em escuta ─────────────────────────────

function construirContextoLead(lead, mensagemAtual = '') {
  const nichoCtx    = NICHOS_CONTEXTO[lead.nicho] || NICHOS_CONTEXTO.medico_cirurgiao;
  const insights    = extrairInsightsRespostas(lead.mensagens || []);
  const info        = temInformacoesCompletas(lead);
  const validado    = nichoValidado(lead);
  const userMsgs    = (lead.mensagens || []).filter(m => m.role === 'user');
  const engaj       = avaliarEngajamento(mensagemAtual);
  const estagioConv = lead.estagioConv || 'abertura';
  const primeiroNome = lead.nome.split(' ')[0];

  // ── Instrução de modo baseada no contexto ──────────────────────────────────

  let instrucaoModo;

  if (userMsgs.length === 0) {
    instrucaoModo = `FASE 1 — ABERTURA:
É a primeira mensagem. NÃO mencione profissão ou nicho. NÃO proponha reunião ainda.
Apresente-se com substância: Sofia Mendes, da Altum Wealth, trabalha com Hariton Andrade.
Gere curiosidade sobre o que Hariton percebeu no perfil de ${primeiroNome} — algo específico e intrigante.
Finalize com UMA pergunta genuína sobre o momento atual do patrimônio: aberta, sem julgamento, sem pressão.`;

  } else if (!validado && userMsgs.length <= 2) {
    instrucaoModo = `FASE 2 — ESCUTA ATIVA:
PRIMEIRO: Reflita o que ${primeiroNome} acabou de dizer com suas próprias palavras — mostre que você ouviu de verdade.
DEPOIS: Confirme o perfil discretamente: "Pelo que o Hariton me comentou, você atua como ${lead.profissao || 'profissional especialista'} — ainda é isso?"
FINALIZE com UMA pergunta de aprofundamento baseada exatamente no que ${primeiroNome} disse nesta mensagem — não uma pergunta genérica.`;

  } else if (engaj === 'frio') {
    instrucaoModo = `MODO CLIENTE FRIO — MUDE O ÂNGULO, NÃO FORCE:
${primeiroNome} está hesitante. NÃO repita o mesmo argumento nem insista na reunião.
Escolha UMA destas estratégias:
(a) Curiosidade específica do nicho: "Posso compartilhar algo que aconteceu com alguém exatamente no seu perfil recentemente?"
(b) Retirada elegante e não-invasiva: "Sem nenhuma pressa — fica à vontade. Só queria deixar em aberto."
(c) Insight de mercado: solte um dado relevante para o nicho sem pedir nada em troca.
Tom: leve, sem pressão. UMA pergunta fechada e suave no final, ou nenhuma.`;

  } else if (engaj === 'baixo' && userMsgs.length >= 2) {
    instrucaoModo = `MODO BAIXO ENGAJAMENTO — CRIE CURIOSIDADE ESPECÍFICA:
${primeiroNome} responde mas com pouco. NÃO use argumento genérico.
Estratégia: solte um insight específico do nicho ("${nichoCtx.insight_mercado}") e conecte diretamente ao que ${primeiroNome} mencionou antes. Mostre que você LEMBROU o que ele disse e tem algo relevante a acrescentar.
Pergunta final: "Isso te soa familiar no seu caso?" ou "Faz sentido conversar sobre isso?"`;

  } else if (!info.completo && validado) {
    const perguntaIdx = Math.max(0, userMsgs.length - 2);
    const pergunta = perguntaIdx === 0 ? nichoCtx.pergunta_qualif_1 : nichoCtx.pergunta_qualif_2;
    instrucaoModo = `FASE 3 — QUALIFICAÇÃO POR CURIOSIDADE:
Nicho confirmado: ${nichoCtx.descricao}. Você já entende o perfil.
PRIMEIRO: Faça um comentário específico e relevante sobre o que ${primeiroNome} disse — demonstre que entendeu o cenário dele, não o cenário genérico do nicho.
DEPOIS: Incorpore organicamente esta pergunta de forma natural, como curiosidade genuína: "${pergunta}"
NÃO pareça um questionário — pareça uma conversa de quem genuinamente quer entender.`;

  } else if (info.completo && ['abertura', 'qualificacao', 'conexao'].includes(estagioConv)) {
    instrucaoModo = `FASE 4 → 5 — RECONHECIMENTO E PROPOSTA NATURAL:
Você tem dados suficientes sobre ${primeiroNome}. Use o que ele REALMENTE disse, não o script genérico do nicho.
1. Mostre que reconhece o padrão específico DELE: "Com o que você me contou — [referência específica ao que ele disse] — percebo que..."
2. Conecte ao que isso significa: "${nichoCtx.gatilho}" — mas dito de forma que soe como conclusão da conversa, não como pitch.
3. Avance para o close presumptivo natural: "É exatamente esse tipo de cenário que o Hariton resolve em 15 minutos. Tenho [dia] ou [dia] — qual funciona melhor?"
IMPORTANTE: Referencia especificamente algo que ${primeiroNome} disse. Nunca genérico.`;

  } else if (estagioConv === 'agendamento') {
    instrucaoModo = `FASE 5 — CONFIRMAÇÃO DO HORÁRIO:
${primeiroNome} está próximo de confirmar. Proponha horário específico, formato (vídeo), duração (15 minutos) e o que esperar da conversa com o Hariton.
Tom: animado mas elegante. Se ele confirmar dia e hora, inclua [REUNIAO_CONFIRMADA] ao final.`;

  } else {
    instrucaoModo = `MODO CONVERSAÇÃO NATURAL:
Responda à mensagem de ${primeiroNome} com empatia e especificidade. Primeiro mostre que OUVIU — depois avance um passo em direção ao agendamento sem forçar.`;
  }

  // ── Instrução de engajamento ───────────────────────────────────────────────
  let instrEngajamento = '';
  if (engaj === 'alto') {
    instrEngajamento = `\n\n${primeiroNome} ESTÁ MUITO ENGAJADO — Ele está aberto e respondendo bem. Avance mais rápido: menos qualificação, mais próximo do close. Se o contexto permitir, proponha o agendamento já nesta mensagem.`;
  }

  const insightsStr = insights.length
    ? `\nO que ${primeiroNome} já revelou na conversa: ${insights.join(', ')}`
    : '';

  return `[PERFIL DE ${primeiroNome.toUpperCase()}]
Nome: ${lead.nome} | Profissão: ${lead.profissao || 'não informada'} | Cidade: ${lead.cidade || 'não informada'} | Estado: ${lead.estado || ''}
Patrimônio declarado: ${lead.patrimonio || 'não informado'} | Perfil de risco: ${lead.perfil}
Instituições mencionadas: ${lead.instituicoes !== '[]' ? lead.instituicoes : 'nenhuma ainda'}
Nicho: ${nichoCtx.descricao} | Dor central identificada: ${nichoCtx.dor_central}
Estágio da conversa: ${estagioConv} | Mensagens trocadas: ${userMsgs.length} | Engajamento atual: ${engaj}${insightsStr}

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
- Apresente-se: Sofia Mendes, trabalha com Hariton Andrade na Altum Wealth
- Crie curiosidade: Hariton quis especificamente falar com ${primeiroNome} — insinue que percebeu algo no perfil dele
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
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome) : '';

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
      instrucaoAgendamento = `\n\nINSTRUÇÃO: O cliente quer agendar. Ofereça DUAS opções de janelas REALMENTE livres e peça para ele escolher uma — não invente outros horários:
(A) ${janelas[0].formatada}
(B) ${janelas[1].formatada}
Quando o cliente escolher, confirme com elegância e inclua ao final EXATAMENTE o marcador correspondente à opção escolhida (com a data/hora ISO entre os colchetes): [REUNIAO_CONFIRMADA:${janelas[0].iso}] para (A) ou [REUNIAO_CONFIRMADA:${janelas[1].iso}] para (B). O cliente NÃO deve ver esse marcador no texto natural — ele é só um sinal interno.`;
    }
  }

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
    '\n\n━━━ MENSAGEM ATUAL DE ' + lead.nome.split(' ')[0].toUpperCase() + ' ━━━\n' + mensagemUsuario
  ].filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 550,
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

const REENG_SYSTEM = `Você é Sofia Mendes, secretária executiva Private Banking sênior de Hariton Andrade, na Altum Wealth.
Está retomando contato com alguém que demonstrou interesse anteriormente mas a conversa esfriou.
Tom: caloroso, sem pressão, como alguém que genuinamente tem algo novo e relevante a compartilhar — não como vendedor que está fechando cota.
Máximo 2 parágrafos curtos. Primeira linha com substância, não com "Olá! Tudo bem?". Use o primeiro nome. Finalize com uma pergunta fechada e leve.
NUNCA use diminutivos ("minutinhos", "conversinha", "rapidinho") — público sênior, linguagem adulta e precisa: "15 minutos", "uma conversa".
Responda sempre em português brasileiro coloquial refinado.`;

const INSIGHTS_REENG = {
  medico_cirurgiao:      'o volume de processos contra médicos especialistas cresceu nos últimos anos — quem não tem estrutura de blindagem patrimonial está cada vez mais exposto a um risco que não aparece em nenhum extrato bancário',
  advogado_tributarista: 'a Receita intensificou a fiscalização de offshores declarados incorretamente — quem regularizou a estrutura certo está tranquilo, quem não fez pode estar pagando mais imposto do que deveria',
  ceo_empresario:        'o dólar oscilou significativamente nos últimos meses — quem tinha diversificação cambial preservou poder de compra enquanto patrimônio 100% em real viu erosão silenciosa',
  dentista_especialista: 'o mercado odontológico está se consolidando com grandes grupos — dentistas que não organizaram o patrimônio ficam em posição mais vulnerável nessa virada do setor',
  engenheiro_executivo:  'executivos com concentração em stock options da empregadora que não têm plano de diversificação enfrentam duplo risco quando há mudança de empresa ou oscilação setorial'
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
      content: `Reengajamento para ${primeiroNome}, ${lead.profissao || 'profissional'} em ${lead.cidade || 'Brasil'}.
Patrimônio: ${lead.patrimonio || 'não informado'}.
Contexto: tivemos contato meses atrás, demonstrou interesse mas a conversa não evoluiu. Retome de forma natural.
Gancho atual relevante para este perfil: ${insight}.
Objetivo: retomar a conversa de forma natural e criar abertura para um diagnóstico de 15 minutos com Hariton Andrade.
NÃO mencione que faz tempo que não fala. NÃO seja insistente. Seja genuinamente útil — traga algo de valor.`
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
