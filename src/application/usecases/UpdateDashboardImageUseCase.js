const AppError = require('../../shared/errors/AppError');

class UpdateDashboardImageUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute(id, data) {
    const image = await this.dashboardImageRepository.update(id, data);

    if (!image) {
      throw new AppError('Imagem nao encontrada', 404);
    }

    return image;
  }
}

module.exports = UpdateDashboardImageUseCase;
