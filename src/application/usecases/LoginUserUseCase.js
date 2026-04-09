const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("../../shared/errors/AppError");
const rolePermissions = require("../../shared/config/permissions");
const { normalizeRole } = require("../../shared/config/roles");

class LoginUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ email, password, church }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedChurch = typeof church === "string" ? church.trim() : church;

    let user = null;

    if (normalizedChurch) {
      user = await this.userRepository.findByEmailAndChurch(
        normalizedEmail,
        normalizedChurch,
        true
      );
    }

    // Compatibilidade com front legado: fallback por email quando church nao bater.
    if (!user) {
      user = await this.userRepository.findByEmail(normalizedEmail, true);
    }

    if (!user) {
      throw new AppError("Credenciais invalidas", 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError("Credenciais invalidas", 401);
    }

    const role = normalizeRole(user.role);
    const permissions = rolePermissions[role] || [];

    const token = jwt.sign(
      { id: user.id, church: user.church, role, permissions },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        church: user.church,
        role,
      },
      token,
    };
  }
}

module.exports = LoginUserUseCase;
