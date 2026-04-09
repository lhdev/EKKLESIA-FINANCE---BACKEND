const AppError = require("../../shared/errors/AppError");

class GetMeUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    return user;
  }
}

module.exports = GetMeUseCase;
