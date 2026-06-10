const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function ehHorarioComercial(date) {
  const dia = date.getDay(); // 0=dom, 6=sab
  const hora = date.getHours();
  return dia >= 1 && dia <= 5 && hora >= 8 && hora < 18;
}

function proximoDiaUtil(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatarDataBR(date) {
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]} às ${date.getHours()}h`;
}

async function podendoAgendar(dataDesejada) {
  const agora = dataDesejada || new Date();
  const max = parseInt(process.env.MAX_REUNIOES_DIA || '2');

  if (!ehHorarioComercial(agora)) {
    const proximo = proximoDiaUtil(agora);
    return {
      pode: false,
      motivo: 'fora_horario',
      mensagemSofia: `Os agendamentos do Hariton são feitos somente em dias úteis, das 8h às 18h. A próxima janela disponível seria ${formatarDataBR(proximo)} — você teria disponibilidade?`,
      proximaData: proximo
    };
  }

  const count = await prisma.reuniao.count({
    where: {
      data: { gte: startOfDay(agora), lte: endOfDay(agora) },
      status: 'agendada'
    }
  });

  if (count >= max) {
    const proximo = proximoDiaUtil(agora);
    return {
      pode: false,
      motivo: 'agenda_cheia',
      mensagemSofia: `A agenda do Hariton hoje já está com os horários reservados. Mas tenho uma janela disponível ${formatarDataBR(proximo)} — que tal aproveitarmos essa oportunidade?`,
      proximaData: proximo
    };
  }

  const horaReuniao = new Date(agora);
  horaReuniao.setHours(agora.getHours() + 1, 0, 0, 0);
  if (!ehHorarioComercial(horaReuniao)) {
    horaReuniao.setDate(horaReuniao.getDate() + 1);
    horaReuniao.setHours(9, 0, 0, 0);
    while (!ehHorarioComercial(horaReuniao)) horaReuniao.setDate(horaReuniao.getDate() + 1);
  }

  return { pode: true, dataReuniao: horaReuniao, formatada: formatarDataBR(horaReuniao) };
}

// ─── Próximas N janelas livres (compute, ciente do banco) ─────────────────────
// Caminho padrão para oferecer DOIS horários sem dependência externa.
// Horas candidatas em dias úteis; respeita MAX_REUNIOES_DIA e evita colisão exata.
async function proximasJanelas(n = 2, apartirDe = new Date()) {
  const max = parseInt(process.env.MAX_REUNIOES_DIA || '2');
  const HORAS_CANDIDATAS = [10, 14, 16]; // janelas preferidas (Brasília)
  const slots = [];

  for (let diasFrente = 0; diasFrente <= 21 && slots.length < n; diasFrente++) {
    const dia = new Date(apartirDe);
    dia.setDate(dia.getDate() + diasFrente);
    const dow = dia.getDay();
    if (dow === 0 || dow === 6) continue; // fim de semana

    const countDia = await prisma.reuniao.count({
      where: { data: { gte: startOfDay(dia), lte: endOfDay(dia) }, status: 'agendada' }
    });
    let vagas = max - countDia;
    if (vagas <= 0) continue;

    for (const hora of HORAS_CANDIDATAS) {
      if (slots.length >= n || vagas <= 0) break;
      const slot = new Date(dia);
      slot.setHours(hora, 0, 0, 0);
      if (slot <= apartirDe) continue; // não oferecer horário no passado
      const ocupado = await prisma.reuniao.count({ where: { data: slot, status: 'agendada' } });
      if (ocupado > 0) continue;
      slots.push({ inicio: slot, formatada: formatarDataBR(slot), iso: slot.toISOString() });
      vagas--;
    }
  }
  return slots;
}

module.exports = { podendoAgendar, formatarDataBR, proximasJanelas, startOfDay, endOfDay, ehHorarioComercial };
