class AuthController {
  constructor(registerUserUseCase, loginUserUseCase, getMeUseCase) {
    this.registerUserUseCase = registerUserUseCase;
    this.loginUserUseCase = loginUserUseCase;
    this.getMeUseCase = getMeUseCase;
  }

  async register(req, res) {
    const { name, email, church, password, role } = req.body;

    const user = await this.registerUserUseCase.execute({
      name,
      email,
      church,
      password,
      role,
    });

    return res.status(201).json(user);
  }

  async login(req, res) {
    const { email, password, church } = req.body;

    const result = await this.loginUserUseCase.execute({
      email,
      password,
      church,
    });

    return res.json(result);
  }

  async me(req, res) {
    const user = await this.getMeUseCase.execute(req.user.id);
    return res.json(user);
  }
}

module.exports = AuthController;
