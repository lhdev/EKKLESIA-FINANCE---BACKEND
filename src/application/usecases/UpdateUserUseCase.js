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

    const updateData = {};
    const requestedName = firstDefined(data.name, data.nomeCompleto);
    if (requestedName !== undefined) {
      if (!String(requestedName).trim()) {
        throw new AppError("Nome completo e obrigatorio", 400);
      }
      updateData.name = String(requestedName).trim();
    }

    const requestedPhone = firstDefined(data.phone, data.telefone1);
    if (requestedPhone !== undefined) {
      updateData.phone = String(requestedPhone).trim();
    }

    const requestedBirthDate = firstDefined(data.birthDate, data.dataNascimento);
    if (requestedBirthDate !== undefined) {
      updateData.birthDate = requestedBirthDate || null;
    }

    const requestedPhoto = firstDefined(data.photoUrl, data.fotoUrl);
    if (requestedPhoto !== undefined) {
      updateData.photoUrl = String(requestedPhoto).trim();
    }

    if (isAdmin && data.status !== undefined) updateData.status = data.status;
    if (isAdmin && data.isLeader !== undefined) updateData.isLeader = data.isLeader;

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
      updateData.role = normalizeRole(data.role);
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
      if (
        typeof data.password !== "string" ||
        data.password.length < 4
      ) {
        throw new AppError("A senha deve ter pelo menos 4 caracteres", 400);
      }

      updateData.password = await bcrypt.hash(data.password, 8);
    }

    return this.userRepository.update(id, updateData);
  }
}

module.exports = UpdateUserUseCase;
