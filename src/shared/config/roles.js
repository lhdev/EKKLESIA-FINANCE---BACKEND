const ROLES = Object.freeze({
  ADMIN: "Admin",
  FINANCEIRO: "Financeiro",
  MEMBRO: "Membro",
  MIDIA: "Midia",
});

const ROLE_ALIASES = Object.freeze({
  admin: ROLES.ADMIN,
  financeiro: ROLES.FINANCEIRO,
  finance: ROLES.FINANCEIRO,
  membro: ROLES.MEMBRO,
  user: ROLES.MEMBRO,
  midia: ROLES.MIDIA,
  media: ROLES.MIDIA,
});

function normalizeRole(role) {
  if (!role || typeof role !== "string") {
    return ROLES.MEMBRO;
  }

  const normalized = ROLE_ALIASES[role.trim().toLowerCase()];
  return normalized || role;
}

const ALLOWED_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  normalizeRole,
};
