const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ALLOWED_CHURCHES, isAllowedChurch, validateChurch } = require("../src/shared/config/churches");
const ChurchPolicy = require("../src/domain/services/ChurchPolicy");
const RegisterUserUseCase = require("../src/application/usecases/RegisterUserUseCase");
const CreateUserUseCase = require("../src/application/usecases/CreateUserUseCase");
const LoginUserUseCase = require("../src/application/usecases/LoginUserUseCase");
const UserSchema = require("../src/infra/database/mongoose/schemas/UserSchema");
const authMiddleware = require("../src/infra/http/middlewares/auth.middleware");
const CreateDashboardImageUseCase = require("../src/application/usecases/CreateDashboardImageUseCase");
const DashboardImageRepositoryMongo = require("../src/infra/database/mongoose/DashboardImageRepositoryMongo");
const DashboardImageSchema = require("../src/infra/database/mongoose/schemas/DashboardImageSchema");

test("autoriza igrejas configuradas, ignorando caixa e espacos externos", () => {
  assert.ok(ALLOWED_CHURCHES.includes("Adpv"));
  assert.ok(ALLOWED_CHURCHES.includes("Rosa de Saron"));
  for (const allowedChurch of ALLOWED_CHURCHES) {
    for (const church of [allowedChurch, allowedChurch.toUpperCase(), allowedChurch.toLowerCase(), `  ${allowedChurch}  `]) {
      assert.equal(isAllowedChurch(church), true);
      assert.equal(validateChurch(church), church.trim());
    }
  }
  for (const church of [undefined, null, "", "  ", 123, {}, ["Adpv"], "Outra", "Adpv Centro"]) {
    assert.equal(isAllowedChurch(church), false);
    assert.throws(() => validateChurch(church), (error) => error.statusCode === 400);
  }
});

test("politicas independentes permitem extensao sem alterar a configuracao global", () => {
  const churches = ["Igreja Nova"];
  const policy = new ChurchPolicy(churches);
  churches.push("Outra Igreja");
  assert.equal(policy.validateChurch(" IGREJA NOVA "), "IGREJA NOVA");
  assert.equal(policy.isAllowedChurch("Outra Igreja"), false);
  assert.equal(policy.isAllowedChurch("Adpv"), false);
  assert.equal(isAllowedChurch("Igreja Nova"), false);
  assert.throws(() => policy.validateChurch("Adpv", 403), { statusCode: 403, message: "Igreja nao autorizada" });
  assert.throws(() => policy.validateChurch("", 403), { statusCode: 403, message: "Igreja obrigatoria" });
  for (const invalid of [undefined, "Adpv", [null], [" "]]) {
    assert.throws(() => new ChurchPolicy(invalid), TypeError);
  }
});

for (const UseCase of [RegisterUserUseCase, CreateUserUseCase]) {
  test(`${UseCase.name} rejeita igreja ausente ou nao autorizada antes de consultar o banco`, async () => {
    const useCase = new UseCase({
      findByEmail: async () => assert.fail("Nao deve consultar o banco"),
      findByEmailAndChurch: async () => assert.fail("Nao deve consultar o banco"),
      create: async () => assert.fail("Nao deve criar usuario"),
    });
    for (const church of [undefined, "", "Outra igreja"]) {
      await assert.rejects(
        () => useCase.execute({ name: "Pessoa", email: "pessoa@example.com", password: "senha123-segura", church }),
        (error) => error.statusCode === 400
      );
    }
  });

  for (const allowedChurch of ALLOWED_CHURCHES) {
    test(`${UseCase.name} cadastra ${allowedChurch} com espacos e caixa diferentes`, async () => {
      const expectedChurch = allowedChurch.toUpperCase();
      const useCase = new UseCase({
        findByEmailAndChurch: async (email, church) => {
          assert.equal(church, expectedChurch);
          return null;
        },
        create: async (data) => data,
      });
      const result = await useCase.execute({
        name: "Pessoa", email: "pessoa@example.com", password: "senha123-segura", church: ` ${expectedChurch} `,
      });
      assert.equal(result.church, expectedChurch);
    });
  }

  test(`${UseCase.name} aceita uma politica injetada para outra igreja`, async () => {
    const useCase = new UseCase({
      findByEmailAndChurch: async () => null,
      create: async (data) => data,
    }, new ChurchPolicy(["Igreja Nova"]));
    const result = await useCase.execute({
      name: "Pessoa", email: "pessoa@example.com", password: "senha123-segura", church: " Igreja Nova ",
    });
    assert.equal(result.church, "Igreja Nova");
  });
}

test("login rejeita igreja nao autorizada antes do fallback de conta legada", async () => {
  const useCase = new LoginUserUseCase({
    findByEmailAndChurch: async () => assert.fail("Nao deve consultar o banco"),
    findByEmail: async () => assert.fail("Nao deve consultar o banco"),
    update: async () => assert.fail("Nao deve vincular igreja"),
  });
  await assert.rejects(
    () => useCase.execute({ email: "pessoa@example.com", password: "senha123-segura", church: "Outra" }),
    (error) => error.statusCode === 400 && error.message === "Igreja nao autorizada"
  );
});

test("login sem igreja valida a igreja da conta antes de emitir token", async () => {
  process.env.JWT_SECRET = "test-secret";
  const password = await bcrypt.hash("senha123", 4);
  for (const church of [...ALLOWED_CHURCHES.map((name) => name.toLowerCase()), "Outra", ""]) {
    const useCase = new LoginUserUseCase({
      findByEmail: async () => ({ id: "user-1", email: "pessoa@example.com", church, password, role: "Membro" }),
    });
    const login = () => useCase.execute({ email: "pessoa@example.com", password: "senha123" });
    if (isAllowedChurch(church)) {
      assert.equal(jwt.verify((await login()).token, process.env.JWT_SECRET).church, church);
    } else {
      await assert.rejects(login, (error) => error.statusCode === 400);
    }
  }
});

test("middleware bloqueia token existente de conta com igreja nao autorizada", async () => {
  process.env.JWT_SECRET = "test-secret";
  const token = jwt.sign({ id: "user-1", church: "adpv" }, process.env.JWT_SECRET);
  const originalFindById = UserSchema.findById;
  try {
    for (const church of ["Outra", ""]) {
      UserSchema.findById = () => ({ select: () => ({ lean: async () => ({ role: "Membro", church }) }) });
      await assert.rejects(
        () => authMiddleware(
          { headers: { authorization: `Bearer ${token}` } }, {},
          () => assert.fail("Nao deve autorizar acesso")
        ),
        (error) => error.statusCode === 403
      );
    }
  } finally {
    UserSchema.findById = originalFindById;
  }
});

test("login com igreja explicita emite token para cada igreja configurada", async () => {
  process.env.JWT_SECRET = "test-secret";
  const password = await bcrypt.hash("senha123", 4);
  for (const church of ALLOWED_CHURCHES) {
    const useCase = new LoginUserUseCase({
      findByEmailAndChurch: async (_email, requestedChurch) => {
        assert.equal(requestedChurch, church.toUpperCase());
        return { id: "user-1", church, password, role: "Membro" };
      },
      findByEmail: async () => assert.fail("Nao deve recorrer ao fallback"),
    });
    const result = await useCase.execute({ email: "pessoa@example.com", password: "senha123", church: ` ${church.toUpperCase()} ` });
    assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).church, church);
  }
});

test("login nao permite usar conta Adpv ao selecionar Rosa de Saron", async () => {
  const useCase = new LoginUserUseCase({
    findByEmailAndChurch: async () => null,
    findByEmail: async () => ({ id: "user-1", church: "Adpv" }),
    update: async () => assert.fail("Nao deve trocar a igreja da conta"),
  });
  await assert.rejects(() => useCase.execute({
    email: "pessoa@example.com", password: "senha123", church: "Rosa de Saron",
  }), { statusCode: 401 });
});

test("middleware autoriza cada igreja configurada e usa a igreja atual da conta", async () => {
  process.env.JWT_SECRET = "test-secret";
  const token = jwt.sign({ id: "user-1", church: "Adpv" }, process.env.JWT_SECRET);
  const originalFindById = UserSchema.findById;
  try {
    for (const church of ALLOWED_CHURCHES) {
      UserSchema.findById = () => ({ select: () => ({ lean: async () => ({ role: "Membro", church }) }) });
      const req = { headers: { authorization: `Bearer ${token}` } };
      let authorized = false;
      await authMiddleware(req, {}, () => { authorized = true; });
      assert.equal(authorized, true);
      assert.equal(req.user.church, church);
    }
  } finally {
    UserSchema.findById = originalFindById;
  }
});

test("criacao de imagem aceita politica injetada e preserva a igreja", async () => {
  const useCase = new CreateDashboardImageUseCase({ create: async (data) => data }, new ChurchPolicy(["Igreja Nova"]));
  const result = await useCase.execute({ imageUrl: "https://example.com/image.jpg", church: " Igreja Nova " });
  assert.equal(result.church, "Igreja Nova");
  await assert.rejects(() => useCase.execute({ imageUrl: "https://example.com/image.jpg", church: "Adpv" }), { statusCode: 400 });
});

test("galeria da Rosa de Saron nao inclui imagens legadas da Adpv na leitura ou exclusao", async () => {
  const originalFind = DashboardImageSchema.find;
  const originalDelete = DashboardImageSchema.findOneAndDelete;
  const repository = new DashboardImageRepositoryMongo();
  const assertScoped = (filter) => {
    assert.equal(filter.$or, undefined);
    assert.equal(filter.church.test("ROSA DE SARON"), true);
    assert.equal(filter.church.test("Adpv"), false);
    assert.equal(filter.church.test("Rosa de Saron Centro"), false);
  };
  try {
    DashboardImageSchema.find = (filter) => {
      assertScoped(filter);
      return { sort: async () => [] };
    };
    DashboardImageSchema.findOneAndDelete = async (filter) => {
      assertScoped(filter);
      assert.equal(filter._id, "image-1");
      return null;
    };
    await repository.findAll(" Rosa de Saron ");
    await repository.delete("image-1", "Rosa de Saron");
    DashboardImageSchema.find = (filter) => {
      assert.equal(filter.$or[0].church.test("ADPV"), true);
      assert.equal(filter.$or[0].church.test("Rosa de Saron"), false);
      assert.deepEqual(filter.$or[1], { church: { $exists: false } });
      return { sort: async () => [] };
    };
    await repository.findAll("adpv");
  } finally {
    DashboardImageSchema.find = originalFind;
    DashboardImageSchema.findOneAndDelete = originalDelete;
  }
});
