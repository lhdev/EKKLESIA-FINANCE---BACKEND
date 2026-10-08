const AppError = require("../errors/AppError");

// Adicione manualmente novas igrejas autorizadas nesta lista.
const ALLOWED_CHURCHES = Object.freeze([
  "Adpv",
]);

function isAllowedChurch(church) {
  if (typeof church !== "string" || !church.trim()) return false;

  const normalizedChurch = church.trim().toLowerCase();
  return ALLOWED_CHURCHES.some(
    (allowedChurch) => allowedChurch.trim().toLowerCase() === normalizedChurch
  );
}

function validateChurch(church, statusCode = 400) {
  if (typeof church !== "string" || !church.trim()) {
    throw new AppError("Igreja obrigatoria", statusCode);
  }

  if (!isAllowedChurch(church)) {
    throw new AppError("Igreja nao autorizada", statusCode);
  }

  return church.trim();
}

module.exports = { ALLOWED_CHURCHES, isAllowedChurch, validateChurch };
