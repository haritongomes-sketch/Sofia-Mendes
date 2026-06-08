const fetch = require('node-fetch');

const BASE_URL = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`;

async function sendWhatsApp(phone, message) {
  const normalizedPhone = phone.replace(/\D/g, '');
  try {
    const res = await fetch(`${BASE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': process.env.ZAPI_CLIENT_TOKEN || ''
      },
      body: JSON.stringify({ phone: normalizedPhone, message })
    });
    const data = await res.json();
    if (!res.ok) console.error('[Z-API] Erro ao enviar:', data);
    return data;
  } catch (err) {
    console.error('[Z-API] Falha na requisição:', err.message);
  }
}

function extractPhoneFromWebhook(body) {
  return (body.phone || body.participantPhone || '').replace(/\D/g, '');
}

function extractTextFromWebhook(body) {
  return body.text?.message || body.body || '';
}

function isIncomingMessage(body) {
  return (
    !body.fromMe &&
    (body.type === 'ReceivedCallback' || body.event === 'received') &&
    (body.text?.message || body.body)
  );
}

module.exports = { sendWhatsApp, extractPhoneFromWebhook, extractTextFromWebhook, isIncomingMessage };
