const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
require('module-alias/register');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.CORS_ORIGINS = 'https://frontend.example.com';
process.env.NODE_ENV = 'test';
const User = require('../src/infra/database/mongoose/schemas/UserSchema');
const app = require('../src/app');
const server = app.listen(0, '127.0.0.1');
const ready = new Promise(resolve => server.once('listening', resolve));
test.after(() => new Promise(resolve => server.close(resolve)));
async function request(path, options) {
  await ready;
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}
test('health, readiness and security headers do not need database writes', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal((await request('/ready')).status, 503);
});
test('CORS permits configured frontend and rejects other origins', async () => {
  assert.equal((await request('/health', { headers: { Origin: 'https://frontend.example.com' } })).headers.get('access-control-allow-origin'), 'https://frontend.example.com');
  assert.equal((await request('/health', { headers: { Origin: 'https://evil.example.com' } })).status, 403);
});
test('malformed JSON and database errors hide internal details', async t => {
  let response = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, 'Dados invalidos.');
  const original = User.findById;
  t.after(() => { User.findById = original; });
  User.findById = () => { throw new Error('private database credentials'); };
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
  response = await request('/users/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.message, 'Erro interno do servidor');
  assert.ok(body.errorId);
  assert.equal(JSON.stringify(body).includes('private'), false);
});
test('media cannot read financial records even when granted finance.view', async t => {
  const original = User.findById;
  t.after(() => { User.findById = original; });
  User.findById = () => ({ select: () => ({ lean: async () => ({ church: 'Adpv', role: 'Midia', permissions: ['finance.view'] }) }) });
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
  assert.equal((await request('/finance/entries', { headers: { Authorization: `Bearer ${token}` } })).status, 403);
});
test('repeated login attempts are rate limited without consulting database', async () => {
  let response;
  for (let i = 0; i < 12; i++) {
    response = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'rate-limit-invalid', password: 'invalid' }) });
    await response.arrayBuffer();
  }
  assert.equal(response.status, 429);
  assert.ok(response.headers.get('ratelimit'));
});
