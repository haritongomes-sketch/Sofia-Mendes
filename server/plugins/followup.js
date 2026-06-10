/**
 * Plugin: Cadência de Follow-up Ativa — Sofia Private Sênior
 *
 * Toque 1 (24h)   — Retomada calorosa + hook de curiosidade específico do nicho
 * Toque 2 (72h)   — Insight de mercado relevante para o nicho + convite
 * Toque 3 (7 dias) — Urgência contextual + close presumptivo
 * Toque 4 (14 dias) — Despedida elegante (mantém porta aberta)
 *
 * Cada toque usa ângulo diferente para não parecer spam.
 * Leads que respondem saem da cadência de follow-up e entram no fluxo normal.
 *
 * NOTA: estes 4 toques de WhatsApp são a parte AUTOMÁTICA da régua multicanal.
 * A régua completa (incluindo os toques manuais de LinkedIn/e-mail) é a fonte de
 * verdade em ./cadencia.js (REGUA) — os timings T1–T4 abaixo espelham aquela régua.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { sendWhatsApp } = require('../zapi');
const { NICHOS_CONTEXTO } = require('../sofia');

const client = new Anthropic();

// ─── System prompt para follow-ups ───────────────────────────────────────────

const FOLLOWUP_SYSTEM = `Você é Sofia Mendes — assessora executiva de Relações Institucionais & Private Wealth Management da Altum Wealth, representando o consultor sênior Hariton Andrade.
Postura de igual para igual, sofisticada e cirúrgica; gatilho de exclusividade e escassez de tempo. Nunca pergunta valores ("quanto você tem"); sinaliza padrão Private sem citar números.
Está fazendo um acompanhamento de alto impacto de uma mensagem anterior que não obteve resposta. Regra do "double-check de valor": quando fizer sentido, traga um insight curto e relevante ao segmento antes de propor o próximo passo.

REGRAS CRÍTICAS:
• Nunca mencione "follow-up", "não respondeu", "tentei contato" — seja natural
• Cada mensagem tem um ângulo DIFERENTE: curiosidade, insight de mercado, urgência, despedida
• Máximo 3 parágrafos muito curtos — WhatsApp, não e-mail
• Finalize com UMA pergunta fechada ou de escolha binária
• Tom: elegante, sem pressão, como alguém que genuinamente tem algo valioso a oferecer
• Nunca mention taxas, rentabilidade ou produtos específicos
• NUNCA use diminutivos ("minutinhos", "conversinha", "rapidinho", "perguntinha") — público sênior (CEO, médico, empresário): linguagem adulta e precisa ("15 minutos", "uma conversa")
• Sempre em português brasileiro coloquial refinado`;

// ─── Conteúdo por nicho para cada toque ──────────────────────────────────────

const CADENCIA_NICHO = {
  medico_cirurgiao: {
    t1_hook: 'uma cirurgiã de São Paulo me disse semana passada que só descobriu que estava exposta patrimonialmente quando um processo trabalhista chegou. Fez me pensar em você.',
    t2_insight: 'o volume de ações trabalhistas contra consultórios cresceu 40% nos últimos 3 anos. Médicos especialistas sem estrutura de proteção estão cada vez mais vulneráveis — e a maioria só percebe quando já é tarde.',
    t3_urgencia: 'o Hariton está fechando o calendário do próximo mês e tenho apenas 2 janelas abertas para diagnósticos. Você está no meu radar faz um tempo.',
    t4_despedida: 'respeito muito o tempo de cada pessoa e sei que o timing nem sempre é o certo. Vou deixar a porta aberta — se um dia quiser entender melhor como proteger o que você construiu, pode me chamar sem cerimônia.'
  },
  advogado_tributarista: {
    t1_hook: 'você estrutura patrimônio complexo para os seus clientes todo dia — e com maestria. Mas o seu próprio? Essa é a pergunta que o Hariton queria te fazer pessoalmente.',
    t2_insight: 'desde a Lei 14.754/2023, a Receita mudou as regras para offshore de pessoa física. Advogados tributaristas que têm estruturas antigas declaradas incorretamente estão pagando mais do que deveriam — ou pior, correndo risco fiscal.',
    t3_urgencia: 'o Hariton tem uma janela disponível essa semana que normalmente não abre para novos diagnósticos. Lembrei de você imediatamente.',
    t4_despedida: 'entendo que o dia a dia deixa pouco espaço para pensar no próprio patrimônio — você cuida do dos outros com tanta dedicação. Quando o momento for certo, a Altum está aqui.'
  },
  ceo_empresario: {
    t1_hook: 'um empresário que conheço me falou que sempre achou que tinha "tempo para diversificar depois" — até o real desvalorizar 18% em um ano. Me fez pensar em você.',
    t2_insight: 'empresários que moveram 20-30% do patrimônio para fora do Brasil nos últimos 2 anos preservaram poder de compra real enquanto o câmbio oscilava. Os que esperaram ainda estão esperando o momento certo.',
    t3_urgencia: 'o Hariton raramente abre agenda para diagnósticos novos em semanas cheias — mas tenho uma janela aberta agora e pensei em você especificamente.',
    t4_despedida: 'sei que o foco de quem constrói uma empresa raramente fica no patrimônio pessoal — a empresa consome tudo. Quando você quiser dar esse próximo passo, é só me chamar.'
  },
  dentista_especialista: {
    t1_hook: 'você trabalha muito para construir. A pergunta é: o seu patrimônio está trabalhando com a mesma eficiência para você? Era isso que o Hariton queria explorar contigo.',
    t2_insight: 'dentistas especialistas acumulam bem, mas quase sempre deixam capital em CDB de banco ou poupança — perdendo eficiência fiscal e retorno real. Com juros altos, a armadilha é exatamente essa: parece seguro mas não protege contra inflação real.',
    t3_urgencia: 'tenho uma janela no calendário do Hariton para esta semana — normalmente fica indisponível rápido. Você está no meu radar faz um tempo.',
    t4_despedida: 'respeito o timing de cada um. Se um dia quiser entender como fazer o que você construiu trabalhar com mais eficiência, pode me chamar — sem pressa e sem compromisso.'
  },
  engenheiro_executivo: {
    t1_hook: 'um executivo que conheço tinha 80% do patrimônio em ações da empresa onde trabalhava. Quando mudou de emprego, descobriu que não tinha como diversificar sem impacto fiscal enorme. Me lembrei de você.',
    t2_insight: 'executivos com stock options que não têm um plano de diversificação estruturado costumam perder valor quando há vesting, lockup ou mudança de empresa — às vezes 25-30% do valor líquido. O timing de diversificação importa muito mais do que a maioria percebe.',
    t3_urgencia: 'o Hariton está fechando a agenda do próximo mês — tenho apenas 2 janelas para diagnósticos. Pensei em você imediatamente.',
    t4_despedida: 'sei que executivos sênior raramente têm espaço para pensar no próprio patrimônio — a empresa e o cargo consomem tudo. Quando o momento for certo, a Altum está aqui para isso.'
  }
};

const NICHO_DEFAULT = {
  t1_hook: 'estava pensando no que o Hariton me contou sobre o seu perfil e queria compartilhar algo que pode ser relevante para você.',
  t2_insight: 'o cenário de mercado mudou muito nos últimos meses — juros, câmbio, novas regras fiscais. Quem tem patrimônio relevante e não reviu a estratégia pode estar deixando oportunidades passar.',
  t3_urgencia: 'o Hariton tem uma janela disponível essa semana para diagnósticos — normalmente não fica aberta por muito tempo. Pensei em você.',
  t4_despedida: 'respeito muito o tempo de cada pessoa. Se um dia quiser uma segunda opinião sobre o seu patrimônio sem compromisso, pode me chamar.'
};

// ─── Gerador de mensagem por toque ───────────────────────────────────────────

async function gerarMensagemFollowup(lead, toque) {
  const primeiroNome = lead.nome.split(' ')[0];
  const conteudo = CADENCIA_NICHO[lead.nicho] || NICHO_DEFAULT;
  const nichoCtx = NICHOS_CONTEXTO?.[lead.nicho];

  const prompts = {
    1: `Gere um follow-up TOQUE 1 para ${primeiroNome} (${lead.profissao || 'profissional'}, ${lead.cidade || 'Brasil'}).
ÂNGULO: Retomada calorosa com gancho de curiosidade — como se você estivesse genuinamente pensando nele.
GANCHO: "${conteudo.t1_hook}"
Adapte o gancho naturalmente. Finalize com: "Você teria 15 minutos essa semana para uma conversa com o Hariton?"
Máximo 3 parágrafos muito curtos. Não seja robótico.`,

    2: `Gere um follow-up TOQUE 2 para ${primeiroNome} (${lead.profissao || 'profissional'}).
ÂNGULO: Insight de mercado específico para o nicho — demonstra expertise e agrega valor sem pedir nada imediatamente.
INSIGHT: "${conteudo.t2_insight}"
Conecte o insight ao cenário provável do lead. Finalize com uma pergunta sobre disponibilidade — suave.
Máximo 2 parágrafos curtos.`,

    3: `Gere um follow-up TOQUE 3 para ${primeiroNome} (${lead.profissao || 'profissional'}).
ÂNGULO: Urgência genuína + close presumptivo — não inventada, baseada em agenda real.
URGÊNCIA: "${conteudo.t3_urgencia}"
Não force. Use close presumptivo: "Terça ou quinta ficaria melhor para você?"
Máximo 2 parágrafos muito curtos.`,

    4: `Gere um follow-up TOQUE 4 (ÚLTIMO) para ${primeiroNome} (${lead.profissao || 'profissional'}).
ÂNGULO: Despedida elegante — mantém a porta ABERTA sem pressão. Não é encerramento definitivo.
MENSAGEM BASE: "${conteudo.t4_despedida}"
Tom: respeito genuíno pelo tempo e timing dele. Deixe claro que a porta fica aberta.
Não mencione número de tentativas anteriores.
Máximo 2 parágrafos muito curtos.`
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: FOLLOWUP_SYSTEM,
    messages: [{ role: 'user', content: prompts[toque] || prompts[1] }]
  });

  return response.content[0].text;
}

// ─── Executar cadência de follow-up ──────────────────────────────────────────

async function executarFollowup(prisma) {
  const agora = new Date();

  // Janelas de tempo para cada toque
  const janelas = {
    1: { min: horasAtras(agora, 26), max: horasAtras(agora, 22) },  // 24h ± 2h
    2: { min: horasAtras(agora, 78), max: horasAtras(agora, 66) },  // 72h ± 6h
    3: { min: diasAtras(agora, 8),   max: diasAtras(agora, 6)   },  // 7d ± 1d
    4: { min: diasAtras(agora, 16),  max: diasAtras(agora, 12)  }   // 14d ± 2d
  };

  // Busca leads ativos sem cessarContato e sem reunião confirmada
  const leads = await prisma.lead.findMany({
    include: {
      mensagens: { orderBy: { timestamp: 'desc' }, take: 10 }
    },
    where: {
      estagio:       { notIn: ['confirmado', 'reuniao', 'cessado', 'sem_interesse'] },
      cessarContato: false
    }
  });

  let enviados = 0;

  for (const lead of leads) {
    const msgs = lead.mensagens;
    if (!msgs.length) continue;

    // Só envia follow-up se a última mensagem foi da Sofia (cliente não respondeu)
    const ultimaMsg  = msgs[0];
    const ultimaTs   = new Date(ultimaMsg.timestamp);
    const foiSofia   = ultimaMsg.role === 'assistant';
    if (!foiSofia) continue; // Cliente respondeu — sem follow-up

    // Determinar qual toque enviar com base no tempo decorrido
    let toque = null;
    for (const [t, janela] of Object.entries(janelas)) {
      if (ultimaTs >= janela.max && ultimaTs <= janela.min) {
        toque = parseInt(t);
        break;
      }
    }
    if (!toque) continue;

    // Verifica se já enviou este toque (evita duplicata)
    const tagToque = `followup_t${toque}`;
    const tags = parseTags(lead.tags);
    if (tags.includes(tagToque)) continue;

    // Toque 4 = despedida → marcar como baixa prioridade após envio
    const ehDespedida = toque === 4;

    try {
      console.log(`[Follow-up T${toque}] Preparando para ${lead.nome} (${lead.nicho}) | última msg: ${ultimaTs.toLocaleString('pt-BR')}`);

      const mensagem = await gerarMensagemFollowup(lead, toque);

      await prisma.mensagem.create({
        data: { leadId: lead.id, role: 'assistant', content: mensagem }
      });
      await sendWhatsApp(lead.whatsapp, mensagem);

      // Registra o toque enviado nas tags do lead
      const novasTags = [...tags.filter(t => t !== tagToque), tagToque];
      const updateData = {
        tags: JSON.stringify(novasTags),
        ultimaInteracao: agora
      };
      if (ehDespedida) {
        updateData.semInteresse = true;
        updateData.reengajarEm = new Date(agora.getTime() + 4 * 30 * 24 * 60 * 60 * 1000);
      }

      await prisma.lead.update({ where: { id: lead.id }, data: updateData });

      enviados++;
      console.log(`[Follow-up T${toque}] ✓ Enviado → ${lead.nome}`);

      // Espaçamento entre envios (anti-spam)
      await new Promise(r => setTimeout(r, 12000));
    } catch (err) {
      console.error(`[Follow-up T${toque}] Erro para ${lead.nome}:`, err.message);
    }
  }

  if (enviados > 0) console.log(`[Follow-up] ${enviados} mensagens enviadas`);
  return { enviados };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function horasAtras(ref, h) {
  return new Date(ref.getTime() - h * 60 * 60 * 1000);
}
function diasAtras(ref, d) {
  return new Date(ref.getTime() - d * 24 * 60 * 60 * 1000);
}
function parseTags(tagsJson) {
  try { return JSON.parse(tagsJson || '[]'); } catch { return []; }
}

module.exports = { executarFollowup };
