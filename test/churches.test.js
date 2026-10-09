const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ALLOWED_CHURCHES, validateChurch } = require("../src/shared/config/churches");
const RegisterUserUseCase = require("../src/application/usecases/RegisterUserUseCase");
const CreateUserUseCase = require("../src/application/usecases/CreateUserUseCase");
const LoginUserUseCase = require("../src/application/usecases/LoginUserUseCase");
const UserSchema = require("../src/infra/database/mongoose/schemas/UserSchema");
const authMiddleware = require("../src/infra/http/middlewares/auth.middleware");

test("autoriza apenas Adpv, ignorando caixa e espacos externos", () => {
  assert.deepEqual(ALLOWED_CHURCHES, ["Adpv"]);
  for (const church of ["Adpv", "ADPV", "adpv", "  Adpv  "]) {
    assert.equal(validateChurch(church), church.trim());
  }
  for (const church of [undefined, null, "", "  ", 123, {}, ["Adpv"], "Outra", "Adpv Centro"]) {
    assert.throws(() => validateChurch(church), (error) => error.statusCode === 400);
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

  test(`${UseCase.name} cadastra Adpv com espacos e caixa diferentes`, async () => {
    const useCase = new UseCase({
      findByEmailAndChurch: async (email, church) => {
        assert.equal(church, "ADPV");
        return null;
      },
      create: async (data) => data,
    });
    const result = await useCase.execute({
      name: "Pessoa", email: "pessoa@example.com", password: "senha123-segura", church: " ADPV ",
    });
    assert.equal(result.church, "ADPV");
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
  for (const church of ["adpv", "Outra", ""]) {
    const useCase = new LoginUserUseCase({
      findByEmail: async () => ({ id: "user-1", email: "pessoa@example.com", church, password, role: "Membro" }),
    });
    const login = () => useCase.execute({ email: "pessoa@example.com", password: "senha123" });
    if (church === "adpv") {
      assert.equal(jwt.verify((await login()).token, process.env.JWT_SECRET).church, "adpv");
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
