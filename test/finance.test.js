const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { ROLES, normalizeRole } = require("../src/shared/config/roles");
const ManageFinanceEntriesUseCase = require("../src/application/usecases/ManageFinanceEntriesUseCase");
const {
  FinanceEntry,
  FINANCE_ENTRY_TYPES,
} = require("../src/infra/database/mongoose/schemas/FinanceEntrySchema");
const UserSchema = require("../src/infra/database/mongoose/schemas/UserSchema");
const LoginUserUseCase = require("../src/application/usecases/LoginUserUseCase");
const authMiddleware = require("../src/infra/http/middlewares/auth.middleware");

test("normaliza os aliases do perfil Lideres", () => {
  assert.equal(normalizeRole("LIDER"), ROLES.LIDER);
  assert.equal(normalizeRole("lideres"), ROLES.LIDER);
  assert.equal(normalizeRole("Líderes"), ROLES.LIDER);
  assert.equal(normalizeRole("leader"), ROLES.LIDER);
});

test("saldo soma contribuicoes e subtrai despesas", async () => {
  const originalFind = FinanceEntry.find;
  FinanceEntry.find = () => ({
    sort: () => ({
      lean: async () => [
        {
          _id: "entry-1",
          type: FINANCE_ENTRY_TYPES.CONTRIBUTION,
          amountCents: 15000,
          occurredAt: new Date("2026-09-01"),
          description: "Contribuicao",
        },
        {
          _id: "entry-2",
          type: FINANCE_ENTRY_TYPES.EXPENSE,
          amountCents: 4000,
          occurredAt: new Date("2026-09-01"),
          description: "Despesa",
        },
      ],
    }),
  });

  try {
    const result = await new ManageFinanceEntriesUseCase().list("Igreja A");
    assert.deepEqual(result.summary, {
      contributionsCents: 15000,
      expensesCents: 4000,
      balanceCents: 11000,
    });
  } finally {
    FinanceEntry.find = originalFind;
  }
});

test("rejeita lancamento sem valor positivo", async () => {
  await assert.rejects(
    () =>
      new ManageFinanceEntriesUseCase().create({
        church: "Igreja A",
        userId: "507f1f77bcf86cd799439011",
        data: { type: "DESPESA", amountCents: 0 },
      }),
    (error) => error.statusCode === 400
  );
});

test("vincula conta legada a igreja informada depois de validar a senha", async () => {
  process.env.JWT_SECRET = "test-secret";
  const password = "senha-segura";
  const updates = [];
  const repository = {
    findByEmailAndChurch: async () => null,
    findByEmail: async () => ({
      id: "507f1f77bcf86cd799439011",
      name: "Conta legada",
      email: "conta@example.com",
      church: "",
      role: "LIDER",
      password: await bcrypt.hash(password, 4),
    }),
    update: async (id, data) => updates.push({ id, data }),
  };

  const result = await new LoginUserUseCase(repository).execute({
    email: "conta@example.com",
    password,
    church: "adpv",
  });

  assert.deepEqual(updates, [
    {
      id: "507f1f77bcf86cd799439011",
      data: { church: "adpv" },
    },
  ]);
  assert.equal(result.user.church, "adpv");
  assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).church, "adpv");
});

test("middleware usa perfil e igreja atuais mesmo com token antigo", async () => {
  process.env.JWT_SECRET = "test-secret";
  const originalFindById = UserSchema.findById;
  UserSchema.findById = () => ({
    select: () => ({
      lean: async () => ({ role: "LIDER", church: "adpv" }),
    }),
  });
  const token = jwt.sign(
    { id: "507f1f77bcf86cd799439011", role: "Membro", church: "" },
    process.env.JWT_SECRET
  );
  const req = { headers: { authorization: `Bearer ${token}` } };

  try {
    await authMiddleware(req, {}, () => {});
    assert.equal(req.user.role, ROLES.LIDER);
    assert.equal(req.user.church, "adpv");
  } finally {
    UserSchema.findById = originalFindById;
  }
});
