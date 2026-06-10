/**
 * Skill: Scripts de Abordagem Inicial — LinkedIn
 *
 * Biblioteca estática (espelha o padrão de objecoes.js) usada como base/few-shot
 * no gerador `canal: 'linkedin'` de app.js. O LinkedIn não tem API de envio:
 * o texto é retornado para o Hariton revisar e enviar manualmente.
 *
 * Estrutura por nicho (+ universal):
 *   convite — solicitação de conexão, ≤300 caracteres, sem pitch
 *   1       — 1ª mensagem (pós-aceite): apresentação + modelo fiduciário + UMA pergunta aberta
 *   2       — insight de mercado do segmento + oferta de 15 min com dois horários (terça/quinta)
 *   3       — breakup elegante, porta aberta
 *
 * Voz alinhada à SOFIA_SYSTEM: sem diminutivos, sem taxas/rentabilidade/produtos,
 * padrão Private sem citar valores, postura de igual para igual.
 */

const SCRIPTS_LINKEDIN = {
  medico_cirurgiao: {
    convite: 'Dr(a). {nome}, acompanho profissionais da sua área que construíram patrimônio relevante e raramente têm tempo de estruturá-lo. Trabalho com Relações Institucionais  e gostaria de conectar.',
    1: `{nome}, obrigada por aceitar. Sou Sofia Mendes, das Relações Institucionais — trabalho com Hariton Andrade, advisor independente no modelo fiduciário (sem comissão de produto).
Atendemos médicos que chegaram a um patrimônio expressivo, mas cujo capital ainda não tem a mesma estrutura de proteção que a carreira tem. Hoje você concentra tudo no Brasil ou já tem alguma diversificação internacional?`,
    2: `{nome}, um ponto que vejo com frequência no seu perfil: o volume de processos contra médicos especialistas cresceu de forma relevante — e patrimônio sem separação entre pessoa física e atividade profissional fica exposto a um risco que nunca aparece no extrato.
O Hariton faz um diagnóstico de 15 minutos exatamente sobre isso, por vídeo e sem compromisso. Terça às 14h ou quinta às 10h funciona melhor para você?`,
    3: `{nome}, sei que a rotina de quem opera e atende raramente abre espaço para o próprio patrimônio — e respeito o timing de cada um.
Vou deixar a porta aberta: quando quiser uma segunda opinião independente sobre como proteger o que construiu, é só me chamar. Sigo à disposição.`
  },

  advogado_tributarista: {
    convite: '{nome}, você estrutura patrimônio complexo com maestria todos os dias. Trabalho com Relações Institucionais , no modelo fiduciário independente, e seria um prazer conectar.',
    1: `{nome}, obrigada pela conexão. Sou Sofia Mendes, das Relações Institucionais — atuo com Hariton Andrade, advisor independente, modelo fiduciário sem comissão de produto.
É comum ver tributaristas que organizam o patrimônio dos clientes com perfeição e deixam o próprio em segundo plano. Hoje você estrutura o seu via pessoa física mesmo ou já tem holding/offshore?`,
    2: `{nome}, desde a Lei 14.754/2023 a Receita mudou as regras para offshore de pessoa física — estruturas antigas ou mal declaradas podem estar gerando tributação desnecessária, ou pior, risco fiscal.
O Hariton revisa exatamente esse tipo de estrutura em 15 minutos, por vídeo e sem compromisso. Terça às 14h ou quinta às 10h fica melhor para você?`,
    3: `{nome}, entendo que cuidar do patrimônio dos outros com tanta dedicação deixa pouco espaço para o próprio — e respeito o seu tempo.
Fica o convite em aberto: quando fizer sentido revisar a sua estrutura pessoal com um olhar independente, é só me chamar.`
  },

  ceo_empresario: {
    convite: '{nome}, admiro o que você construiu. Trabalho com Relações Institucionais  — modelo fiduciário independente — com empresários que pensam a proteção do patrimônio pessoal. Vamos conectar?',
    1: `{nome}, obrigada por aceitar. Sou Sofia Mendes, das Relações Institucionais — trabalho com Hariton Andrade, advisor independente, remuneração 100% alinhada ao cliente, sem comissão de produto.
Quem constrói uma empresa raramente constrói, em paralelo, a estrutura que protege o patrimônio pessoal. Hoje, que percentual do seu patrimônio você diria que está fora do Brasil?`,
    2: `{nome}, empresários que moveram 20–30% do patrimônio para fora do Brasil nos últimos anos preservaram poder de compra real enquanto o câmbio oscilava — os que esperaram seguem esperando o momento certo.
O Hariton faz um diagnóstico de 15 minutos sobre concentração de risco e governança, por vídeo. Terça às 14h ou quinta às 10h funciona para você?`,
    3: `{nome}, sei que a empresa consome praticamente toda a atenção de quem a lidera — o patrimônio pessoal quase sempre fica para depois. Respeito esse momento.
Quando quiser dar esse próximo passo com uma visão independente, é só me chamar. Sigo à disposição.`
  },

  dentista_especialista: {
    convite: '{nome}, acompanho especialistas que construíram patrimônio relevante e querem que ele trabalhe com a mesma eficiência da carreira. Sou das Relações Institucionais — vamos conectar?',
    1: `{nome}, obrigada pela conexão. Sou Sofia Mendes, das Relações Institucionais — atuo com Hariton Andrade, advisor independente no modelo fiduciário, sem comissão de produto.
Muitos especialistas acumulam bem, mas deixam capital parado em produtos de banco, abaixo do potencial. Hoje você investe principalmente pelo banco mesmo ou já tem conta em corretora?`,
    2: `{nome}, a janela de acumulação costuma ser mais curta do que parece — e capital em CDB de banco ou poupança, com a inflação real, perde eficiência fiscal e retorno sem que se perceba.
O Hariton mostra em 15 minutos como organizar o que você já construiu, por vídeo e sem compromisso. Terça às 14h ou quinta às 10h fica melhor?`,
    3: `{nome}, respeito o timing de cada um. Se um dia quiser entender como fazer o que você construiu trabalhar com mais eficiência, sem pressa e sem compromisso, é só me chamar.
Deixo a porta aberta.`
  },

  engenheiro_executivo: {
    convite: '{nome}, trabalho com executivos sênior que acumularam patrimônio relevante — muitas vezes concentrado na própria empresa. Sou das Relações Institucionais. Seria um prazer conectar.',
    1: `{nome}, obrigada por aceitar. Sou Sofia Mendes, das Relações Institucionais — trabalho com Hariton Andrade, advisor independente, modelo fiduciário sem comissão de produto.
Executivos sênior costumam ter grande parte da riqueza atrelada a uma única empresa — salário, bônus e stock options. Além disso, você já tem alguma diversificação relevante montada?`,
    2: `{nome}, quem tem stock options sem um plano estruturado de diversificação tende a perder valor em vesting, lockup ou troca de empresa — às vezes 25–30% do líquido. O timing importa muito mais do que a maioria percebe.
O Hariton faz um diagnóstico de 15 minutos sobre isso, por vídeo e sem compromisso. Terça às 14h ou quinta às 10h funciona para você?`,
    3: `{nome}, sei que o cargo e a empresa consomem praticamente todo o foco — o próprio patrimônio quase sempre fica em segundo plano. Respeito o seu tempo.
Quando o momento for certo para diversificar com um olhar independente, é só me chamar.`
  },

  universal: {
    convite: '{nome}, acompanho pessoas que construíram patrimônio relevante por conta própria e buscam uma visão independente sobre ele. Sou das Relações Institucionais — vamos conectar?',
    1: `{nome}, obrigada pela conexão. Sou Sofia Mendes, das Relações Institucionais — trabalho com Hariton Andrade, advisor independente no modelo fiduciário, sem comissão de produto.
Atendemos quem construiu patrimônio relevante e quer garantir que ele continue crescendo de forma protegida, independentemente do cenário. Como você está pensando o seu patrimônio neste momento?`,
    2: `{nome}, o cenário mudou bastante — juros, câmbio e novas regras fiscais. Quem tem patrimônio relevante e não revisou a estratégia pode estar deixando eficiência e proteção na mesa.
O Hariton faz um diagnóstico independente de 15 minutos, por vídeo e sem compromisso. Terça às 14h ou quinta às 10h funciona melhor para você?`,
    3: `{nome}, respeito muito o tempo de cada pessoa e sei que o timing nem sempre é o certo.
Deixo a porta aberta: quando quiser uma segunda opinião independente sobre o seu patrimônio, sem compromisso, é só me chamar.`
  }
};

/**
 * Retorna o script de LinkedIn para o nicho e toque informados.
 * @param {string} nicho  chave de NICHOS_CONTEXTO (cai em 'universal' se desconhecida)
 * @param {'convite'|1|2|3} toque
 * @param {string} [primeiroNome]  se informado, substitui {nome} no texto
 */
function obterScriptLinkedin(nicho, toque, primeiroNome) {
  const set = SCRIPTS_LINKEDIN[nicho] || SCRIPTS_LINKEDIN.universal;
  const script = set[toque] || set[1];
  return primeiroNome ? script.replace(/\{nome\}/g, primeiroNome.split(' ')[0]) : script;
}

module.exports = { SCRIPTS_LINKEDIN, obterScriptLinkedin };
