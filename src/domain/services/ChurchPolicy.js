const AppError = require("../../shared/errors/AppError");

class ChurchPolicy {
  #allowedChurches;

  constructor(allowedChurches) {
    if (!Array.isArray(allowedChurches) || allowedChurches.some(
      (church) => typeof church !== "string" || !church.trim()
    )) {
      throw new TypeError("Lista de igrejas invalida");
    }

    this.#allowedChurches = new Set(
      allowedChurches.map((church) => church.trim().toLowerCase())
    );
  }

  isAllowedChurch(church) {
    return typeof church === "string" && this.#allowedChurches.has(church.trim().toLowerCase());
  }

  validateChurch(church, statusCode = 400) {
    if (typeof church !== "string" || !church.trim()) {
      throw new AppError("Igreja obrigatoria", statusCode);
    }

    if (!this.isAllowedChurch(church)) {
      throw new AppError("Igreja nao autorizada", statusCode);
    }

    // Preserve a grafia armazenada para manter a compatibilidade com contas legadas.
    return church.trim();
  }
}

module.exports = ChurchPolicy;
