const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const permissionMiddleware = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../../../shared/config/permissions");
const ManageFinanceEntriesUseCase = require("../../../application/usecases/ManageFinanceEntriesUseCase");
const FinanceEntryController = require("../controllers/FinanceEntryController");
const ListDepartmentFinanceUseCase = require("../../../application/usecases/ListDepartmentFinanceUseCase");
const DepartmentFinanceController = require("../controllers/DepartmentFinanceController");

const router = express.Router();
const controller = new FinanceEntryController(new ManageFinanceEntriesUseCase());
const departmentController = new DepartmentFinanceController(
  new ListDepartmentFinanceUseCase()
);
router.use(authMiddleware);
router.get(
  "/entries",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  (req, res) => controller.list(req, res)
);
router.post(
  "/entries",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  (req, res) => controller.create(req, res)
);
router.put(
  "/entries/:id",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  (req, res) => controller.update(req, res)
);
router.delete(
  "/entries/:id",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  (req, res) => controller.delete(req, res)
);
router.get(
  "/departments",
  permissionMiddleware(PERMISSIONS.DEPARTMENTS_VIEW),
  (req, res) => departmentController.list(req, res)
);

module.exports = router;
