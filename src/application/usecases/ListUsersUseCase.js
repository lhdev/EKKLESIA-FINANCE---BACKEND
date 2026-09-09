class ListUsersUseCase {
    constructor(userRepository) {
      this.userRepository = userRepository;
    }
  
    async execute(church) {
      return this.userRepository.findAll(church);
    }
  }
  
  module.exports = ListUsersUseCase;
