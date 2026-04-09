const bcrypt = require("bcryptjs");
const AppError = require("../../shared/errors/AppError");
const { normalizeRole } = require("../../shared/config/roles");

class CreateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ name, email, church, password, role }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedChurch = typeof church === "string" ? church.trim() : church;

    const exists = normalizedChurch
      ? await this.userRepository.findByEmailAndChurch(normalizedEmail, normalizedChurch)
      : await this.userRepository.findByEmail(normalizedEmail);

    if (exists) {
      throw new AppError("Usuario ja existe", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    return this.userRepository.create({
      name,
      email: normalizedEmail,
      church: normalizedChurch,
      password: hashedPassword,
      role: normalizeRole(role),
    });
  }
}

module.exports = CreateUserUseCase;
