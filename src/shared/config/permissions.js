const { ROLES } = require("./roles");

const rolePermissions = {
  [ROLES.ADMIN]: [
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "finance.read"
  ],
  [ROLES.FINANCEIRO]: [
    "finance.read"
  ],
  [ROLES.LIDER]: [
    "finance.read",
    "finance.write"
  ],
  [ROLES.MEMBRO]: [],
  [ROLES.MIDIA]: [],
};

module.exports = rolePermissions;
