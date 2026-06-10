/**
 * Skill: One-Pager Executivo Institucional — Altum Wealth
 *
 * Fonte de verdade do documento de uma página que a Sofia dispara quando o lead
 * pede "manda material". Gera HTML autocontido (CSS inline, sem dependências),
 * formato A4 com @media print para exportar PDF direto do navegador.
 *
 * Variações por segmento via ?seg= (alinhadas aos nichos de NICHOS_CONTEXTO):
 *   medico | advogado | ceo | dentista | executivo  (default = institucional puro)
 *
 * Mantém as regras de voz da SOFIA_SYSTEM: padrão Private sem citar valores,
 * sem rentabilidade/produtos, governança + modelo fiduciário + alocação global.
 */

// Base pública da API (onde a rota GET /api/one-pager é servida).
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://private-crm-nine.vercel.app';
const URL_ONE_PAGER = `${BASE_URL}/api/one-pager`;

// Mapeia o nicho do CRM → chave de segmento do One-Pager.
const NICHO_TO_SEG = {
  medico_cirurgiao:      'medico',
  advogado_tributarista: 'advogado',
  ceo_empresario:        'ceo',
  dentista_especialista: 'dentista',
  engenheiro_executivo:  'executivo'
};

// Bloco de segmento: rótulo + 1 parágrafo de dor/gancho específico.
const SEGMENTOS = {
  medico: {
    rotulo: 'Para médicos e cirurgiões',
    texto: 'Décadas de trabalho de alta renda física — plantões, cirurgias — frequentemente ficam expostas a um risco que não aparece em nenhum extrato: a ausência de separação entre o patrimônio pessoal e a atividade profissional. Estruturamos blindagem patrimonial e a transição desse capital para uma base internacional e fiscalmente eficiente, antes que um processo civil ou trabalhista transforme anos de construção em vulnerabilidade.'
  },
  advogado: {
    rotulo: 'Para advogados e tributaristas',
    texto: 'Você estrutura o patrimônio dos seus clientes com maestria — e é justamente quem mais conhece o custo de não estruturar o próprio. Com a Lei 14.754/2023, estruturas offshore antigas ou mal declaradas podem estar gerando tributação desnecessária ou risco fiscal. Atuamos sobre segurança jurídica institucional, diversificação internacional e a revisão técnica de estruturas fiduciárias que sustentam o seu patrimônio pessoal.'
  },
  ceo: {
    rotulo: 'Para CEOs e empresários',
    texto: 'Quem constrói uma empresa raramente constrói, em paralelo, a estrutura que protege o que foi construído — e o resultado costuma ser concentração total de risco: empresa, patrimônio pessoal e exposição cambial dependentes das mesmas variáveis, todos no Brasil. Trabalhamos a transição do caixa corporativo (PJ) para a blindagem do patrimônio pessoal (PF), a governança sucessória e a diversificação cambial que preserva poder de compra real.'
  },
  dentista: {
    rotulo: 'Para dentistas especialistas',
    texto: 'A janela de acumulação é mais curta do que parece. É comum o especialista investir muito em formação e pouco em estrutura patrimonial — deixando capital relevante em produtos bancários de baixa eficiência fiscal, parados abaixo do seu potencial. Organizamos o que você já construiu para que trabalhe com eficiência real, com uma base estruturada para o longo prazo enquanto a renda ativa ainda está no auge.'
  },
  executivo: {
    rotulo: 'Para executivos sênior',
    texto: 'Toda a riqueza concentrada em uma única empresa — via salário, bônus e, sobretudo, stock options — significa que, se a relação mudar ou o setor oscilar, o patrimônio vai junto. O timing da diversificação importa muito mais do que a maioria percebe. Estruturamos um plano para diversificar além das ações da empregadora e organizar o patrimônio acumulado, no momento em que isso ainda é uma escolha, não uma urgência.'
  }
};

// ─── Conteúdo institucional (fixo, comum a todas as versões) ──────────────────

const PILARES = [
  {
    titulo: 'O Modelo',
    corpo: 'Atuamos sob mandato estritamente fiduciário, no modelo <em>fee-based</em>: a remuneração é uma taxa fixa sobre a gestão, 100% alinhada ao cliente. Não recebemos comissão de produto — o que elimina, na origem, o conflito de interesses que orienta a alocação na maioria das instituições. Não concorremos com o seu banco atual: atuamos como auditoria patrimonial independente e segunda opinião institucional.'
  },
  {
    titulo: 'Governança',
    corpo: 'Cada estratégia passa por um comitê de investimentos e por um processo de diagnóstico estruturado, com total transparência de custos. O aconselhamento é conduzido por Hariton Andrade, advisor independente sênior com 15 anos de mercado. Sem prateleira fixa, sem produto de balcão: a arquitetura é desenhada sob medida para o cenário de cada CPF.'
  },
  {
    titulo: 'Alocação Global',
    corpo: 'Construímos diversificação internacional real — offshore estruturado, trusts e holding patrimonial — com eficiência fiscal à luz da Lei 14.754/2023 e proteção patrimonial via estrutura jurídica adequada. O objetivo é reduzir a concentração que é o padrão mais comum no Brasil: um único país, uma única moeda, uma única instituição.'
  }
];

const PARA_QUEM =
  'Trabalhamos com estruturas personalizadas para um grupo seletivo de pessoas que construíram patrimônio relevante por conta própria e demandam soluções de liquidez, sucessão e alocação global de padrão Private. A agenda do consultor é limitada e seletiva — não atendemos todos os perfis.';

// ─── Renderização ─────────────────────────────────────────────────────────────

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Gera o HTML completo e autocontido do One-Pager.
 * @param {string} seg  chave de segmento (medico|advogado|ceo|dentista|executivo) ou vazio
 */
function htmlOnePager(seg) {
  const segmento = SEGMENTOS[seg] || null;

  const pilaresHtml = PILARES.map(p => `
        <section class="pilar">
          <h2>${esc(p.titulo)}</h2>
          <p>${p.corpo}</p>
        </section>`).join('');

  const segmentoHtml = segmento ? `
        <section class="segmento">
          <span class="seg-tag">${esc(segmento.rotulo)}</span>
          <p>${esc(segmento.texto)}</p>
        </section>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Altum Wealth — Gestão Patrimonial Fiduciária</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --navy: #0f1c2e;
    --navy-soft: #1b2c44;
    --gold: #b08d57;
    --gold-soft: #c9a878;
    --ink: #20262e;
    --muted: #5a6470;
    --line: #e3e1da;
    --paper: #ffffff;
    --bg: #ece9e2;
  }
  html, body { background: var(--bg); }
  body {
    font-family: "Helvetica Neue", Arial, "Segoe UI", sans-serif;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    padding: 24px 12px;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: var(--paper);
    box-shadow: 0 10px 40px rgba(15,28,46,.18);
    display: flex;
    flex-direction: column;
  }
  /* Cabeçalho */
  header {
    background: var(--navy);
    color: #fff;
    padding: 30px 40px 26px;
    position: relative;
  }
  header::after {
    content: ""; position: absolute; left: 0; bottom: 0;
    width: 100%; height: 3px;
    background: linear-gradient(90deg, var(--gold) 0%, var(--gold-soft) 60%, transparent 100%);
  }
  .brand { display: flex; align-items: baseline; gap: 12px; }
  .brand .mark {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30px; font-weight: 700; letter-spacing: .04em;
  }
  .brand .mark span { color: var(--gold-soft); }
  .brand .sub {
    font-size: 10px; letter-spacing: .32em; text-transform: uppercase;
    color: #aeb8c6;
  }
  header .tagline {
    margin-top: 12px;
    font-family: Georgia, serif; font-size: 16px; font-weight: 400;
    color: #e8ddca; font-style: italic;
  }
  /* Corpo */
  main { padding: 30px 40px 12px; flex: 1; }
  .intro {
    font-size: 13.5px; line-height: 1.6; color: var(--muted);
    border-left: 3px solid var(--gold); padding-left: 16px; margin-bottom: 26px;
  }
  .pilar { margin-bottom: 22px; }
  .pilar h2 {
    font-family: Georgia, serif; font-size: 16px; color: var(--navy);
    letter-spacing: .01em; margin-bottom: 7px; position: relative; padding-left: 18px;
  }
  .pilar h2::before {
    content: ""; position: absolute; left: 0; top: 7px;
    width: 8px; height: 8px; background: var(--gold); transform: rotate(45deg);
  }
  .pilar p { font-size: 12.5px; line-height: 1.62; color: var(--ink); }
  .pilar em { color: var(--navy-soft); font-style: italic; }
  /* Bloco de segmento */
  .segmento {
    background: #f6f3ec; border: 1px solid var(--line);
    border-radius: 6px; padding: 16px 18px; margin: 4px 0 22px;
  }
  .seg-tag {
    display: inline-block; font-size: 10px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 7px;
  }
  .segmento p { font-size: 12.5px; line-height: 1.62; color: var(--ink); }
  /* Para quem é */
  .para-quem {
    margin-top: 4px; padding: 16px 18px; background: var(--navy);
    color: #dfe5ee; border-radius: 6px; font-size: 12px; line-height: 1.6;
  }
  .para-quem strong { color: var(--gold-soft); font-weight: 600; }
  /* CTA / rodapé */
  footer {
    padding: 22px 40px 30px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;
  }
  .cta { max-width: 62%; }
  .cta h3 {
    font-family: Georgia, serif; font-size: 15px; color: var(--navy); margin-bottom: 6px;
  }
  .cta p { font-size: 11.5px; line-height: 1.55; color: var(--muted); }
  .assinatura { text-align: right; }
  .assinatura .nome {
    font-family: Georgia, serif; font-size: 14px; color: var(--navy); font-weight: 700;
  }
  .assinatura .cargo { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
  .assinatura .org {
    font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
    color: var(--gold); margin-top: 6px;
  }
  .legal {
    padding: 0 40px 22px; font-size: 8.5px; color: #9aa2ad; line-height: 1.5; text-align: justify;
  }
  /* Impressão A4 */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: #fff; padding: 0; }
    .page { box-shadow: none; width: 100%; min-height: 100vh; }
  }
</style>
</head>
<body>
  <div class="page">
    <header>
      <div class="brand">
        <span class="mark">Altum<span>·</span>Wealth</span>
        <span class="sub">Private Wealth Management</span>
      </div>
      <p class="tagline">Gestão patrimonial fiduciária e independente.</p>
    </header>

    <main>
      <p class="intro">Um modelo desenhado para quem já construiu patrimônio relevante e busca
      independência, governança e alocação global — sem os conflitos de interesse do modelo
      bancário tradicional.</p>
${pilaresHtml}
${segmentoHtml}
      <div class="para-quem"><strong>Para quem é.</strong> ${esc(PARA_QUEM)}</div>
    </main>

    <footer>
      <div class="cta">
        <h3>Uma conversa de 15 minutos</h3>
        <p>Um diagnóstico patrimonial inicial com o consultor sênior, por vídeo, sem compromisso
        e sem pitch de produtos — para entender se a sua estrutura atual faz sentido para o cenário
        deste ano.</p>
      </div>
      <div class="assinatura">
        <div class="nome">Sofia Mendes</div>
        <div class="cargo">Relações Institucionais</div>
        <div class="org">Altum Wealth</div>
      </div>
    </footer>

    <p class="legal">Este documento tem caráter exclusivamente institucional e informativo. Não constitui
    oferta, recomendação de investimento, promessa ou garantia de rentabilidade. Estruturas patrimoniais,
    tributárias e internacionais estão sujeitas à análise individual de adequação e à legislação vigente.
    Altum Wealth — assessoria de investimentos independente, modelo fiduciário fee-based.</p>
  </div>
</body>
</html>`;
}

module.exports = { htmlOnePager, URL_ONE_PAGER, NICHO_TO_SEG, SEGMENTOS };
