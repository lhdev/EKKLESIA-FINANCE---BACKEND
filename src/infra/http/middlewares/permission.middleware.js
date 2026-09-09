const AppError = require("../../../shared/errors/AppError");
const { normalizePermission } = require("../../../shared/config/permissions");

function permissionMiddleware(requiredPermission) {
  const normalizedRequiredPermission = normalizePermission(requiredPermission);

  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Usuario nao autenticado", 401);
    }

    const permissions = req.user.permissions || [];
    if (!permissions.includes(normalizedRequiredPermission)) {
      throw new AppError("Acesso negado", 403);
    }

    return next();
  };
}

module.exports = permissionMiddleware;
