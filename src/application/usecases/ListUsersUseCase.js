class ListUsersUseCase {
    constructor(userRepository) {
      this.userRepository = userRepository;
    }
  
    async execute(church, filters = {}, role = "Admin") {
      const allowedStatuses = ["ACTIVE", "INACTIVE", "TRANSFERRED", "DISCIPLINE"];
      const requestedStatus = String(filters.status || "").trim().toUpperCase();
      const status = allowedStatuses.includes(requestedStatus)
        ? requestedStatus
        : undefined;
      const search = String(filters.search || "").trim().slice(0, 100) || undefined;

      const users = await this.userRepository.findAll(church, { status, search });
      if (role !== 'Admin') return users.map(({ id, name, email, status, role }) => ({ id, name, email, status, role }));
      return users;
    }
  }
  
  module.exports = ListUsersUseCase;
