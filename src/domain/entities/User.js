const { ROLES } = require("../../shared/config/roles");

class User {
  constructor({ id, name, email, church, password, role, permissions }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.church = church;
    this.password = password;
    this.role = role || ROLES.MEMBRO;
    this.permissions = permissions;
  }
}

module.exports = User;
