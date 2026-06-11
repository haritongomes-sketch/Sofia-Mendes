/**
 * Skill: Biblioteca de Objeções (scripts do Hariton)
 * Detecta objeções na mensagem do cliente e injeta o script correto como
 * instrução para a Sofia. Empresa = Wealth. Sempre fecha puxando o agendamento.
 */

const { URL_ONE_PAGER, NICHO_TO_SEG } = require('./one-pager');

const OBJECOES = [
  {
    id: 'ja_tenho_assessor',
    triggers: ['já tenho', 'tenho assessor', 'tenho gerente', 'meu banco', 'minha corretora', 'satisfeito com'],
    script: `OBJEÇÃO: "Já tenho assessor / banco / corretora e estou satisfeito"
RESPONDA assim: Que ótimo, [Nome]! A Wealth não concorre com a sua instituição atual. A gente atua como uma auditoria fiduciária independente, um segundo parecer estratégico, sem nenhum compromisso. Vale conhecer o modelo com o Hariton nessa conversa rápida. Terça ou quinta fica melhor?`
  },
  {
    id: 'rentabilidade',
    triggers: ['rentabilidade', 'rendimento', 'quanto rende', 'o que vocês oferecem', 'qual produto', 'qual fundo'],
    script: `OBJEÇÃO: "Qual é a rentabilidade de vocês? O que oferecem?"
RESPONDA assim: Excelente ponto, [Nome]. Como a gente atua no modelo fiduciário independente, não tem prateleira fixa. O Hariton monta cada estratégia de forma personalizada, com eficiência fiscal e retorno alinhados ao seu cenário, livre de conflito de interesse. É exatamente por isso que essa conversa de 15 minutos é tão valiosa. Qual dia funciona pra você?`
  },
  {
    id: 'sem_tempo',
    triggers: ['não tenho tempo', 'muito ocupado', 'agenda cheia', 'agora não', 'semana difícil'],
    script: `OBJEÇÃO: "Não tenho tempo agora"
RESPONDA assim: Justamente por isso o Hariton reserva só 15 minutos, [Nome]. Um diagnóstico rápido, sem compromisso, por videochamada, no horário que for melhor pra você. Posso ver a agenda dele. Terça ou quinta-feira?`
  },
  {
    id: 'manda_material',
    triggers: ['manda material', 'envia informações', 'me manda', 'me envia', 'prefiro ler'],
    script: `OBJEÇÃO: "Me manda um material antes"
RESPONDA assim: Com prazer, [Nome]! Mas o material faz muito mais sentido quando o Hariton mostra aplicado ao seu perfil específico. Que tal 15 minutos com ele, e você já sai com um diagnóstico personalizado? Qual dia fica melhor?`
  },
  {
    id: 'custo',
    triggers: ['quanto custa', 'qual o custo', 'taxa', 'cobram', 'é pago', 'tem custo'],
    script: `OBJEÇÃO: "Quanto custa o serviço?"
RESPONDA assim: A primeira reunião de diagnóstico com o Hariton é totalmente gratuita e sem compromisso, [Nome]. A ideia é só entender o seu cenário atual pra ver se faz sentido avançar juntos. Terça ou quinta-feira estão livres, qual você prefere?`
  },
  {
    id: 'deixa_pensar',
    triggers: ['deixa eu pensar', 'preciso pensar', 'vou considerar', 'depois eu vejo', 'depois falo', 'not now', 'mais tarde'],
    script: `OBJEÇÃO: "Deixa eu pensar / me dá um tempo"
RESPONDA assim: Claro, [Nome], sem nenhuma pressa. Fico à disposição. Só pra facilitar quando você estiver pronto: o Hariton tem horários terça e quinta desta semana. Se quiser, já reservo um e você confirma depois, assim a agenda não fecha antes.`
  },
  {
    id: 'nao_interesse',
    triggers: ['não tenho interesse', 'não me interessa', 'obrigado mas não', 'por favor não me contacte'],
    script: `OBJEÇÃO: "Não tenho interesse"
RESPONDA assim: Entendo, [Nome], e respeito totalmente. Vou deixar o espaço aberto. Se em algum momento bater a curiosidade sobre proteção patrimonial ou diversificação, é só me chamar. Tenha um ótimo dia!
INSTRUÇÃO: Encerre com elegância, não insista, e trate o lead como baixa prioridade.`
  }
];

function detectarObjecao(mensagem) {
  const msg = mensagem.toLowerCase();
  return OBJECOES.find(o => o.triggers.some(t => msg.includes(t))) || null;
}

function gerarInstrucaoObjecao(objecao, nomeCliente, nicho) {
  if (!objecao) return '';
  let txt = objecao.script.replace(/\[Nome\]/g, nomeCliente.split(' ')[0]);
  // Na objeção "manda material", anexa o link do One-Pager do segmento, condicionado
  // ao aceite de uma conversa (nunca lâmina genérica avulsa).
  if (objecao.id === 'manda_material') {
    const seg = NICHO_TO_SEG[nicho] || '';
    const link = seg ? `${URL_ONE_PAGER}?seg=${seg}` : URL_ONE_PAGER;
    txt += `\nLINK DO ONE-PAGER (envie SOMENTE depois que o lead aceitar uma conversa de 15 minutos, nunca como lâmina genérica avulsa): ${link}`;
  }
  return `\n\nINSTRUÇÃO CRÍTICA, OBJEÇÃO DETECTADA:\n${txt}`;
}

module.exports = { detectarObjecao, gerarInstrucaoObjecao, OBJECOES };
