const bcrypt = require("bcryptjs");
const AppError = require("../../shared/errors/AppError");
const { ROLES, normalizeRole } = require("../../shared/config/roles");
const {
  hasOnlyAllowedPermissions,
  normalizePermissions,
} = require("../../shared/config/permissions");

function sameChurch(first, second) {
  return (
    Boolean(first && second) &&
    first.trim().toLowerCase() === second.trim().toLowerCase()
  );
}

class UpdateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ id, requesterId, requesterRole, requesterChurch, data }) {
    const normalizedRequesterRole = normalizeRole(requesterRole);
    const isAdmin = normalizedRequesterRole === ROLES.ADMIN;
    const isOwner = id === requesterId;

    if (!isAdmin && !isOwner) {
      throw new AppError("Sem permissao", 403);
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    if (isAdmin && !sameChurch(existingUser.church, requesterChurch)) {
      throw new AppError("Sem permissao para alterar usuario de outra igreja", 403);
    }

    const updateData = { ...data };

    if (
      !isAdmin &&
      (updateData.role !== undefined || updateData.permissions !== undefined)
    ) {
      throw new AppError("Somente admin pode alterar perfil e permissoes", 403);
    }

    if (updateData.role) {
      updateData.role = normalizeRole(updateData.role);
    }

    if (updateData.permissions !== undefined) {
      if (!hasOnlyAllowedPermissions(updateData.permissions)) {
        throw new AppError("Permissoes invalidas", 400);
      }
      updateData.permissions = normalizePermissions(
        updateData.permissions,
        updateData.role || existingUser.role
      );
    }

    if (isAdmin && requesterChurch) {
      updateData.church = requesterChurch.trim();
    } else {
      delete updateData.church;
    }

    if (updateData.password !== undefined) {
      if (
        typeof updateData.password !== "string" ||
        updateData.password.length < 4
      ) {
        throw new AppError("A senha deve ter pelo menos 4 caracteres", 400);
      }

      updateData.password = await bcrypt.hash(updateData.password, 8);
    }

    return this.userRepository.update(id, updateData);
  }
}

module.exports = UpdateUserUseCase;
