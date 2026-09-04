const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const { ROLES } = require("../../../shared/config/roles");
const ManageFinanceEntriesUseCase = require("../../../application/usecases/ManageFinanceEntriesUseCase");
const FinanceEntryController = require("../controllers/FinanceEntryController");

const router = express.Router();
const controller = new FinanceEntryController(new ManageFinanceEntriesUseCase());
const financeRoles = [ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER];

router.use(authMiddleware, roleMiddleware(financeRoles));
router.get("/entries", (req, res) => controller.list(req, res));
router.post("/entries", (req, res) => controller.create(req, res));
router.put("/entries/:id", (req, res) => controller.update(req, res));
router.delete("/entries/:id", (req, res) => controller.delete(req, res));

module.exports = router;
