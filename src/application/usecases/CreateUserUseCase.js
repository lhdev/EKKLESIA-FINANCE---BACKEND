const bcrypt = require("bcryptjs");
const AppError = require("../../shared/errors/AppError");
const { normalizeRole } = require("../../shared/config/roles");
const {
  hasOnlyAllowedPermissions,
  normalizePermissions,
} = require("../../shared/config/permissions");

class CreateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ name, email, church, password, role, permissions }) {
    if (!name?.trim() || !email?.trim() || !password) {
      throw new AppError("Nome, email e senha sao obrigatorios", 400);
    }

    if (permissions !== undefined && !hasOnlyAllowedPermissions(permissions)) {
      throw new AppError("Permissoes invalidas", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedChurch = typeof church === "string" ? church.trim() : church;
    const normalizedRole = normalizeRole(role);

    const exists = normalizedChurch
      ? await this.userRepository.findByEmailAndChurch(normalizedEmail, normalizedChurch)
      : await this.userRepository.findByEmail(normalizedEmail);

    if (exists) {
      throw new AppError("Usuario ja existe", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    return this.userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      church: normalizedChurch,
      password: hashedPassword,
      role: normalizedRole,
      permissions: normalizePermissions(permissions, normalizedRole),
    });
  }
}

module.exports = CreateUserUseCase;
