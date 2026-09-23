class UserController {
  constructor(
    createUserUseCase,
    listUsersUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    getMeUseCase,
    importUsersUseCase
  ) {
    this.createUserUseCase = createUserUseCase;
    this.listUsersUseCase = listUsersUseCase;
    this.updateUserUseCase = updateUserUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.getMeUseCase = getMeUseCase;
    this.importUsersUseCase = importUsersUseCase;
  }

  async create(req, res) {
    const user = await this.createUserUseCase.execute({
      ...req.body,
      church: req.user.church,
    });
    return res.status(201).json(user);
  }

  async list(req, res) {
    const users = await this.listUsersUseCase.execute(req.user.church, req.query);
    return res.json(users);
  }

  async import(req, res) {
    const result = await this.importUsersUseCase.execute({
      file: req.file,
      church: req.user.church,
    });
    return res.status(201).json(result);
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
      requesterChurch: req.user.church,
      data: req.body,
    });

    return res.json(user);
  }

  async updateMe(req, res) {
    const user = await this.updateUserUseCase.execute({
      id: req.user.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      requesterChurch: req.user.church,
      data: req.body,
    });

    return res.json(user);
  }

  async delete(req, res) {
    await this.deleteUserUseCase.execute({
      id: req.params.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      requesterChurch: req.user.church,
    });
    return res.status(204).send();
  }
}

module.exports = UserController;
