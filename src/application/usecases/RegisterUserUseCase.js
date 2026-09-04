const bcrypt = require("bcryptjs");
const AppError = require("../../shared/errors/AppError");
const { ROLES } = require("../../shared/config/roles");

class RegisterUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ name, email, church, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedChurch = typeof church === "string" ? church.trim() : church;

    const userExists = normalizedChurch
      ? await this.userRepository.findByEmailAndChurch(normalizedEmail, normalizedChurch)
      : await this.userRepository.findByEmail(normalizedEmail);

    if (userExists) {
      throw new AppError("Usuario ja existe", 400);
    }

    const hash = await bcrypt.hash(password, 10);

    return this.userRepository.create({
      name,
      email: normalizedEmail,
      church: normalizedChurch,
      password: hash,
      // Perfis privilegiados so podem ser atribuidos pela rota autenticada de usuarios.
      role: ROLES.MEMBRO,
    });
  }
}

module.exports = RegisterUserUseCase;
