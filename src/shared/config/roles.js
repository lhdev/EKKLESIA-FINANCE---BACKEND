const ROLES = Object.freeze({
  ADMIN: "Admin",
  FINANCEIRO: "Financeiro",
  LIDER: "Lider",
  MEMBRO: "Membro",
  MIDIA: "Midia",
});

const ROLE_ALIASES = Object.freeze({
  admin: ROLES.ADMIN,
  financeiro: ROLES.FINANCEIRO,
  finance: ROLES.FINANCEIRO,
  lider: ROLES.LIDER,
  lideres: ROLES.LIDER,
  leader: ROLES.LIDER,
  membro: ROLES.MEMBRO,
  user: ROLES.MEMBRO,
  midia: ROLES.MIDIA,
  media: ROLES.MIDIA,
});

function normalizeRole(role) {
  if (!role || typeof role !== "string") {
    return ROLES.MEMBRO;
  }

  const roleKey = role
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const normalized = ROLE_ALIASES[roleKey];
  return normalized || role;
}

const ALLOWED_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  normalizeRole,
};
