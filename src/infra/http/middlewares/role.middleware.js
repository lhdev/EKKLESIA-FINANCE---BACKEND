const AppError = require("../../../shared/errors/AppError");
const { normalizeRole } = require("../../../shared/config/roles");

function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Usuario nao autenticado", 401);
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (!normalizedAllowedRoles.includes(userRole)) {
      throw new AppError("Acesso negado", 403);
    }

    return next();
  };
}

module.exports = roleMiddleware;
