const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const input = require('../src/shared/security/input');
const { financeSummary } = require('../src/shared/security/finance');
const { validateMedia } = require('../src/shared/security/files');
const { validateXlsx } = require('../src/shared/security/xlsx');
const User = require('../src/infra/database/mongoose/schemas/UserSchema');
const { FinanceEntry } = require('../src/infra/database/mongoose/schemas/FinanceEntrySchema');
const auth = require('../src/infra/http/middlewares/auth.middleware');
const ManageFinance = require('../src/application/usecases/ManageFinanceEntriesUseCase');
const UpdateUser = require('../src/application/usecases/UpdateUserUseCase');
const CreateUser = require('../src/application/usecases/CreateUserUseCase');
const ImportUsers = require('../src/application/usecases/ImportUsersUseCase');
const Login = require('../src/application/usecases/LoginUserUseCase');
const { v2: cloudinary } = require('cloudinary');
const Storage = require('../src/infra/providers/CloudinaryMediaStorage');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
const memberId = '507f1f77bcf86cd799439011';
const entryId = '507f1f77bcf86cd799439012';
const payload = { type: 'CONTRIBUICAO', amountCents: 1050, category: 'DIZIMO', receiptUrl: 'https://example.com/r.pdf' };

test('validation rejects weak passwords, unknown roles, unsafe photos and invalid dates', () => {
  for (const value of ['short', 'á'.repeat(40), {}, null]) assert.throws(() => input.password(value));
  assert.equal(input.password('uma senha longa segura'), 'uma senha longa segura');
  for (const value of ['SUPER_ADMIN', {}, 123]) assert.throws(() => input.role(value));
  for (const value of ['http://example.com', 'file:///secret', 'https://user:pass@example.com']) assert.throws(() => input.photo(value));
  assert.throws(() => input.date('2026-02-31'));
  assert.throws(() => input.email({ $ne: null }));
});

test('inactive membership status does not suspend access; authEnabled does', async t => {
  const original = User.findById;
  t.after(() => { User.findById = original; });
  const token = jwt.sign({ id: memberId, authVersion: 0 }, process.env.JWT_SECRET);
  const req = () => ({ headers: { authorization: `Bearer ${token}` } });
  User.findById = () => ({ select: () => ({ lean: async () => ({ church: 'Adpv', role: 'Membro', status: 'INACTIVE', authEnabled: true }) }) });
  let called = false;
  await auth(req(), {}, () => { called = true; });
  assert.equal(called, true);
  User.findById = () => ({ select: () => ({ lean: async () => ({ church: 'Adpv', authEnabled: false }) }) });
  await assert.rejects(() => auth(req(), {}, () => {}), { statusCode: 401 });
});

test('tokens issued before credential/access change are revoked', async t => {
  const original = User.findById;
  t.after(() => { User.findById = original; });
  User.findById = () => ({ select: () => ({ lean: async () => ({ church: 'Adpv', authVersion: 2 }) }) });
  const token = jwt.sign({ id: memberId, authVersion: 1 }, process.env.JWT_SECRET);
  await assert.rejects(() => auth({ headers: { authorization: `Bearer ${token}` } }, {}, () => {}), { statusCode: 401 });
});

test('membership inactive can login with legacy short password', async () => {
  const user = { id: memberId, church: 'Adpv', role: 'Membro', status: 'INACTIVE', password: await bcrypt.hash('legacy', 4) };
  const repository = { findByEmail: async () => user };
  assert.ok((await new Login(repository).execute({ email: 'person@example.com', password: 'legacy' })).token);
  user.authEnabled = false;
  await assert.rejects(() => new Login(repository).execute({ email: 'person@example.com', password: 'legacy' }), { statusCode: 401 });
});

test('member and leader cannot self-confirm; denied requests write nothing', async t => {
  const original = FinanceEntry.create;
  t.after(() => { FinanceEntry.create = original; });
  FinanceEntry.create = () => assert.fail('Must not persist denied confirmation');
  for (const role of ['Membro', 'Lider', 'Midia']) {
    await assert.rejects(() => new ManageFinance().create({ church: 'Adpv', userId: memberId, role, data: { ...payload, status: 'CONFIRMADO' } }), { statusCode: 403 });
  }
});

test('confirmation records confirmer; receipt is preserved against forged PUT fields', async t => {
  const original = FinanceEntry.findOneAndUpdate;
  t.after(() => { FinanceEntry.findOneAndUpdate = original; });
  let saved;
  FinanceEntry.findOneAndUpdate = async (_filter, data) => { saved = data; return { _id: entryId, ...data }; };
  await new ManageFinance().update({ id: entryId, church: 'Adpv', userId: memberId, role: 'Financeiro', data: { ...payload, type: 'DESPESA', status: 'CONFIRMADO', receiptStorageId: 'someone-else', receiptDeliveryType: 'authenticated' } });
  assert.equal(saved.type, 'DESPESA');
  assert.equal(saved.confirmedBy, memberId);
  assert.ok(saved.confirmedAt instanceof Date);
  assert.equal(saved.receiptUrl, undefined);
  assert.equal(saved.receiptStorageId, undefined);
});

test('leader edits and deletes only their pending entries', async t => {
  const update = FinanceEntry.findOneAndUpdate;
  const remove = FinanceEntry.findOneAndDelete;
  t.after(() => { FinanceEntry.findOneAndUpdate = update; FinanceEntry.findOneAndDelete = remove; });
  let filter;
  FinanceEntry.findOneAndUpdate = async f => { filter = f; return { _id: entryId }; };
  await new ManageFinance().update({ id: entryId, church: 'Adpv', userId: memberId, role: 'Lider', data: payload });
  assert.deepEqual(filter, { _id: entryId, church: /^Adpv$/i, createdBy: memberId, status: 'PENDENTE' });
  FinanceEntry.findOneAndDelete = async f => { filter = f; return { _id: entryId }; };
  await new ManageFinance().delete({ id: entryId, church: 'Adpv', userId: memberId, role: 'Lider' });
  assert.equal(filter.status, 'PENDENTE');
});

test('available balance excludes pending and detects integer overflow', () => {
  const summary = financeSummary([
    { type: 'CONTRIBUICAO', amountCents: 10000, status: 'CONFIRMADO' },
    { type: 'DESPESA', amountCents: 2000, status: 'CONFIRMADO' },
    { type: 'CONTRIBUICAO', amountCents: 5000, status: 'PENDENTE' },
  ]);
  assert.equal(summary.balanceCents, 8000);
  assert.equal(summary.pendingContributionsCents, 5000);
  assert.throws(() => financeSummary([{ type: 'CONTRIBUICAO', status: 'CONFIRMADO', amountCents: Number.MAX_SAFE_INTEGER }, { type: 'CONTRIBUICAO', status: 'CONFIRMADO', amountCents: 1 }]));
});

test('admin reset and disable access increment session version; status alone does not', async () => {
  let update;
  const repository = { findById: async () => ({ id: memberId, church: 'Adpv', role: 'Membro' }), update: async (_id, data) => { update = data; return data; } };
  const change = data => new UpdateUser(repository).execute({ id: memberId, requesterId: 'admin', requesterRole: 'Admin', requesterChurch: 'Adpv', data });
  await change({ authEnabled: false });
  assert.deepEqual(update.$inc, { authVersion: 1 });
  await change({ status: 'INACTIVE' });
  assert.equal(update.$inc, undefined);
  await change({ password: 'uma senha nova segura' });
  assert.deepEqual(update.$inc, { authVersion: 1 });
});

test('owner must reauthenticate before password change and cannot suspend another account', async () => {
  const repository = { findById: async () => ({ id: memberId, email: 'p@example.com', church: 'Adpv' }), findByEmail: async () => ({ password: await bcrypt.hash('old-password', 4) }), update: async () => assert.fail('No write on failed reauthentication') };
  const change = data => new UpdateUser(repository).execute({ id: memberId, requesterId: memberId, requesterRole: 'Membro', requesterChurch: 'Adpv', data });
  await assert.rejects(() => change({ password: 'uma senha nova segura', currentPassword: 'wrong' }), { statusCode: 403 });
  await assert.rejects(() => change({ authEnabled: false }), { statusCode: 403 });
});

test('unknown role/status and unsafe profile URL never reach persistence', async () => {
  const repository = { findById: async () => ({ id: memberId, church: 'Adpv' }), update: async () => assert.fail('No invalid write') };
  for (const data of [{ role: 'SUPER_ADMIN' }, { status: 'unexpected' }, { isLeader: 'false' }, { photoUrl: 'file:///tmp/private' }]) {
    await assert.rejects(() => new UpdateUser(repository).execute({ id: memberId, requesterId: 'admin', requesterRole: 'Admin', requesterChurch: 'Adpv', data }), { statusCode: 400 });
  }
});

test('uploads do not reuse names and authenticated receipts use expiring URLs', async t => {
  const original = cloudinary.uploader.upload;
  t.after(() => { cloudinary.uploader.upload = original; });
  const options = [];
  cloudinary.uploader.upload = async (_bytes, opt) => { options.push(opt); return { public_id: opt.public_id, secure_url: 'https://example.com/image', resource_type: 'image', format: 'png' }; };
  const storage = new Storage();
  await storage.upload({ bytes: Buffer.from('test'), fileName: 'same.png', folder: 'receipts', deliveryType: 'authenticated' });
  await storage.upload({ bytes: Buffer.from('test'), fileName: 'same.png', folder: 'receipts', deliveryType: 'authenticated' });
  assert.notEqual(options[0].public_id, options[1].public_id);
  assert.equal(options[0].overwrite, false);
  assert.equal(options[0].type, 'authenticated');
  const download = cloudinary.utils.private_download_url;
  t.after(() => { cloudinary.utils.private_download_url = download; });
  cloudinary.utils.private_download_url = (_id, _format, opt) => { assert.equal(opt.type, 'authenticated'); assert.ok(opt.expires_at <= Date.now() / 1000 + 601); return 'https://example.com/temporary'; };
  assert.equal(storage.receiptUrl({ receiptDeliveryType: 'authenticated', receiptStorageId: 'private', receiptFormat: 'png', receiptResourceType: 'image' }), 'https://example.com/temporary');
});

test('SVG, HTML disguised as JPG and invalid XLSX are rejected', async () => {
  assert.throws(() => validateMedia({ buffer: Buffer.from('<script>alert(1)</script>'), mimetype: 'image/jpeg' }));
  assert.throws(() => validateMedia({ buffer: Buffer.from('<svg></svg>'), mimetype: 'image/svg+xml' }));
  assert.equal(validateMedia({ buffer: Buffer.from('%PDF-1.7\n test'), mimetype: 'application/pdf' }, { allowPdf: true }), 'pdf');
  assert.throws(() => validateMedia({ buffer: Buffer.from('%PDF-1.7\n test'), mimetype: 'application/pdf' }));
  await assert.rejects(() => validateXlsx(Buffer.from('fake spreadsheet')), { statusCode: 400 });
});

test('import validates the entire batch before writing and rejects duplicate emails', async () => {
  let writes = 0;
  const create = new CreateUser({ findByEmailAndChurch: async () => null, createMany: async () => { ++writes; } });
  const file = { originalname: 'members.csv', buffer: Buffer.from('nome,email,telefone,perfil\nPerson,p@example.com,123,Membro\nOther,P@example.com,456,Membro') };
  await assert.rejects(() => new ImportUsers(create).execute({ file, church: 'Adpv' }), { statusCode: 400 });
  file.buffer = Buffer.from('nome,email,telefone,perfil\nPerson,p@example.com,123,Membro\nOther,q@example.com,456,SUPER_ADMIN');
  await assert.rejects(() => new ImportUsers(create).execute({ file, church: 'Adpv' }), { statusCode: 400 });
  assert.equal(writes, 0);
});


test('church scope matches legacy case differences but never another tenant', () => {
  const pattern = input.churchPattern('  ADPV ');
  assert.equal(pattern.test('adpv'), true);
  assert.equal(pattern.test('Other Adpv'), false);
  assert.equal(input.churchPattern('Church . A').test('Church x A'), false);
});
