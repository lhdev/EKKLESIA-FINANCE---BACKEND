const multer = require('multer');
const AppError = require("../../../shared/errors/AppError");

function errorMiddleware(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'O arquivo excede o limite permitido de 10MB.',
      });
    }

    return res.status(400).json({ message: error.message });
  }

  if (error instanceof Error) {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Erro interno do servidor" });
}

module.exports = errorMiddleware;
