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
    console.error('Erro ao conectar no MongoDB:', error.name);
    process.exit(1);
  });
