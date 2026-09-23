class ListUsersUseCase {
    constructor(userRepository) {
      this.userRepository = userRepository;
    }
  
    async execute(church, filters = {}) {
      const allowedStatuses = ["ACTIVE", "INACTIVE", "TRANSFERRED", "DISCIPLINE"];
      const requestedStatus = String(filters.status || "").trim().toUpperCase();
      const status = allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : undefined;
      const search = String(filters.search || "").trim().slice(0, 100) || undefined;

      return this.userRepository.findAll(church, { status, search });
    }
  }
  
  module.exports = ListUsersUseCase;
