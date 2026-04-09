const mongoose = require('mongoose');
const { ALLOWED_ROLES, ROLES } = require("../../../../shared/config/roles");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  church: String,
  password: { type: String, select: false },
  role: { type: String, enum: ALLOWED_ROLES, default: ROLES.MEMBRO }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
