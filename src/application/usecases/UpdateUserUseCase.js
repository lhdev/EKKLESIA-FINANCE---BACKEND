const bcrypt = require("bcryptjs");
const AppError = require("../../shared/errors/AppError");
const { ROLES, normalizeRole } = require("../../shared/config/roles");

class UpdateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ id, requesterId, requesterRole, data }) {
    const normalizedRequesterRole = normalizeRole(requesterRole);
    const isAdmin = normalizedRequesterRole === ROLES.ADMIN;
    const isOwner = id === requesterId;

    if (!isAdmin && !isOwner) {
      throw new AppError("Sem permissao", 403);
    }

    const updateData = { ...data };

    if (!isAdmin && updateData.role) {
      throw new AppError("Somente admin pode alterar perfil de acesso", 403);
    }

    if (updateData.role) {
      updateData.role = normalizeRole(updateData.role);
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 8);
    }

    const user = await this.userRepository.update(id, updateData);
    if (!user) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    return user;
  }
}

module.exports = UpdateUserUseCase;
