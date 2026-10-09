const input = require('../../shared/security/input');
const { validateChurch } = require('../../shared/config/churches');
const AppError = require('../../shared/errors/AppError');

class CreateDashboardImageUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute({ imageUrl, createdBy, storageId, resourceType, church }) {
    const normalizedUrl = input.photo(imageUrl);
    const normalizedChurch = validateChurch(church);

    if (!normalizedUrl) {
      throw new AppError('URL da imagem e obrigatoria', 400);
    }

    return this.dashboardImageRepository.create({
      imageUrl: normalizedUrl,
      church: normalizedChurch,
      createdBy,
      storageId,
      resourceType,
    });
  }
}

module.exports = CreateDashboardImageUseCase;
