const fetch = require('node-fetch');

// .trim() previne quebras de linha acidentais nas env vars (Vercel CLI às vezes as inclui)
const INSTANCE_ID = (process.env.ZAPI_INSTANCE_ID || '').trim();
const TOKEN       = (process.env.ZAPI_TOKEN       || '').trim();
const BASE_URL    = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

async function sendWhatsApp(phone, message) {
  const normalizedPhone = phone.replace(/\D/g, '');

  // Monta headers: Client-Token só é incluído quando configurado
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ZAPI_CLIENT_TOKEN) {
    headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
  }

  const res = await fetch(`${BASE_URL}/send-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: normalizedPhone, message, delayMessage: 0 })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[Z-API] Erro ao enviar:', JSON.stringify(data));
    throw new Error(`Z-API ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('[Z-API] Enviado para', normalizedPhone, '→', data);
  return data;
}

function extractPhoneFromWebhook(body) {
  return (body.phone || body.participantPhone || body.sender || body.from || '').toString().replace(/\D/g, '');
}

// Texto pode chegar em vários formatos dependendo da versão/tipo de mensagem do Z-API
function extractTextFromWebhook(body) {
  return (
    body.text?.message ||                       // texto simples (formato mais comum)
    (typeof body.text === 'string' ? body.text : '') ||
    body.body ||
    body.message ||
    body.caption ||                             // imagem/vídeo com legenda
    body.buttonsResponseMessage?.message ||     // resposta de botão
    body.listResponseMessage?.message ||        // resposta de lista
    body.hydratedTemplate?.message ||
    ''
  ).toString().trim();
}

// Considera "entrada" toda mensagem recebida de um lead (não enviada por nós, não status).
// Tolerante a variações de payload do Z-API: não exige um `type` específico — basta
// não ser fromMe, não ser callback de status, e ter texto extraível.
// IMPORTANTE: NÃO rejeitar por um campo `status` genérico — o Z-API inclui `status`
// (ex.: "RECEIVED") em mensagens recebidas legítimas. Recibos de entrega/leitura vêm
// com um `type` próprio (MessageStatusCallback / DeliveryCallback / ReadCallback).
function isIncomingMessage(body) {
  if (!body || body.fromMe) return false;
  if (body.isStatusReply === true) return false;
  if (typeof body.type === 'string' && /status|delivery|read|presence/i.test(body.type)) return false;
  const ehRecebida =
    body.type === 'ReceivedCallback' ||
    body.event === 'received' ||
    body.type === undefined; // alguns payloads não trazem type
  if (!ehRecebida && body.type !== undefined) return false;
  return Boolean(extractTextFromWebhook(body));
}

module.exports = { sendWhatsApp, extractPhoneFromWebhook, extractTextFromWebhook, isIncomingMessage };
