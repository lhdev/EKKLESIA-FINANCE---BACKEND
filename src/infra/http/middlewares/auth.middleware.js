const jwt = require("jsonwebtoken");
const AppError = require("../../../shared/errors/AppError");
const { normalizeRole } = require("../../../shared/config/roles");
const rolePermissions = require("../../../shared/config/permissions");
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await UserSchema.findById(decoded.id)
      .select("church role")
      .lean();

    if (!currentUser) {
      throw new AppError("Usuario nao encontrado", 401);
    }

    const role = normalizeRole(currentUser.role);
    req.user = {
      id: decoded.id,
      church: currentUser.church,
      permissions: rolePermissions[role] || [],
      role,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token invalido ou expirado", 401);
  }
}

module.exports = ensureAuthenticated;
