class ListDashboardImagesUseCase {
  constructor(dashboardImageRepository) {
    this.dashboardImageRepository = dashboardImageRepository;
  }

  async execute(church) {
    return this.dashboardImageRepository.findAll(church);
  }
}

module.exports = ListDashboardImagesUseCase;
