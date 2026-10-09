const roleMiddleware = require("../middlewares/role.middleware");
const { ROLES } = require("../../../shared/config/roles");
const { uploadLimiter } = require("../middlewares/rate-limit.middleware");
const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const permissionMiddleware = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../../../shared/config/permissions");
const ManageFinanceEntriesUseCase = require("../../../application/usecases/ManageFinanceEntriesUseCase");
const FinanceEntryController = require("../controllers/FinanceEntryController");
const ListDepartmentFinanceUseCase = require("../../../application/usecases/ListDepartmentFinanceUseCase");
const DepartmentFinanceController = require("../controllers/DepartmentFinanceController");
const CloudinaryMediaStorage = require("../../providers/CloudinaryMediaStorage");
const { uploadFinanceReceipt } = require("../middlewares/upload.middleware");

const router = express.Router();
const controller = new FinanceEntryController(
  new ManageFinanceEntriesUseCase(),
  new CloudinaryMediaStorage()
);
const departmentController = new DepartmentFinanceController(
  new ListDepartmentFinanceUseCase()
);
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER, ROLES.MEMBRO]));
router.get(
  "/entries",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  (req, res) => controller.list(req, res)
);
router.post(
  "/entries",
  permissionMiddleware(PERMISSIONS.FINANCE_VIEW),
  uploadLimiter,
  uploadFinanceReceipt.single("receipt"),
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
