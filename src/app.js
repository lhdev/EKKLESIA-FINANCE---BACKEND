const express = require('express');
const cors = require('cors');

const routes = require('./infra/http/routes');
const errorMiddleware = require('./infra/http/middlewares/error.middleware');
const { env } = require('./shared/config/env');

require('dotenv').config();

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

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(cors(buildCorsOptions()));

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    environment: env.nodeEnv,
  });
});

app.use(routes);
app.use(errorMiddleware);

module.exports = app;
