const multer = require('multer');
const crypto = require('node:crypto');
const AppError = require('../../../shared/errors/AppError');
function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof AppError) return res.status(error.statusCode).json({ message: error.message });
  if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Arquivo ou formulario excede os limites permitidos.' });
  if (error.code === 11000) return res.status(409).json({ message: 'Registro ja existe.' });
  if (['ValidationError', 'CastError'].includes(error.name) || error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dados invalidos.' });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Requisicao excede o limite permitido.' });
  const errorId = crypto.randomUUID();
  // No raw error, headers, body, URLs or credentials in logs.
  console.error(JSON.stringify({ errorId, errorType: error.name || 'Error', method: req.method }));
  return res.status(500).json({ message: 'Erro interno do servidor', errorId });
}
module.exports = errorMiddleware;
