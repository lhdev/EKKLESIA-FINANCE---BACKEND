const mongoose = require('mongoose');
const { ALLOWED_ROLES, ROLES } = require("../../../../shared/config/roles");
const { ALLOWED_PERMISSIONS } = require("../../../../shared/config/permissions");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  church: String,
  password: { type: String, select: false },
  role: { type: String, enum: ALLOWED_ROLES, default: ROLES.MEMBRO },
  permissions: {
    type: [{ type: String, enum: ALLOWED_PERMISSIONS }],
    default: undefined,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
