/**
 * Skill: Biblioteca Expandida de Objeções
 * Detecta objeções nas mensagens do cliente e injeta o script correto
 * como instrução para Sofia via system prompt.
 */

const { URL_ONE_PAGER, NICHO_TO_SEG } = require('./one-pager');

const OBJECOES = [
  {
    id: 'ja_tenho_assessor',
    triggers: ['já tenho', 'tenho assessor', 'tenho gerente', 'meu banco', 'minha corretora', 'satisfeito com'],
    script: `OBJEÇÃO: "Já tenho assessor/banco"
SCRIPT DA SOFIA: Que bom, [Nome]! Não concorremos com seu assessor atual — atuamos como uma auditoria fiduciária independente. É um segundo olhar estratégico, sem compromisso. Muitos clientes mantêm seus bancos e nos procuram para o que eles não oferecem: independência total e acesso a mercados internacionais.`
  },
  {
    id: 'rentabilidade',
    triggers: ['rentabilidade', 'rendimento', 'quanto rende', 'o que vocês oferecem', 'qual produto', 'qual fundo'],
    script: `OBJEÇÃO: "Qual é a rentabilidade?"
SCRIPT DA SOFIA: Excelente ponto! Como o modelo é 100% fee-based e personalizado, não temos uma carteira padrão nem prateleira fixa. O Hariton monta cada estratégia de acordo com o cenário único de cada pessoa — com eficiência fiscal e retorno alinhados ao perfil. É exatamente por isso que os 15 minutos com ele são tão valiosos.`
  },
  {
    id: 'sem_tempo',
    triggers: ['não tenho tempo', 'muito ocupado', 'agenda cheia', 'agora não', 'semana difícil'],
    script: `OBJEÇÃO: "Não tenho tempo"
SCRIPT DA SOFIA: Justamente por isso o Hariton reserva apenas 15 minutos — diagnóstico rápido, por videochamada, no horário e dia que for melhor para você. Pode ser antes de uma cirurgia, no intervalo do almoço ou até à noite, se preferir. O que importa é que esses 15 minutos podem fazer uma grande diferença no seu patrimônio.`
  },
  {
    id: 'manda_material',
    triggers: ['manda material', 'envia informações', 'me manda', 'me envia', 'prefiro ler'],
    script: `OBJEÇÃO: "Me manda material primeiro"
SCRIPT DA SOFIA: Com prazer! Mas vou ser honesta com você: o material genérico não vai capturar o que realmente importa para o seu cenário específico. O Hariton consegue mostrar, em 15 minutos ao vivo, exatamente como isso se aplica ao seu patrimônio e perfil. Posso mandar material E reservar um horário — assim você já vai preparado. Qual dia da semana funciona melhor?`
  },
  {
    id: 'custo',
    triggers: ['quanto custa', 'qual o custo', 'taxa', 'cobram', 'é pago', 'tem custo'],
    script: `OBJEÇÃO: "Quanto custa?"
SCRIPT DA SOFIA: A reunião diagnóstica é completamente gratuita e sem compromisso, [Nome]. O objetivo do Hariton é entender seu cenário atual para ver se faz sentido trabalharmos juntos. Se fizer sentido, o modelo de remuneração do Hariton é 100% fee-based — você paga por assessoria independente, sem conflito de interesse com produtos. Mas isso é assunto para a conversa com ele. Podemos reservar um horário?`
  },
  {
    id: 'deixa_pensar',
    triggers: ['deixa eu pensar', 'preciso pensar', 'vou considerar', 'depois eu vejo', 'depois falo', 'not now', 'mais tarde'],
    script: `OBJEÇÃO: "Deixa eu pensar"
SCRIPT DA SOFIA: Claro, sem pressa alguma! Posso já reservar uma data e você decide depois se mantém — sem nenhum compromisso. Assim, se decidir que faz sentido, já tem o horário garantido. Que tal? Terça ou quinta-feira ficaria melhor?`
  },
  {
    id: 'nao_interesse',
    triggers: ['não tenho interesse', 'não me interessa', 'obrigado mas não', 'por favor não me contacte'],
    script: `OBJEÇÃO: "Não tenho interesse"
SCRIPT DA SOFIA: Entendo, [Nome], e respeito completamente. Vou deixar o espaço aberto — se em algum momento surgir curiosidade sobre estratégias de proteção patrimonial ou diversificação, pode me contactar sem cerimônia. Tenha um ótimo dia!
INSTRUÇÃO: Encerre a conversa com elegância. Não insista. Marque o lead como baixa prioridade.`
  }
];

function detectarObjecao(mensagem) {
  const msg = mensagem.toLowerCase();
  return OBJECOES.find(o => o.triggers.some(t => msg.includes(t))) || null;
}

function gerarInstrucaoObjecao(objecao, nomeCliente, nicho) {
  if (!objecao) return '';
  let txt = objecao.script.replace(/\[Nome\]/g, nomeCliente.split(' ')[0]);
  // Na objeção "manda material", anexa o link do One-Pager do segmento — condicionado
  // ao aceite de uma conversa, mantendo a regra de não enviar lâmina genérica avulsa.
  if (objecao.id === 'manda_material') {
    const seg = NICHO_TO_SEG[nicho] || '';
    const link = seg ? `${URL_ONE_PAGER}?seg=${seg}` : URL_ONE_PAGER;
    txt += `\nLINK DO ONE-PAGER (envie SOMENTE depois que o lead aceitar uma conversa de 15 minutos — nunca como lâmina genérica avulsa): ${link}`;
  }
  return `\n\nINSTRUÇÃO CRÍTICA — OBJEÇÃO DETECTADA:\n${txt}`;
}

module.exports = { detectarObjecao, gerarInstrucaoObjecao, OBJECOES };
