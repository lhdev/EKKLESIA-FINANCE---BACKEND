const input = require('../../shared/security/input');
const { churchPolicy: defaultChurchPolicy } = require('../../shared/config/churches');
const AppError = require('../../shared/errors/AppError');

class CreateDashboardImageUseCase {
  constructor(dashboardImageRepository, churchPolicy = defaultChurchPolicy) {
    this.dashboardImageRepository = dashboardImageRepository;
    this.churchPolicy = churchPolicy;
  }

  async execute({ imageUrl, createdBy, storageId, resourceType, church }) {
    const normalizedUrl = input.photo(imageUrl);
    const normalizedChurch = this.churchPolicy.validateChurch(church);

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
