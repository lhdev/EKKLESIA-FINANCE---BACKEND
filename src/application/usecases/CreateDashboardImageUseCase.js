const AppError = require('../../shared/errors/AppError');

class CreateDashboardImageUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute({ imageUrl, createdBy, storageId, resourceType }) {
    const normalizedUrl = imageUrl?.trim();

    if (!normalizedUrl) {
      throw new AppError('URL da imagem e obrigatoria', 400);
    }

    return this.dashboardImageRepository.create({
      imageUrl: normalizedUrl,
      createdBy,
      storageId,
      resourceType,
    });
  }
}

module.exports = CreateDashboardImageUseCase;
