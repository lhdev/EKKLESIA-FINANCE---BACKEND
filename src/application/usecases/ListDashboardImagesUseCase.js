class ListDashboardImagesUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute() {
    return this.dashboardImageRepository.findAll();
  }
}

module.exports = ListDashboardImagesUseCase;
