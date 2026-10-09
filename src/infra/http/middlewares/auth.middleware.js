const jwt = require("jsonwebtoken");
const AppError = require("../../../shared/errors/AppError");
const { normalizeRole } = require("../../../shared/config/roles");
const { normalizePermissions } = require("../../../shared/config/permissions");
const { validateChurch } = require("../../../shared/config/churches");
const UserSchema = require("../../database/mongoose/schemas/UserSchema");

async function ensureAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token nao informado", 401);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded.id !== "string" || !decoded.id || decoded.id.length > 64) {
      throw new AppError("Token invalido", 401);
    }
    const currentUser = await UserSchema.findById(decoded.id)
      .select("church role permissions authVersion authEnabled")
      .lean();

    if (!currentUser) {
      throw new AppError("Usuario nao encontrado", 401);
    }

    if (currentUser.authEnabled === false || (decoded.authVersion || 0) !== (currentUser.authVersion || 0)) {
      throw new AppError("Sessao revogada", 401);
    }
    validateChurch(currentUser.church, 403);

    const role = normalizeRole(currentUser.role);
    req.user = {
      id: decoded.id,
      church: currentUser.church,
      permissions: normalizePermissions(currentUser.permissions, role),
      role,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
      throw new AppError("Token invalido ou expirado", 401);
    }
    throw error;
  }
}

module.exports = ensureAuthenticated;
