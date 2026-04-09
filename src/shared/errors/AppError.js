class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.message = message;
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
