const AppError = require('../errors/AppError');
const { ALLOWED_ROLES, normalizeRole } = require('../config/roles');

function text(value, name, { min = 0, max = 500 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new AppError(`${name} invalido`, 400);
  }
  return value.trim();
}
function email(value) {
  const normalized = text(value, 'Email', { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError('Email invalido', 400);
  }
  return normalized;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new AppError('A senha deve ter pelo menos 12 caracteres e no maximo 72 bytes', 400);
  }
  return value;
}
function role(value) {
  if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new AppError('Perfil invalido', 400);
  const normalized = normalizeRole(value);
  if (!ALLOWED_ROLES.includes(normalized)) throw new AppError('Perfil invalido', 400);
  return normalized;
}
function status(value) {
  if (typeof value !== 'string' || !['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DISCIPLINE'].includes(value.toUpperCase())) {
    throw new AppError('Status de membro invalido', 400);
  }
  return value.toUpperCase();
}
function boolean(value, name) {
  if (typeof value !== 'boolean') throw new AppError(`${name} invalido`, 400);
  return value;
}
function photo(value) {
  const normalized = text(value, 'URL da foto', { max: 2048 });
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
  } catch (_) { throw new AppError('A foto deve usar uma URL HTTPS valida', 400); }
  return normalized;
}
function date(value, { nullable = false } = {}) {
  if (nullable && (value === null || value === '')) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') throw new AppError('Data invalida', 400);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  const parsed = new Date(value);
  if (!match || Number.isNaN(parsed.getTime())) throw new AppError('Data invalida', 400);
  const calendar = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (calendar.getUTCFullYear() !== +match[1] || calendar.getUTCMonth() !== +match[2] - 1 || calendar.getUTCDate() !== +match[3]) {
    throw new AppError('Data invalida', 400);
  }
  return parsed;
}
function churchPattern(value) {
  const normalized = text(value, 'Igreja', { min: 1, max: 150 });
  return new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}
module.exports = { text, email, password, role, status, boolean, photo, date, churchPattern };
