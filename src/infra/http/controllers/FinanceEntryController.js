class FinanceEntryController {
  constructor(useCase) {
    this.useCase = useCase;
  }

  async list(req, res) {
    const result = await this.useCase.list({
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
    });
    return res.json(result);
  }

  async create(req, res) {
    const entry = await this.useCase.create({
      church: req.user.church,
      userId: req.user.id,
      data: req.body,
    });
    return res.status(201).json(entry);
  }

  async update(req, res) {
    const entry = await this.useCase.update({
      id: req.params.id,
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
      data: req.body,
    });
    return res.json(entry);
  }

  async delete(req, res) {
    await this.useCase.delete({
      id: req.params.id,
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
    });
    return res.status(204).send();
  }
}

module.exports = FinanceEntryController;
