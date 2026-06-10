/**
 * Plugin: Fila de Prospecção (importação em massa + liberação drip)
 *
 * Permite importar listas de leads (Excel/CSV → JSON) sem disparar a Sofia na hora.
 * Os leads entram na FILA (estagio='fila'). Um cron diário libera até
 * MAX_LEADS_DIA (default 10) por dia útil, em ordem FIFO (importação mais antiga
 * primeiro), disparando a abertura da Sofia — preservando a meta de 10 leads/dia.
 *
 * Não exige migração de schema: usa estagio='fila' e tags ('importado:<iso>',
 * 'drip:<YYYY-MM-DD>') sobre os campos existentes.
 */

const { partesBR } = require('../scheduler');
const sofia = require('../sofia');
const { sendWhatsApp } = require('../zapi');

const MAX_LEADS_DIA = parseInt(process.env.MAX_LEADS_DIA || '10');
const RELEASE_GAP_MS = parseInt(process.env.RELEASE_GAP_MS || '1500'); // anti-spam entre aberturas
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Normalização de entrada ──────────────────────────────────────────────────

// Telefone → apenas dígitos, com DDI 55 assumido para números BR sem código.
function normalizarWhatsapp(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 11 && !d.startsWith('55')) d = '55' + d; // DDD+numero sem DDI
  return d;
}

// Aceita rótulos amigáveis ou as próprias chaves de NICHOS_CONTEXTO.
const NICHO_KEYS = ['medico_cirurgiao', 'advogado_tributarista', 'ceo_empresario', 'dentista_especialista', 'engenheiro_executivo'];
const NICHO_ALIAS = {
  medico: 'medico_cirurgiao', médico: 'medico_cirurgiao', cirurgiao: 'medico_cirurgiao', cirurgião: 'medico_cirurgiao',
  advogado: 'advogado_tributarista', tributarista: 'advogado_tributarista', advogada: 'advogado_tributarista',
  ceo: 'ceo_empresario', empresario: 'ceo_empresario', empresário: 'ceo_empresario', empresaria: 'ceo_empresario',
  dentista: 'dentista_especialista',
  executivo: 'engenheiro_executivo', executiva: 'engenheiro_executivo', engenheiro: 'engenheiro_executivo'
};
function normalizarNicho(v) {
  const s = String(v == null ? '' : v).toLowerCase().trim();
  if (!s) return 'medico_cirurgiao';
  if (NICHO_KEYS.includes(s)) return s;
  return NICHO_ALIAS[s] || 'medico_cirurgiao';
}

function parseTags(tagsJson) {
  try { return JSON.parse(tagsJson || '[]'); } catch { return []; }
}

function hojeBR() {
  const p = partesBR(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`;
}

// ─── Importação ───────────────────────────────────────────────────────────────

/**
 * Importa uma lista de leads para a FILA (sem disparar a Sofia).
 * @param {PrismaClient} prisma
 * @param {Array<object>} linhas  objetos com pelo menos { nome, whatsapp }
 * @returns {{ importados, duplicados, invalidos, detalhes }}
 */
async function importarLeads(prisma, linhas) {
  const agora = new Date().toISOString();
  let importados = 0, duplicados = 0, invalidos = 0;
  const detalhes = [];
  const vistosNoLote = new Set();

  for (const raw of (linhas || [])) {
    const nome = String(raw.nome || raw.name || '').trim();
    const whatsapp = normalizarWhatsapp(raw.whatsapp || raw.telefone || raw.celular || raw.fone || raw.phone);

    if (!nome || !whatsapp || whatsapp.length < 10) {
      invalidos++; detalhes.push({ nome, whatsapp, status: 'invalido' });
      continue;
    }
    // Dedup dentro do próprio lote
    if (vistosNoLote.has(whatsapp)) {
      duplicados++; detalhes.push({ nome, whatsapp, status: 'duplicado_lote' });
      continue;
    }
    vistosNoLote.add(whatsapp);

    try {
      await prisma.lead.create({
        data: {
          nome,
          whatsapp,
          email:      String(raw.email || raw['e-mail'] || '').trim(),
          nicho:      normalizarNicho(raw.nicho || raw.segmento),
          regiao:     String(raw.regiao || raw['região'] || 'sudeste').trim() || 'sudeste',
          profissao:  String(raw.profissao || raw['profissão'] || raw.cargo || '').trim(),
          cidade:     String(raw.cidade || '').trim(),
          estado:     String(raw.estado || raw.uf || '').trim(),
          patrimonio: String(raw.patrimonio || raw['património'] || '').trim(),
          perfil:     String(raw.perfil || 'Moderado').trim() || 'Moderado',
          estagio:    'fila',
          origem:     'Importação',
          tags:       JSON.stringify([`importado:${agora}`])
        }
      });
      importados++; detalhes.push({ nome, whatsapp, status: 'importado' });
    } catch (err) {
      if (err.code === 'P2002') { // whatsapp já cadastrado
        duplicados++; detalhes.push({ nome, whatsapp, status: 'duplicado_existente' });
      } else {
        invalidos++; detalhes.push({ nome, whatsapp, status: 'erro', erro: err.message });
      }
    }
  }

  console.log(`[Fila] Importação: ${importados} novos, ${duplicados} duplicados, ${invalidos} inválidos`);
  return { importados, duplicados, invalidos, detalhes };
}

// ─── Liberação drip ───────────────────────────────────────────────────────────

// Dispara a abertura da Sofia para um lead recém-liberado (espelha POST /api/leads).
async function dispararAbertura(prisma, lead, today) {
  const abertura = await sofia.gerarAbertura(lead);
  await prisma.mensagem.create({ data: { leadId: lead.id, role: 'assistant', content: abertura } });
  await sendWhatsApp(lead.whatsapp, abertura);

  const tags = parseTags(lead.tags).filter(t => !t.startsWith('drip:'));
  tags.push(`drip:${today}`);
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      estagio: 'prospeccao',
      score: 5,
      ultimaInteracao: new Date(),
      // Reancla a régua de cadência na data de liberação (não na de importação)
      createdAt: new Date(),
      tags: JSON.stringify(tags)
    }
  });
  console.log(`[Fila] Liberado → ${lead.nome}`);
}

/**
 * Libera até a cota diária restante de leads da fila (FIFO) e dispara a abertura.
 * Idempotente no dia: conta quem já foi liberado hoje (tag drip:<data>) e só
 * completa o que falta para MAX_LEADS_DIA.
 */
async function liberarLeadsDoDia(prisma) {
  const today = hojeBR();
  const liberadosHoje = await prisma.lead.count({ where: { tags: { contains: `drip:${today}` } } });
  const vagas = Math.max(0, MAX_LEADS_DIA - liberadosHoje);
  if (vagas === 0) {
    console.log(`[Fila] Cota diária já atingida (${liberadosHoje}/${MAX_LEADS_DIA}).`);
    return { liberados: 0, liberadosHoje, max: MAX_LEADS_DIA, motivo: 'cota_atingida' };
  }

  const fila = await prisma.lead.findMany({
    where: { estagio: 'fila', cessarContato: false },
    orderBy: { createdAt: 'asc' }, // FIFO: importação mais antiga primeiro
    take: vagas
  });

  let liberados = 0;
  for (const lead of fila) {
    try {
      await dispararAbertura(prisma, lead, today);
      liberados++;
      if (RELEASE_GAP_MS) await sleep(RELEASE_GAP_MS);
    } catch (err) {
      console.error(`[Fila] Erro ao liberar ${lead.nome}:`, err.message);
    }
  }

  console.log(`[Fila] ${liberados} liberados (cota ${liberadosHoje + liberados}/${MAX_LEADS_DIA}).`);
  return { liberados, liberadosHoje: liberadosHoje + liberados, max: MAX_LEADS_DIA };
}

// ─── Status da fila ───────────────────────────────────────────────────────────

async function statusFila(prisma) {
  const today = hojeBR();
  const [naFila, liberadosHoje] = await Promise.all([
    prisma.lead.count({ where: { estagio: 'fila' } }),
    prisma.lead.count({ where: { tags: { contains: `drip:${today}` } } })
  ]);
  const restanteHoje = Math.max(0, MAX_LEADS_DIA - liberadosHoje);
  const diasUteisParaEsvaziar = naFila > 0 ? Math.ceil(naFila / MAX_LEADS_DIA) : 0;
  return { naFila, liberadosHoje, restanteHoje, max: MAX_LEADS_DIA, diasUteisParaEsvaziar };
}

module.exports = { importarLeads, liberarLeadsDoDia, statusFila, MAX_LEADS_DIA, normalizarWhatsapp, normalizarNicho };
