const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

const CreateUserUseCase = require("@application/usecases/CreateUserUseCase");
const ListUsersUseCase = require("@application/usecases/ListUsersUseCase");
const UpdateUserUseCase = require("@application/usecases/UpdateUserUseCase");
const DeleteUserUseCase = require("@application/usecases/DeleteUserUseCase");
const GetMeUseCase = require("@application/usecases/GetMeUseCase");

const UserRepositoryMongo = require("@infra/database/mongoose/UserRepositoryMongo");
const { ROLES } = require("@shared/config/roles");

const UserController = require("../controllers/UserController");

const router = express.Router();

const userRepository = new UserRepositoryMongo();

const createUserUC = new CreateUserUseCase(userRepository);
const listUsersUC = new ListUsersUseCase(userRepository);
const updateUserUC = new UpdateUserUseCase(userRepository);
const deleteUserUC = new DeleteUserUseCase(userRepository);
const getMeUC = new GetMeUseCase(userRepository);

const userController = new UserController(
  createUserUC,
  listUsersUC,
  updateUserUC,
  deleteUserUC,
  getMeUC
);

router.post("/", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) =>
  userController.create(req, res)
);

router.get("/", authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.FINANCEIRO]), (req, res) =>
  userController.list(req, res)
);

router.get("/me", authMiddleware, (req, res) => userController.me(req, res));

router.put("/me", authMiddleware, (req, res) => userController.updateMe(req, res));

router.put("/:id", authMiddleware, (req, res) => userController.update(req, res));

router.delete("/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) =>
  userController.delete(req, res)
);

module.exports = router;
