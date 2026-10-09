const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
function validate(overrides) {
  return spawnSync(process.execPath, ['-e', "require('./src/shared/config/env').validateEnvironment()"], {
    encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production',
      MONGO_URI: 'mongodb://unused.example.com/test', JWT_SECRET: 'x'.repeat(48),
      CLOUDINARY_CLOUD_NAME: 'fixture', CLOUDINARY_API_KEY: 'fixture', CLOUDINARY_API_SECRET: 'fixture',
      CORS_ORIGINS: 'https://frontend.example.com', PUBLIC_API_URL: 'https://api.example.com', ...overrides }
  });
}
test('production refuses wildcard CORS, short signing secrets and HTTP API URL', () => {
  for (const settings of [{ CORS_ORIGINS: '*' }, { JWT_SECRET: 'short' }, { PUBLIC_API_URL: 'http://api.example.com' }]) assert.notEqual(validate(settings).status, 0);
});
test('production accepts environment configuration without using .env', () => {
  assert.equal(validate({}).status, 0);
});
