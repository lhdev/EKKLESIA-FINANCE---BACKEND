const express = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { uploadDashboardImage } = require('../middlewares/upload.middleware');

const ListDashboardImagesUseCase = require('@application/usecases/ListDashboardImagesUseCase');
const CreateDashboardImageUseCase = require('@application/usecases/CreateDashboardImageUseCase');
const DeleteDashboardImageUseCase = require('@application/usecases/DeleteDashboardImageUseCase');
const UpdateDashboardImageUseCase = require('@application/usecases/UpdateDashboardImageUseCase');
const DashboardImageRepositoryMongo = require('@infra/database/mongoose/DashboardImageRepositoryMongo');
const CloudinaryMediaStorage = require('@infra/providers/CloudinaryMediaStorage');
const DashboardImageController = require('../controllers/DashboardImageController');
const { ROLES } = require('@shared/config/roles');

const router = express.Router();

const dashboardImageRepository = new DashboardImageRepositoryMongo();
const mediaStorage = new CloudinaryMediaStorage();
const listDashboardImagesUseCase = new ListDashboardImagesUseCase(
  dashboardImageRepository
);
const createDashboardImageUseCase = new CreateDashboardImageUseCase(
  dashboardImageRepository
);
const deleteDashboardImageUseCase = new DeleteDashboardImageUseCase(
  dashboardImageRepository
);
const updateDashboardImageUseCase = new UpdateDashboardImageUseCase(
  dashboardImageRepository
);

const dashboardImageController = new DashboardImageController(
  listDashboardImagesUseCase,
  createDashboardImageUseCase,
  deleteDashboardImageUseCase,
  updateDashboardImageUseCase,
  mediaStorage
);

router.get('/images', authMiddleware, (req, res) =>
  dashboardImageController.list(req, res)
);

router.post(
  '/images',
  authMiddleware,
  roleMiddleware([ROLES.MIDIA]),
  (req, res) => dashboardImageController.create(req, res)
);

router.post(
  '/images/upload',
  authMiddleware,
  roleMiddleware([ROLES.MIDIA]),
  uploadDashboardImage.single('image'),
  (req, res) => dashboardImageController.upload(req, res)
);

router.delete(
  '/images/:id',
  authMiddleware,
  roleMiddleware([ROLES.MIDIA]),
  (req, res) => dashboardImageController.delete(req, res)
);

module.exports = router;
