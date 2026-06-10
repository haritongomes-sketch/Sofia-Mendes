/**
 * Skill: Agenda Google Calendar (com fallback computacional)
 *
 * - proximasDuasJanelas(): oferece 2 janelas REALMENTE livres da agenda do Hariton.
 *     • Se GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_CALENDAR_ID estiverem setados → usa freeBusy.
 *     • Caso contrário → cai no scheduler.proximasJanelas (compute, ciente do banco).
 * - criarEventoReuniao(): cria o evento de 15 min no Google Calendar ao confirmar.
 *     • Se Google não configurado → no-op (o registro em `Reuniao` no banco já é feito).
 *
 * Isso garante que o requisito "dois horários" funcione MESMO sem o setup do Google,
 * e fica plugável assim que as credenciais forem adicionadas.
 */

const { proximasJanelas, formatarDataBR, gerarCandidatosBR, BR_TZ } = require('../scheduler');

const CAL_ID = process.env.GOOGLE_CALENDAR_ID;
const TZ      = BR_TZ;

// Aceita a chave em JSON cru (GOOGLE_SERVICE_ACCOUNT_JSON) ou base64
// (GOOGLE_SERVICE_ACCOUNT_B64) — o base64 evita problemas de quebra de linha no painel.
function getRawCreds() {
  const b64 = (process.env.GOOGLE_SERVICE_ACCOUNT_B64 || '').trim();
  if (b64) return Buffer.from(b64, 'base64').toString('utf8');
  const json = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  return json || null;
}

let _calendar = null;
function getCalendar() {
  if (_calendar) return _calendar;
  const raw = getRawCreds();
  if (!raw || !CAL_ID) return null;
  try {
    const { google } = require('googleapis');
    const creds = JSON.parse(raw);
    const auth = new google.auth.JWT(
      creds.client_email,
      null,
      (creds.private_key || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar']
    );
    _calendar = google.calendar({ version: 'v3', auth });
    return _calendar;
  } catch (err) {
    console.error('[agenda-google] credenciais inválidas, usando fallback:', err.message);
    return null;
  }
}

function colide(cand, busy) {
  const bStart = new Date(busy.start);
  const bEnd   = new Date(busy.end);
  return cand.inicio < bEnd && cand.fim > bStart;
}

async function proximasDuasJanelas(apartirDe = new Date()) {
  const cal = getCalendar();
  if (!cal) return proximasJanelas(2, apartirDe); // fallback compute

  try {
    const candidatos = gerarCandidatosBR(apartirDe, 21);
    if (!candidatos.length) return proximasJanelas(2, apartirDe);

    const timeMin = candidatos[0].inicio.toISOString();
    const timeMax = candidatos[candidatos.length - 1].fim.toISOString();

    const fb = await cal.freebusy.query({
      requestBody: { timeMin, timeMax, timeZone: TZ, items: [{ id: CAL_ID }] }
    });
    const busy = fb.data.calendars?.[CAL_ID]?.busy || [];

    const livres = candidatos.filter(c => !busy.some(b => colide(c, b)));
    if (livres.length < 2) {
      // poucas janelas livres no Google → completa com o fallback
      const fbk = await proximasJanelas(2, apartirDe);
      const map = new Map();
      [...livres.map(c => ({ inicio: c.inicio, formatada: formatarDataBR(c.inicio), iso: c.inicio.toISOString() })), ...fbk]
        .forEach(s => map.set(s.iso, s));
      return [...map.values()].slice(0, 2);
    }
    return livres.slice(0, 2).map(c => ({
      inicio: c.inicio, formatada: formatarDataBR(c.inicio), iso: c.inicio.toISOString()
    }));
  } catch (err) {
    console.error('[agenda-google] freeBusy falhou, usando fallback:', err.message);
    return proximasJanelas(2, apartirDe);
  }
}

async function criarEventoReuniao(lead, inicio) {
  const cal = getCalendar();
  if (!cal) return { criado: false, motivo: 'google_nao_configurado' };

  try {
    const fim = new Date(new Date(inicio).getTime() + 15 * 60 * 1000);
    const ev = await cal.events.insert({
      calendarId: CAL_ID,
      requestBody: {
        summary: `Diagnóstico 15min — ${lead.nome}`,
        description: [
          `Lead: ${lead.nome}`,
          `Profissão: ${lead.profissao || '—'}`,
          `Patrimônio: ${lead.patrimonio || '—'}`,
          `WhatsApp: ${lead.whatsapp}`,
          `Agendado pela Sofia (CRM Altum).`
        ].join('\n'),
        start: { dateTime: new Date(inicio).toISOString(), timeZone: TZ },
        end:   { dateTime: fim.toISOString(),               timeZone: TZ }
      }
    });
    console.log(`[agenda-google] Evento criado p/ ${lead.nome}: ${ev.data.id}`);
    return { criado: true, eventId: ev.data.id, htmlLink: ev.data.htmlLink };
  } catch (err) {
    console.error('[agenda-google] Erro ao criar evento:', err.message);
    return { criado: false, motivo: err.message };
  }
}

// Diagnóstico da integração — usado pelo endpoint /api/agenda/diagnostico.
async function diagnostico() {
  const cal = getCalendar();
  const configurado = Boolean(cal && CAL_ID);
  const out = {
    googleConfigurado: configurado,
    temServiceAccount: Boolean(getRawCreds()),
    temCalendarId: Boolean(CAL_ID),
    calendarId: CAL_ID || null,
    timezone: TZ,
    // debug seguro: nomes das chaves GOOGLE_* vistas pelo runtime + tamanho do valor (sem expor conteúdo)
    googleEnvKeys: Object.keys(process.env).filter(k => k.startsWith('GOOGLE')).map(k => `${k}(${(process.env[k] || '').length})`)
  };

  // Debug seguro: tenta interpretar as credenciais e reporta o motivo de falha (sem expor conteúdo)
  try {
    const raw = getRawCreds();
    const creds = JSON.parse(raw);
    out.credsParseOk = true;
    out.credsClientEmail = creds.client_email ? creds.client_email.replace(/(.{6}).*(@)/, '$1***$2') : null;
    out.credsHasPrivateKey = Boolean(creds.private_key);
    out.privateKeyStartOk = (creds.private_key || '').includes('BEGIN PRIVATE KEY');
  } catch (e) {
    out.credsParseOk = false;
    out.credsErro = e.message;
  }

  if (configurado) {
    try {
      const now = new Date();
      const fb = await cal.freebusy.query({
        requestBody: {
          timeMin: now.toISOString(),
          timeMax: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          timeZone: TZ,
          items: [{ id: CAL_ID }]
        }
      });
      out.freeBusyOk = true;
      out.ocupadosProximos7d = (fb.data.calendars?.[CAL_ID]?.busy || []).length;
    } catch (err) {
      out.freeBusyOk = false;
      out.erro = err.message;
    }
  }

  const slots = await proximasDuasJanelas(new Date());
  out.proximasJanelas = slots.map(s => s.formatada);
  out.fonte = (configurado && out.freeBusyOk) ? 'google_calendar' : 'fallback_calculado';
  return out;
}

module.exports = { proximasDuasJanelas, criarEventoReuniao, diagnostico };
