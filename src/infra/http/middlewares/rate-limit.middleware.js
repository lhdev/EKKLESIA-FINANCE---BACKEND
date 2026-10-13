const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const crypto = require('node:crypto');

const message = { message: 'Muitas tentativas. Aguarde e tente novamente.' };
const options = { standardHeaders: 'draft-8', legacyHeaders: false, message };
const authLimiter = rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 50 });
const accountLimiter = rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 10,
  keyGenerator(req) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return crypto.createHash('sha256').update(email || ipKeyGenerator(req.ip)).digest('hex');
  }, skipSuccessfulRequests: true });
const uploadRateLimiter = rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 30,
  keyGenerator: req => req.user?.id || ipKeyGenerator(req.ip) });
let activeUploads = 0;
function uploadConcurrency(req, res, next) {
  if (activeUploads >= 2) return res.status(429).json(message);
  ++activeUploads;
  let released = false;
  const release = () => { if (!released) { released = true; --activeUploads; } };
  res.once('finish', release);
  res.once('close', release);
  next();
}
const uploadLimiter = [uploadRateLimiter, uploadConcurrency];
module.exports = { authLimiter, accountLimiter, uploadLimiter };
