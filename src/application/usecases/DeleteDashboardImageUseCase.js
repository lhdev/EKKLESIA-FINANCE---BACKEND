const AppError = require('../../shared/errors/AppError');

class DeleteDashboardImageUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute(id) {
    const deletedImage = await this.dashboardImageRepository.delete(id);

    if (!deletedImage) {
      throw new AppError('Imagem nao encontrada', 404);
    }

    return deletedImage;
  }
}

module.exports = DeleteDashboardImageUseCase;
