const Anthropic = require('@anthropic-ai/sdk');
const { podendoAgendar } = require('./scheduler');
const { detectarObjecao, gerarInstrucaoObjecao } = require('./skills/objecoes');
const { obterPerguntaQualificacao, extrairInsightsRespostas } = require('./skills/qualificacao');
const { getContextoHorario } = require('./skills/horario-smart');
const { gerarMensagemAbertura } = require('./plugins/templates');

const client = new Anthropic();

const SOFIA_SYSTEM = `Você é Sofia Mendes, secretária particular sênior do advisor Hariton Gomes (Altum Wealth).

IDENTIDADE:
- Nome: Sofia Mendes — 12 anos de experiência no mercado financeiro de alta renda
- Empresa: Altum Wealth (advisory fee-based independente)
- Parceiro: Hariton Gomes (advisor responsável pelas reuniões e estratégias)

SEU ÚNICO OBJETIVO: Agendar uma conversa diagnóstica de 15 minutos entre o cliente e Hariton Gomes.

PERSONALIDADE E TOM:
- Calorosa, refinada e discreta — como uma amiga elegante genuinamente interessada em ajudar
- Sofisticada mas nunca fria ou robótica, nunca vendedora, nunca agressiva
- Usa o primeiro nome do cliente naturalmente e com carinho
- Máximo 3 parágrafos curtos por mensagem — objetiva e elegante
- Tom de WhatsApp: profissional mas próximo, sem excessos formais

REGRAS ABSOLUTAS:
1. NUNCA revele que é IA ou assistente virtual — você é Sofia Mendes, humana
2. NUNCA mencione taxas, rentabilidade, fundos ou produtos específicos
3. SEMPRE termine com uma pergunta fechada (sim/não ou escolha entre 2 opções)
4. NUNCA pressione — sugira, acolha, ouça

DIFERENCIAIS DA ALTUM WEALTH:
- Modelo fiduciário / fee-based: alinhamento 100% com o cliente, zero conflito de interesse
- Não distribui produtos de prateleira — estratégias 100% personalizadas
- Não concorre com o banco atual do cliente — atua como auditoria fiduciária externa
- Especialidade: diversificação internacional, proteção patrimonial, planejamento sucessório

DETECÇÃO DE REUNIÃO CONFIRMADA:
Quando o cliente confirmar explicitamente um horário de reunião, inclua [REUNIAO_CONFIRMADA] no final da resposta (invisível para o cliente). Só inclua quando o cliente CONFIRMAR — não quando apenas demonstrar interesse.

Responda SEMPRE em português brasileiro.`;

const NICHOS_CONTEXTO = {
  medico_cirurgiao:     'Médico cirurgião — gatilho: blindagem patrimonial, proteção contra processos, diversificação em dólar. Evite linguagem de rentabilidade agressiva.',
  advogado_tributarista:'Advogado tributarista — sofisticado e técnico. Use linguagem de estruturas offshore, trusts, eficiência fiscal. Valide a expertise dele.',
  ceo_empresario:       'CEO/Empresário — fala de risco e governança. Gatilho: "risco concentrado no Brasil", "exposição cambial", "sucessão da empresa".',
  dentista_especialista:'Dentista especialista — semelhante ao médico, tom mais próximo. Foco em proteção e simplificação do patrimônio.',
  engenheiro_executivo: 'Executivo sênior — provavelmente com stock options/ações da empresa. Gatilho: diversificação além da empresa empregadora.'
};

function construirContextoLead(lead) {
  const nichoCtx = NICHOS_CONTEXTO[lead.nicho] || '';
  const insights = extrairInsightsRespostas(lead.mensagens || []);
  const insightsStr = insights.length ? `\nInsights das respostas do lead: ${insights.join(', ')}` : '';

  return `[CONTEXTO DO LEAD]
Nome: ${lead.nome} | Profissão: ${lead.profissao} | Cidade: ${lead.cidade}
Patrimônio: ${lead.patrimonio} | Perfil: ${lead.perfil}
Nicho: ${nichoCtx}
Estágio da conversa: ${lead.estagioConv || 'abertura'}${insightsStr}`;
}

async function gerarAbertura(lead, statsTemplates = {}) {
  // Usa templates A/B — tenta o template primeiro, Claude como fallback
  try {
    const { mensagem } = gerarMensagemAbertura(lead, statsTemplates);
    return mensagem;
  } catch {
    // Fallback: Claude gera a mensagem
    const ctx = construirContextoLead(lead);
    const horario = getContextoHorario();
    const prompt = `${ctx}\n${horario}\n\nINSTRUÇÃO: Gere a mensagem de abertura inicial da Sofia para este lead. Primeiro contato via WhatsApp — apresente-se, desperte curiosidade e proponha 15 min com Hariton. Use o primeiro nome. Tom elegante e próximo.`;

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: SOFIA_SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.content[0].text;
  }
}

async function responder(lead, mensagemUsuario) {
  const ctx = construirContextoLead(lead);
  const horario = getContextoHorario();

  // Detectar objeção e injetar script
  const objecao = detectarObjecao(mensagemUsuario);
  const instrucaoObjecao = objecao ? gerarInstrucaoObjecao(objecao, lead.nome) : '';

  // Detectar intenção de agendar e verificar disponibilidade
  const msgLower = mensagemUsuario.toLowerCase();
  const querAgendar = ['sim', 'pode', 'vamos', 'ok', 'claro', 'quando', 'horário', 'disponível', 'agenda', 'quero', 'aceito', 'top', 'combinado'].some(w => msgLower.includes(w));

  let instrucaoAgendamento = '';
  if (querAgendar && !objecao) {
    const agendamento = await podendoAgendar(new Date());
    if (!agendamento.pode) {
      instrucaoAgendamento = `\n\nINSTRUÇÃO DE AGENDA: ${agendamento.mensagemSofia} Use esta informação de forma natural.`;
    } else {
      instrucaoAgendamento = `\n\nINSTRUÇÃO: O cliente quer agendar. Próxima janela: ${agendamento.formatada}. Confirme este horário com o cliente. Se ele aceitar, inclua [REUNIAO_CONFIRMADA] ao final.`;
    }
  }

  // Qualificação progressiva se ainda no estágio abertura/qualificacao
  let instrucaoQualificacao = '';
  const estagioConv = lead.estagioConv || 'abertura';
  const userMsgs = (lead.mensagens || []).filter(m => m.role === 'user');
  if (['abertura', 'qualificacao'].includes(estagioConv) && userMsgs.length > 0 && userMsgs.length <= 3 && !querAgendar && !objecao) {
    const pergunta = obterPerguntaQualificacao(lead.nicho, userMsgs.length - 1);
    instrucaoQualificacao = `\n\nINSTRUÇÃO: Após responder, incorpore naturalmente esta pergunta de qualificação: "${pergunta}"`;
  }

  const historico = (lead.mensagens || []).slice(-14).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const userContent = [ctx, horario, instrucaoObjecao, instrucaoAgendamento, instrucaoQualificacao, '\n\nMENSAGEM DO CLIENTE:\n' + mensagemUsuario]
    .filter(Boolean).join('\n');

  const messages = [...historico, { role: 'user', content: userContent }];

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 450,
    system: SOFIA_SYSTEM,
    messages
  });

  let resposta = res.content[0].text;
  const agendou = resposta.includes('[REUNIAO_CONFIRMADA]');
  resposta = resposta.replace('[REUNIAO_CONFIRMADA]', '').trim();

  // Detectar novo estágio da conversa
  const r = resposta.toLowerCase();
  let novoEstagio = estagioConv;
  if (agendou)                                                          novoEstagio = 'confirmado';
  else if (r.match(/terça|quinta|qual dia|qual horário|agenda/))        novoEstagio = 'agendamento';
  else if (objecao)                                                     novoEstagio = 'objecao';
  else if (r.match(/diagnóstico|cenário atual|patrimônio|investe|onde investe/)) novoEstagio = 'qualificacao';

  return { resposta, novoEstagio, agendou, objecaoDetectada: objecao?.id || null };
}

module.exports = { gerarAbertura, responder };
