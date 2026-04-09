const { Router } = require("express");

const authRoutes = require("./auth.routes");
const protectedRoutes = require("./protected.routes");
const userRoutes = require("./user.routes");

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/protected", protectedRoutes);
routes.use("/users", userRoutes);

module.exports = routes;
