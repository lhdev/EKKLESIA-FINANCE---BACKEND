const AppError = require("../../shared/errors/AppError");
const { ROLES, normalizeRole } = require("../../shared/config/roles");

class DeleteUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id, requesterRole) {
    if (normalizeRole(requesterRole) !== ROLES.ADMIN) {
      throw new AppError("Apenas admin pode deletar usuarios", 403);
    }

    const deletedUser = await this.userRepository.delete(id);
    if (!deletedUser) {
      throw new AppError("Usuario nao encontrado", 404);
    }
  }
}

module.exports = DeleteUserUseCase;
