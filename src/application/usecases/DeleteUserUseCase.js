const AppError = require("../../shared/errors/AppError");
const { ROLES, normalizeRole } = require("../../shared/config/roles");

class DeleteUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ id, requesterId, requesterRole, requesterChurch }) {
    if (normalizeRole(requesterRole) !== ROLES.ADMIN) {
      throw new AppError("Apenas admin pode deletar usuarios", 403);
    }

    if (id === requesterId) {
      throw new AppError("Administrador nao pode excluir a propria conta", 400);
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    const targetChurch = user.church?.trim().toLowerCase();
    const adminChurch = requesterChurch?.trim().toLowerCase();
    if (!targetChurch || targetChurch !== adminChurch) {
      throw new AppError("Sem permissao para excluir usuario de outra igreja", 403);
    }

    const deletedUser = await this.userRepository.delete(id);
    if (!deletedUser) {
      throw new AppError("Usuario nao encontrado", 404);
    }
  }
}

module.exports = DeleteUserUseCase;
