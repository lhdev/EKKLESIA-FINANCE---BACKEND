const mongoose = require('mongoose');
const { ALLOWED_ROLES, ROLES } = require("../../../../shared/config/roles");
const { ALLOWED_PERMISSIONS } = require("../../../../shared/config/permissions");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, default: "" },
  birthDate: Date,
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "TRANSFERRED", "DISCIPLINE"],
    default: "ACTIVE",
  },
  isLeader: { type: Boolean, default: false },
  photoUrl: { type: String, default: "" },
  church: String,
  password: { type: String, select: false },
  role: { type: String, enum: ALLOWED_ROLES, default: ROLES.MEMBRO },
  permissions: {
    type: [{ type: String, enum: ALLOWED_PERMISSIONS }],
    default: undefined,
  },
  profile: {
    cpf: { type: String, default: "" },
    address: { type: String, default: "" },
    gender: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    spouse: { type: String, default: "" },
    children: { type: String, default: "" },
    childrenDetails: [{
      _id: false,
      name: { type: String, default: "" },
      birthDate: Date,
    }],
    father: { type: String, default: "" },
    mother: { type: String, default: "" },
    baptized: { type: Boolean, default: false },
    previousChurch: { type: String, default: "" },
    previousPastor: { type: String, default: "" },
    positions: { type: String, default: "" },
    desiredFunction: { type: Boolean, default: false },
    admissionType: { type: String, default: "" },
    newConvert: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
