const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
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

  async execute(data) {
    const name = data.name || data.nomeCompleto;
    const email = data.email;
    const church = data.church;
    const role = data.role || data.perfil;
    const permissions = data.permissions;
    const isMemberRecord =
      data.phone !== undefined ||
      data.telefone1 !== undefined ||
      data.birthDate !== undefined ||
      data.dataNascimento !== undefined ||
      data.isLeader !== undefined ||
      data.status !== undefined;
    const password = data.password ||
      (isMemberRecord ? crypto.randomBytes(24).toString("hex") : "");

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

    const normalizedStatus = String(data.status || data.situacao || "ACTIVE")
      .trim()
      .toUpperCase();
    const allowedStatuses = ["ACTIVE", "INACTIVE", "TRANSFERRED", "DISCIPLINE"];
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new AppError("Status de membro invalido", 400);
    }

    const rawChildren = data.childrenDetails || data.children;
    const childrenDetails = Array.isArray(rawChildren)
      ? rawChildren
          .map((child) => ({
            name: String(child?.name || child?.nome || "").trim(),
            birthDate: child?.birthDate || child?.dataNascimento || undefined,
          }))
          .filter((child) => child.name)
      : [];

    return this.userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: String(data.phone || data.telefone1 || "").trim(),
      birthDate: data.birthDate || data.dataNascimento || undefined,
      status: normalizedStatus,
      isLeader: data.isLeader === true || normalizeRole(role) === "Lider",
      photoUrl: String(data.photoUrl || data.fotoUrl || "").trim(),
      church: normalizedChurch,
      password: hashedPassword,
      role: normalizedRole,
      permissions: normalizePermissions(permissions, normalizedRole),
      profile: {
        cpf: data.cpf || "",
        address: data.address || data.endereco || "",
        gender: data.gender || data.sexo || "",
        maritalStatus: data.maritalStatus || data.estadoCivil || "",
        spouse: data.spouse || data.nomeConjuge || "",
        children: typeof data.children === "string"
          ? data.children
          : data.nomeFilhos || "",
        childrenDetails,
        father: data.father || data.filiacaoPai || "",
        mother: data.mother || data.filiacaoMae || "",
        baptized: data.baptized === true || data.batismoNasAguas === true,
        previousChurch: data.previousChurch || data.igrejaAnterior || "",
        previousPastor: data.previousPastor || data.pastorAnterior || "",
        positions: data.positions || data.cargosExercidos || "",
        desiredFunction:
          data.desiredFunction === true ||
          data.desejaExercerFuncao === true ||
          String(data.desiredFunction || data.desejaExercerFuncao || "")
            .trim()
            .toLowerCase() === "sim",
        admissionType: data.admissionType || data.tipoAdesao || "",
        newConvert: data.newConvert === true || data.novoConvertido === true,
      },
    });
  }
}

module.exports = CreateUserUseCase;
