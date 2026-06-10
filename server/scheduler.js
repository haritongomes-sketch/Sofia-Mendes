const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Fuso de Brasília (UTC-3, sem horário de verão desde 2019) ────────────────
// O runtime da Vercel roda em UTC e a env TZ é reservada (não pode ser setada),
// então tratamos o fuso explicitamente aqui — funciona em qualquer servidor.
const BR_TZ = 'America/Sao_Paulo';
const BR_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3

// Instante real (UTC) para um horário de parede de Brasília.
function instanteBR(ano, mes, dia, hora = 0, min = 0) {
  return new Date(Date.UTC(ano, mes, dia, hora + 3, min, 0, 0));
}

// Partes da data de parede de Brasília para um instante qualquer.
function partesBR(date) {
  const shifted = new Date(date.getTime() - BR_OFFSET_MS); // getUTC* passam a refletir Brasília
  return {
    ano: shifted.getUTCFullYear(),
    mes: shifted.getUTCMonth(),
    dia: shifted.getUTCDate(),
    hora: shifted.getUTCHours(),
    dow: shifted.getUTCDay(), // 0=dom … 6=sáb
  };
}

const DIAS  = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Formata SEMPRE em horário de Brasília, independente do TZ do servidor.
function formatarDataBR(date) {
  const p = partesBR(date);
  return `${DIAS[p.dow]}, ${p.dia} de ${MESES[p.mes]} às ${p.hora}h`;
}

// ─── Próximas N janelas livres (compute, ciente do banco) ─────────────────────
// Caminho padrão para oferecer DOIS horários sem dependência externa.
// Horas candidatas em dias úteis (Brasília); respeita MAX_REUNIOES_DIA e colisão exata.
async function proximasJanelas(n = 2, apartirDe = new Date(), horas = [10, 14, 16]) {
  const max = parseInt(process.env.MAX_REUNIOES_DIA || '2');
  const base = partesBR(apartirDe);
  const slots = [];

  for (let df = 0; df <= 21 && slots.length < n; df++) {
    // Data-calendário de Brasília para "hoje + df"
    const ref = new Date(Date.UTC(base.ano, base.mes, base.dia + df));
    const y = ref.getUTCFullYear(), mo = ref.getUTCMonth(), d = ref.getUTCDate();
    const dow = ref.getUTCDay();
    if (dow === 0 || dow === 6) continue; // fim de semana

    const inicioDiaBR = instanteBR(y, mo, d, 0);
    const fimDiaBR    = new Date(inicioDiaBR.getTime() + 24 * 60 * 60 * 1000 - 1);

    const countDia = await prisma.reuniao.count({
      where: { data: { gte: inicioDiaBR, lte: fimDiaBR }, status: 'agendada' }
    });
    let vagas = max - countDia;
    if (vagas <= 0) continue;

    for (const hora of horas) {
      if (slots.length >= n || vagas <= 0) break;
      const slot = instanteBR(y, mo, d, hora);
      if (slot <= apartirDe) continue; // não oferecer horário no passado
      const ocupado = await prisma.reuniao.count({ where: { data: slot, status: 'agendada' } });
      if (ocupado > 0) continue;
      slots.push({ inicio: slot, formatada: formatarDataBR(slot), iso: slot.toISOString() });
      vagas--;
    }
  }
  return slots;
}

// Candidatos puros (sem DB) — usados pelo caminho freeBusy do Google Calendar.
function gerarCandidatosBR(apartirDe = new Date(), dias = 21, horas = [10, 14, 16], duracaoMin = 30) {
  const base = partesBR(apartirDe);
  const out = [];
  for (let df = 0; df <= dias; df++) {
    const ref = new Date(Date.UTC(base.ano, base.mes, base.dia + df));
    const y = ref.getUTCFullYear(), mo = ref.getUTCMonth(), d = ref.getUTCDate();
    const dow = ref.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const h of horas) {
      const inicio = instanteBR(y, mo, d, h);
      if (inicio <= apartirDe) continue;
      out.push({ inicio, fim: new Date(inicio.getTime() + duracaoMin * 60 * 1000) });
    }
  }
  return out;
}

module.exports = { formatarDataBR, proximasJanelas, gerarCandidatosBR, instanteBR, partesBR, BR_TZ };
