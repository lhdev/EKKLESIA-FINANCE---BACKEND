require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserSchema = require("../mongoose/schemas/UserSchema");
const { ROLES } = require("../../../shared/config/roles");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI nao definida no .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await UserSchema.findOne({
    email: "admin@ekklesia.com",
  });

  if (existingAdmin) {
    console.log("Admin ja existe");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("123456", 10);

  await UserSchema.create({
    name: "Administrador",
    email: "admin@ekklesia.com",
    password: passwordHash,
    role: ROLES.ADMIN,
  });

  console.log("Admin criado com sucesso");
  process.exit(0);
}

run().catch((err) => {
  console.error("Erro ao criar admin:", err);
  process.exit(1);
});
