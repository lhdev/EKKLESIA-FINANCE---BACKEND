const jwt = require("jsonwebtoken");
const AppError = require("../../../shared/errors/AppError");
const { normalizeRole } = require("../../../shared/config/roles");

function ensureAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token não informado", 401);
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    throw new AppError("Token mal formatado", 401);
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    throw new AppError("Token mal formatado", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      church: decoded.church,
      permissions: decoded.permissions || [],
      role: normalizeRole(decoded.role),
    };

    return next();
  } catch (error) {
    throw new AppError("Token inválido ou expirado", 401);
  }
}

module.exports = ensureAuthenticated;
