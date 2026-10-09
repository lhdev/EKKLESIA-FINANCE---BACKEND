require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserSchema = require("../mongoose/schemas/UserSchema");
const { ROLES } = require("../../../shared/config/roles");

const input = require('../../../shared/security/input');
const { validateChurch } = require('../../../shared/config/churches');
async function run() {
  const email = input.email(process.env.ADMIN_EMAIL);
  const password = input.password(process.env.ADMIN_PASSWORD);
  const church = validateChurch(process.env.ADMIN_CHURCH);
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI nao definida no .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await UserSchema.findOne({
    email,
  });

  if (existingAdmin) {
    console.log("Admin ja existe");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await UserSchema.create({
    name: "Administrador",
    email,
    password: passwordHash,
    role: ROLES.ADMIN,
    church,
  });

  console.log("Admin criado com sucesso");
  process.exit(0);
}

run().catch((err) => {
  console.error("Erro ao criar admin:", err.name);
  process.exit(1);
});
