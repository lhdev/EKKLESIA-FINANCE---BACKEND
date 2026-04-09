const UserRepository = require("../../../domain/repositories/UserRepository");
const UserSchema = require("./schemas/UserSchema");
const { normalizeRole } = require("../../../shared/config/roles");

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactInsensitive(value) {
  return new RegExp(`^${escapeRegExp(value)}$`, "i");
}

function mapUser(user, { includePassword = false } = {}) {
  if (!user) {
    return null;
  }

  const mappedUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    church: user.church,
    role: normalizeRole(user.role),
  };

  if (includePassword && user.password) {
    mappedUser.password = user.password;
  }

  return mappedUser;
}

class UserRepositoryMongo extends UserRepository {
  async findByEmail(email, withPassword = false) {
    const query = UserSchema.findOne({ email: exactInsensitive(email) });
    if (withPassword) {
      query.select("+password");
    }

    const user = await query;
    return mapUser(user, { includePassword: withPassword });
  }

  async findByEmailAndChurch(email, church, withPassword = false) {
    const query = UserSchema.findOne({
      email: exactInsensitive(email),
      church: exactInsensitive(church),
    });
    if (withPassword) {
      query.select("+password");
    }

    const user = await query;
    return mapUser(user, { includePassword: withPassword });
  }

  async findAll() {
    const users = await UserSchema.find().select("-password");
    return users.map((user) => mapUser(user));
  }

  async update(id, data) {
    const user = await UserSchema.findByIdAndUpdate(id, data, { new: true }).select("-password");
    return mapUser(user);
  }

  async delete(id) {
    return UserSchema.findByIdAndDelete(id);
  }

  async findById(id) {
    const user = await UserSchema.findById(id).select("-password");
    return mapUser(user);
  }

  async create(data) {
    const user = await UserSchema.create(data);
    return mapUser(user);
  }
}

module.exports = UserRepositoryMongo;
