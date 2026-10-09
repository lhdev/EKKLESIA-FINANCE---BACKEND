const bcrypt = require("bcryptjs");
const input = require('../../shared/security/input');
const jwt = require("jsonwebtoken");
const AppError = require("../../shared/errors/AppError");
const { normalizePermissions } = require("../../shared/config/permissions");
const { normalizeRole } = require("../../shared/config/roles");
const { validateChurch } = require("../../shared/config/churches");

class LoginUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ email, password, church }) {
    const normalizedEmail = input.email(email);
    if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
      throw new AppError('Credenciais invalidas', 401);
    }
    // Clientes legados podem omitir a igreja; nesse caso, validamos a da conta.
    const normalizedChurch = church === undefined
      ? undefined
      : validateChurch(church);

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

    if (
      user.church &&
      normalizedChurch &&
      user.church.trim().toLowerCase() !== normalizedChurch.toLowerCase()
    ) {
      throw new AppError("Credenciais invalidas", 401);
    }

    if (user.authEnabled === false || typeof user.password !== 'string') {
      throw new AppError('Credenciais invalidas', 401);
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError("Credenciais invalidas", 401);
    }

    validateChurch(user.church || normalizedChurch);

    // Contas criadas antes da obrigatoriedade de igreja sao vinculadas
    // com seguranca somente depois da senha ter sido validada.
    if (!user.church && normalizedChurch) {
      await this.userRepository.update(user.id, { church: normalizedChurch });
      user.church = normalizedChurch;
    }

    const role = normalizeRole(user.role);
    const permissions = normalizePermissions(user.permissions, role);

    const token = jwt.sign(
      { id: user.id, church: user.church, authVersion: user.authVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "1d", algorithm: "HS256" }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        church: user.church,
        role,
        permissions,
      },
      token,
    };
  }
}

module.exports = LoginUserUseCase;
