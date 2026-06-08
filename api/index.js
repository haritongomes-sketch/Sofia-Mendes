// Vercel entry point — injeta waitUntil no req para processamento pós-resposta
const { waitUntil } = require('@vercel/functions');
const app = require('../server/app');

module.exports = (req, res) => {
  req.waitUntil = waitUntil; // disponibiliza para os handlers do Express
  return app(req, res);
};
