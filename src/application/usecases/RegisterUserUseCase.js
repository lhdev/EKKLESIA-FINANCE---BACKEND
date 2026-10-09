const bcrypt = require("bcryptjs");
const input = require('../../shared/security/input');
const AppError = require("../../shared/errors/AppError");
const { ROLES } = require("../../shared/config/roles");
const { validateChurch } = require("../../shared/config/churches");

class RegisterUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ name, email, church, password }) {
    const normalizedEmail = input.email(email);
    name = input.text(name, 'Nome', { min: 1, max: 150 });
    input.password(password);
    const normalizedChurch = validateChurch(church);

    const userExists = normalizedChurch
      ? await this.userRepository.findByEmailAndChurch(normalizedEmail, normalizedChurch)
      : await this.userRepository.findByEmail(normalizedEmail);

    if (userExists) {
      throw new AppError("Usuario ja existe", 400);
    }

    const hash = await bcrypt.hash(password, 12);

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
