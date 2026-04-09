const { ROLES } = require("../../shared/config/roles");

class User {
  constructor({ id, name, email, church, password, role }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.church = church;
    this.password = password;
    this.role = role || ROLES.MEMBRO;
  }
}

module.exports = User;
