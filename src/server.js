require('dotenv').config();
require('module-alias/register');

const mongoose = require('mongoose');

const app = require('./app');
const { env, validateEnvironment } = require('./shared/config/env');

validateEnvironment();

mongoose
  .connect(env.mongoUri)
  .then(() => {
    console.log('MongoDB conectado');

    const server = app.listen(env.port, env.host, () => {
      console.log(`Servidor rodando em http://${env.host}:${env.port}`);
    });
    server.requestTimeout = 60000;
    server.headersTimeout = 30000;
  })
 .catch((error) => {
  const message = String(error.message || '');

  // Evita registrar credenciais caso aparecam na mensagem.
  const safeMessage = message
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[MONGO_URI_OCULTA]');

  console.error('Erro ao conectar no MongoDB:', {
    name: error.name,
    message: safeMessage,
    code: error.code || null,
    codeName: error.codeName || null
  });

  process.exit(1);
});
