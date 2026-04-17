const fs = require('fs/promises');
const path = require('path');

class DashboardImageController {
  constructor(
    listDashboardImagesUseCase,
    createDashboardImageUseCase,
    deleteDashboardImageUseCase
  ) {
    this.listDashboardImagesUseCase = listDashboardImagesUseCase;
    this.createDashboardImageUseCase = createDashboardImageUseCase;
    this.deleteDashboardImageUseCase = deleteDashboardImageUseCase;
  }

  async list(_req, res) {
    const images = await this.listDashboardImagesUseCase.execute();
    return res.json({ images });
  }

  async create(req, res) {
    const image = await this.createDashboardImageUseCase.execute({
      imageUrl: req.body.imageUrl,
      createdBy: req.user.id,
    });

    return res.status(201).json(image);
  }

  async upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem nao enviado' });
    }

    const imageUrl = `/uploads/dashboard/${req.file.filename}`;

    const image = await this.createDashboardImageUseCase.execute({
      imageUrl,
      createdBy: req.user.id,
    });

    return res.status(201).json(image);
  }

  async delete(req, res) {
    const deletedImage = await this.deleteDashboardImageUseCase.execute(req.params.id);

    if (deletedImage?.imageUrl) {
      const uploadsRoot = path.resolve(__dirname, '../../../../uploads');
      const relativeImagePath = deletedImage.imageUrl.startsWith('/uploads/')
        ? deletedImage.imageUrl.replace('/uploads/', '')
        : deletedImage.imageUrl.split('/uploads/')[1] || '';
      const imagePath = path.resolve(
        uploadsRoot,
        relativeImagePath
      );

      if (imagePath.startsWith(uploadsRoot)) {
        await fs.unlink(imagePath).catch(() => null);
      }
    }

    return res.status(204).send();
  }
}

module.exports = DashboardImageController;
