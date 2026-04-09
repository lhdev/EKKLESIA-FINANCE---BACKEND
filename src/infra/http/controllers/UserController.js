class UserController {
  constructor(
    createUserUseCase,
    listUsersUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    getMeUseCase
  ) {
    this.createUserUseCase = createUserUseCase;
    this.listUsersUseCase = listUsersUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.getMeUseCase = getMeUseCase;
  }

  async create(req, res) {
    const user = await this.createUserUseCase.execute(req.body);
    return res.status(201).json(user);
  }

  async list(req, res) {
    const users = await this.listUsersUseCase.execute();
    return res.json(users);
  }

  async me(req, res) {
    const user = await this.getMeUseCase.execute(req.user.id);
    return res.json(user);
  }

  async update(req, res) {
    const { id } = req.params;

    const user = await this.updateUserUseCase.execute({
      id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      data: req.body,
    });

    return res.json(user);
  }

  async updateMe(req, res) {
    const user = await this.updateUserUseCase.execute({
      id: req.user.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      data: req.body,
    });

    return res.json(user);
  }

  async delete(req, res) {
    await this.deleteUserUseCase.execute(req.params.id, req.user.role);
    return res.status(204).send();
  }
}

module.exports = UserController;
