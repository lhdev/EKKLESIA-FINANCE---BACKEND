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
}

const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  port: Number(process.env.PORT || 3333),
  host: process.env.HOST?.trim() || '0.0.0.0',
  mongoUri: process.env.MONGO_URI?.trim() || '',
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  trustProxy: process.env.TRUST_PROXY?.trim() || 'loopback',
  jsonBodyLimit: process.env.JSON_BODY_LIMIT?.trim() || '1mb',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
};

module.exports = {
  env,
  validateEnvironment,
};
