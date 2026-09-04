const { Router } = require("express");

const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const protectedRoutes = require("./protected.routes");
const userRoutes = require("./user.routes");
const financeRoutes = require("./finance.routes");

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/dashboard", dashboardRoutes);
routes.use("/protected", protectedRoutes);
routes.use("/users", userRoutes);
routes.use("/finance", financeRoutes);

module.exports = routes;
