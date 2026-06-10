// Servidor local (desenvolvimento) — não usado no Vercel
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       CRM Private Wealth (DEV)           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`✅ http://localhost:${PORT}`);
  console.log(`📡 Webhook: POST http://localhost:${PORT}/api/webhook/whatsapp`);
  console.log('');
});
