const { ROLES, normalizeRole } = require("./roles");

const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",
  USERS_VIEW: "users.view",
  FINANCE_VIEW: "finance.view",
  DEPARTMENTS_VIEW: "departments.view",
  MEDIA_VIEW: "media.view",
});

const ALLOWED_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

const PERMISSION_ALIASES = Object.freeze({
  "users.read": PERMISSIONS.USERS_VIEW,
  "users.create": PERMISSIONS.USERS_VIEW,
  "users.update": PERMISSIONS.USERS_VIEW,
  "users.delete": PERMISSIONS.USERS_VIEW,
  "finance.read": PERMISSIONS.FINANCE_VIEW,
  "finance.write": PERMISSIONS.FINANCE_VIEW,
});

const rolePermissions = Object.freeze({
  [ROLES.ADMIN]: ALLOWED_PERMISSIONS,
  [ROLES.FINANCEIRO]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
  ],
  [ROLES.LIDER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FINANCE_VIEW,
  ],
  [ROLES.MEMBRO]: [PERMISSIONS.DASHBOARD_VIEW],
  [ROLES.MIDIA]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEDIA_VIEW,
  ],
});

function normalizePermission(permission) {
  if (typeof permission !== "string") return null;
  const value = permission.trim().toLowerCase();
  if (ALLOWED_PERMISSIONS.includes(value)) return value;
  return PERMISSION_ALIASES[value] || null;
}

function normalizePermissions(permissions, role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLES.ADMIN) {
    return [...rolePermissions[ROLES.ADMIN]];
  }

  const source = Array.isArray(permissions)
    ? permissions
    : rolePermissions[normalizedRole] || [];

  return [...new Set(source.map(normalizePermission).filter(Boolean))];
}

function hasOnlyAllowedPermissions(permissions) {
  return Array.isArray(permissions) && permissions.every(normalizePermission);
}

module.exports = {
  PERMISSIONS,
  ALLOWED_PERMISSIONS,
  rolePermissions,
  normalizePermission,
  normalizePermissions,
  hasOnlyAllowedPermissions,
};
