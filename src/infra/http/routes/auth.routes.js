const express = require("express");

const UserRepositoryMongo = require("../../database/mongoose/UserRepositoryMongo");
const RegisterUserUseCase = require("../../../application/usecases/RegisterUserUseCase");
const LoginUserUseCase = require("../../../application/usecases/LoginUserUseCase");
const GetMeUseCase = require("../../../application/usecases/GetMeUseCase");
const AuthController = require("../controllers/AuthController");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

const userRepo = new UserRepositoryMongo();
const registerUC = new RegisterUserUseCase(userRepo);
const loginUC = new LoginUserUseCase(userRepo);
const getMeUC = new GetMeUseCase(userRepo);
const controller = new AuthController(registerUC, loginUC, getMeUC);

router.post("/register", (req, res) => controller.register(req, res));
router.post("/login", (req, res) => controller.login(req, res));
router.get("/me", authMiddleware, (req, res) => controller.me(req, res));

module.exports = router;
