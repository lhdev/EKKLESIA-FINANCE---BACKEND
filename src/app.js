const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const AppError = require('./shared/errors/AppError');

const routes = require('./infra/http/routes');
const errorMiddleware = require('./infra/http/middlewares/error.middleware');
const { env } = require('./shared/config/env');



const app = express();

function buildCorsOptions() {
  if (env.corsOrigins.includes('*')) {
    return {
      origin: true,
      credentials: false,
      optionsSuccessStatus: 204,
    };
  }

  return {
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError('Origem nao permitida', 403));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(cors(buildCorsOptions()));
// Legacy public gallery files only; financial receipts are stored separately.
app.get('/uploads/:filename', (req, res, next) => {
  if (!/^[\w .-]+\.(?:jpe?g|png)$/i.test(req.params.filename)) return next(new AppError('Arquivo nao encontrado', 404));
  res.sendFile(req.params.filename, { root: path.resolve(__dirname, '..', 'uploads'), dotfiles: 'deny' });
});
app.get('/ready', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'unavailable' }));

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    environment: env.nodeEnv,
  });
});

app.use(routes);
app.use(errorMiddleware);

module.exports = app;
