class DepartmentFinanceController {
  constructor(useCase) {
    this.useCase = useCase;
  }

  async list(req, res) {
    const result = await this.useCase.execute(req.user.church);
    return res.json(result);
  }
}

module.exports = DepartmentFinanceController;
