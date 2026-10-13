const ChurchPolicy = require("../../domain/services/ChurchPolicy");

// Adicione manualmente novas igrejas autorizadas nesta lista.
const ALLOWED_CHURCHES = Object.freeze([
  "Adpv",
  "Rosa de Saron",
]);

const churchPolicy = new ChurchPolicy(ALLOWED_CHURCHES);
const isAllowedChurch = churchPolicy.isAllowedChurch.bind(churchPolicy);
const validateChurch = churchPolicy.validateChurch.bind(churchPolicy);

module.exports = { ALLOWED_CHURCHES, churchPolicy, isAllowedChurch, validateChurch };
