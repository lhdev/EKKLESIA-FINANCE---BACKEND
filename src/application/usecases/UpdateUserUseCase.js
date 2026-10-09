const bcrypt = require("bcryptjs");
const input = require('../../shared/security/input');
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

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function plainObject(value) {
  if (!value) return {};
  return value.toObject?.() || { ...value };
}

function normalizeChildren(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((child) => ({
      name: String(child?.name || child?.nome || "").trim(),
      birthDate: child?.birthDate || child?.dataNascimento || undefined,
    }))
    .filter((child) => child.name);
}

class UpdateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ id, requesterId, requesterRole, requesterChurch, data }) {
    const normalizedRequesterRole = normalizeRole(requesterRole);
    const isAdmin = normalizedRequesterRole === ROLES.ADMIN;
    const isOwner = String(id) === String(requesterId);

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

    const updateData = {};
    const requestedName = firstDefined(data.name, data.nomeCompleto);
    if (requestedName !== undefined) {
      if (!String(requestedName).trim()) {
        throw new AppError("Nome completo e obrigatorio", 400);
      }
      updateData.name = input.text(requestedName, 'Nome', { min: 1, max: 150 });
    }

    const requestedPhone = firstDefined(data.phone, data.telefone1);
    if (requestedPhone !== undefined) {
      updateData.phone = String(requestedPhone).trim();
    }

    if (isAdmin && data.email !== undefined) {
      const normalizedEmail = input.email(data.email);
      if (!normalizedEmail) {
        throw new AppError("Email e obrigatorio", 400);
      }
      const emailOwner = await this.userRepository.findByEmailAndChurch(
        normalizedEmail,
        requesterChurch
      );
      if (emailOwner && String(emailOwner.id) !== String(id)) {
        throw new AppError("Email ja cadastrado", 400);
      }
      updateData.email = normalizedEmail;
    }

    const requestedBirthDate = firstDefined(data.birthDate, data.dataNascimento);
    if (requestedBirthDate !== undefined) {
      updateData.birthDate = input.date(requestedBirthDate, { nullable: true });
    }

    const requestedPhoto = firstDefined(data.photoUrl, data.fotoUrl);
    if (requestedPhoto !== undefined) {
      updateData.photoUrl = input.photo(requestedPhoto);
    }

    if (isAdmin && data.status !== undefined) updateData.status = input.status(data.status);
    if (data.authEnabled !== undefined) {
      if (!isAdmin) throw new AppError("Somente admin pode alterar acesso", 403);
      updateData.authEnabled = input.boolean(data.authEnabled, "Acesso");
    }
    if (isAdmin && data.isLeader !== undefined) updateData.isLeader = input.boolean(data.isLeader, "Lider");

    const incomingProfile = plainObject(data.profile);
    const existingProfile = plainObject(existingUser.profile);
    const profileAliases = {
      cpf: [data.cpf, incomingProfile.cpf],
      address: [data.address, data.endereco, incomingProfile.address],
      gender: [data.gender, data.sexo, incomingProfile.gender],
      maritalStatus: [data.maritalStatus, data.estadoCivil, incomingProfile.maritalStatus],
      spouse: [data.spouse, data.nomeConjuge, incomingProfile.spouse],
      children: [
        data.nomeFilhos,
        typeof incomingProfile.children === "string"
          ? incomingProfile.children
          : undefined,
      ],
      father: [data.father, data.filiacaoPai, incomingProfile.father],
      mother: [data.mother, data.filiacaoMae, incomingProfile.mother],
      baptized: [data.baptized, data.batismoNasAguas, incomingProfile.baptized],
      previousChurch: [data.previousChurch, data.igrejaAnterior, incomingProfile.previousChurch],
      previousPastor: [data.previousPastor, data.pastorAnterior, incomingProfile.previousPastor],
      positions: [data.positions, data.cargosExercidos, incomingProfile.positions],
      desiredFunction: [data.desiredFunction, data.desejaExercerFuncao, incomingProfile.desiredFunction],
      admissionType: [data.admissionType, data.tipoAdesao, incomingProfile.admissionType],
      newConvert: [data.newConvert, data.novoConvertido, incomingProfile.newConvert],
    };
    const nextProfile = { ...existingProfile };
    let hasProfileUpdate = false;
    for (const [key, candidates] of Object.entries(profileAliases)) {
      const value = firstDefined(...candidates);
      if (value !== undefined) {
        nextProfile[key] = key === "desiredFunction"
          ? value === true || ["true", "sim", "1"].includes(String(value).toLowerCase())
          : value;
        hasProfileUpdate = true;
      }
    }
    const childrenDetails = normalizeChildren(
      firstDefined(data.childrenDetails, data.children, incomingProfile.childrenDetails)
    );
    if (childrenDetails !== undefined) {
      nextProfile.childrenDetails = childrenDetails;
      hasProfileUpdate = true;
    }
    if (hasProfileUpdate) updateData.profile = nextProfile;

    if (
      !isAdmin &&
      (data.role !== undefined || data.permissions !== undefined)
    ) {
      throw new AppError("Somente admin pode alterar perfil e permissoes", 403);
    }

    if (data.role) {
      updateData.role = input.role(data.role);
    }

    if (data.permissions !== undefined) {
      if (!hasOnlyAllowedPermissions(data.permissions)) {
        throw new AppError("Permissoes invalidas", 400);
      }
      updateData.permissions = normalizePermissions(
        data.permissions,
        updateData.role || existingUser.role
      );
    }

    if (isAdmin && requesterChurch) {
      updateData.church = requesterChurch.trim();
    } else {
      delete updateData.church;
    }

    if (data.password !== undefined) {
      input.password(data.password);
      if (isOwner) {
        const credentials = await this.userRepository.findByEmail(existingUser.email, true);
        if (typeof data.currentPassword !== 'string' || !credentials?.password ||
            !await bcrypt.compare(data.currentPassword, credentials.password)) {
          throw new AppError('Informe a senha atual para alterar sua senha', 403);
        }
      }
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    if (['password', 'role', 'permissions', 'authEnabled'].some(key => updateData[key] !== undefined)) {
      updateData.$inc = { authVersion: 1 };
    }

    return this.userRepository.update(id, updateData);
  }
}

module.exports = UpdateUserUseCase;
