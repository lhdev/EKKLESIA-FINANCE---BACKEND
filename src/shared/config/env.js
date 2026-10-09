const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required.`);
  }

  return value.trim();
}

function parseCorsOrigins(value) {
  if (!value || !value.trim()) {
    return ['*'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateEnvironment() {
  for (const envVar of REQUIRED_ENV_VARS) {
    readRequiredEnv(envVar);
  }
  if (Buffer.byteLength(env.jwtSecret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  if (env.nodeEnv === 'production') {
    if (!env.corsOrigins.length || env.corsOrigins.includes('*')) throw new Error('Configure explicit CORS_ORIGINS for production');
    const url = new URL(env.publicApiUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('PUBLIC_API_URL must use HTTPS');
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  port: Number(process.env.PORT || 3333),
  host: process.env.HOST?.trim() || '0.0.0.0',
  publicApiUrl: (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3333').trim().replace(/\/$/, ''),
  mongoUri: process.env.MONGO_URI?.trim() || '',
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : (process.env.TRUST_PROXY?.trim() || 'loopback'),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT?.trim() || '1mb',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
};

module.exports = {
  env,
  validateEnvironment,
};
