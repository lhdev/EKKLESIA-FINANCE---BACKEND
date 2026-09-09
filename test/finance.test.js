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
const ListDepartmentFinanceUseCase = require("../src/application/usecases/ListDepartmentFinanceUseCase");
const CreateUserUseCase = require("../src/application/usecases/CreateUserUseCase");
const UpdateUserUseCase = require("../src/application/usecases/UpdateUserUseCase");
const permissionMiddleware = require("../src/infra/http/middlewares/permission.middleware");
const {
  PERMISSIONS,
  normalizePermissions,
} = require("../src/shared/config/permissions");

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
    const result = await new ManageFinanceEntriesUseCase().list({
      church: "Igreja A",
      userId: "admin-1",
      role: ROLES.ADMIN,
    });
    assert.deepEqual(result.summary, {
      contributionsCents: 15000,
      expensesCents: 4000,
      balanceCents: 11000,
    });
  } finally {
    FinanceEntry.find = originalFind;
  }
});

test("lider consulta somente os proprios lancamentos", async () => {
  const originalFind = FinanceEntry.find;
  let receivedFilter;
  FinanceEntry.find = (filter) => {
    receivedFilter = filter;
    return { sort: () => ({ lean: async () => [] }) };
  };

  try {
    await new ManageFinanceEntriesUseCase().list({
      church: "Igreja A",
      userId: "leader-1",
      role: ROLES.LIDER,
    });
    assert.deepEqual(receivedFilter, {
      church: "Igreja A",
      createdBy: "leader-1",
    });
  } finally {
    FinanceEntry.find = originalFind;
  }
});

test("membro consulta somente os proprios lancamentos", async () => {
  const originalFind = FinanceEntry.find;
  let receivedFilter;
  FinanceEntry.find = (filter) => {
    receivedFilter = filter;
    return { sort: () => ({ lean: async () => [] }) };
  };

  try {
    await new ManageFinanceEntriesUseCase().list({
      church: "Igreja A",
      userId: "member-1",
      role: ROLES.MEMBRO,
    });
    assert.deepEqual(receivedFilter, {
      church: "Igreja A",
      createdBy: "member-1",
    });
  } finally {
    FinanceEntry.find = originalFind;
  }
});

test("financeiro consulta todos os lancamentos da igreja", async () => {
  const originalFind = FinanceEntry.find;
  let receivedFilter;
  FinanceEntry.find = (filter) => {
    receivedFilter = filter;
    return { sort: () => ({ lean: async () => [] }) };
  };

  try {
    await new ManageFinanceEntriesUseCase().list({
      church: "Igreja A",
      userId: "finance-1",
      role: ROLES.FINANCEIRO,
    });
    assert.deepEqual(receivedFilter, { church: "Igreja A" });
  } finally {
    FinanceEntry.find = originalFind;
  }
});

test("consolida saldos e despesas por departamento", async () => {
  const leaderA = { _id: "leader-a", name: "Jovens", role: "Lider" };
  const leaderB = { _id: "leader-b", name: "Irmãs", role: "LIDER" };
  const userModel = {
    find: () => ({
      select: () => ({ lean: async () => [leaderA, leaderB] }),
    }),
  };
  const entryModel = {
    find: () => ({
      sort: () => ({
        lean: async () => [
          {
            createdBy: "leader-a",
            type: FINANCE_ENTRY_TYPES.CONTRIBUTION,
            amountCents: 10000,
          },
          {
            createdBy: "leader-a",
            type: FINANCE_ENTRY_TYPES.EXPENSE,
            amountCents: 2000,
          },
          {
            createdBy: "leader-b",
            type: FINANCE_ENTRY_TYPES.EXPENSE,
            amountCents: 1000,
          },
        ],
      }),
    }),
  };

  const result = await new ListDepartmentFinanceUseCase({
    userModel,
    entryModel,
  }).execute("Igreja A");

  assert.deepEqual(result.summary, {
    contributionsCents: 10000,
    expensesCents: 3000,
    balanceCents: 7000,
  });
  assert.equal(result.departments[0].name, "Irmãs");
  assert.equal(result.departments[0].expensesCents, 1000);
  assert.equal(result.departments[1].balanceCents, 8000);
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

test("membro nao pode lancar despesa", async () => {
  await assert.rejects(
    () =>
      new ManageFinanceEntriesUseCase().create({
        church: "Igreja A",
        userId: "507f1f77bcf86cd799439011",
        role: ROLES.MEMBRO,
        data: { type: "DESPESA", amountCents: 1000 },
      }),
    (error) => error.statusCode === 403
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

test("perfis financeiros recebem as permissoes minimas do fluxo", () => {
  assert.deepEqual(normalizePermissions([], ROLES.FINANCEIRO), [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
  ]);
  assert.deepEqual(
    normalizePermissions(["finance.view", "finance.read"], ROLES.MEMBRO),
    [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.DASHBOARD_VIEW]
  );
});

test("middleware financeiro respeita a permissao individual", () => {
  const middleware = permissionMiddleware(PERMISSIONS.FINANCE_VIEW);
  let called = false;

  middleware(
    { user: { role: ROLES.MEMBRO, permissions: [PERMISSIONS.FINANCE_VIEW] } },
    {},
    () => { called = true; }
  );

  assert.equal(called, true);
  assert.throws(
    () => middleware({ user: { role: ROLES.FINANCEIRO, permissions: [] } }, {}, () => {}),
    (error) => error.statusCode === 403
  );
});

test("admin cadastra usuario com permissoes individuais", async () => {
  let createdData;
  const repository = {
    findByEmailAndChurch: async () => null,
    create: async (data) => {
      createdData = data;
      return { id: "user-1", ...data, password: undefined };
    },
  };

  const result = await new CreateUserUseCase(repository).execute({
    name: "Pessoa Financeira",
    email: "PESSOA@example.com",
    church: "adpv",
    password: "senha123",
    role: ROLES.MEMBRO,
    permissions: [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.DEPARTMENTS_VIEW],
  });

  assert.equal(createdData.email, "pessoa@example.com");
  assert.deepEqual(result.permissions, [
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ]);
});

test("admin nao altera permissoes de usuario de outra igreja", async () => {
  const repository = {
    findById: async () => ({
      id: "user-2",
      church: "outra-igreja",
      role: ROLES.MEMBRO,
    }),
    update: async () => assert.fail("update nao deveria ser chamado"),
  };

  await assert.rejects(
    () => new UpdateUserUseCase(repository).execute({
      id: "user-2",
      requesterId: "admin-1",
      requesterRole: ROLES.ADMIN,
      requesterChurch: "adpv",
      data: { permissions: [PERMISSIONS.FINANCE_VIEW] },
    }),
    (error) => error.statusCode === 403
  );
});

test("admin redefine a senha de usuario da propria igreja", async () => {
  let updatedData;
  const repository = {
    findById: async () => ({
      id: "user-3",
      church: "adpv",
      role: ROLES.MEMBRO,
    }),
    update: async (id, data) => {
      updatedData = data;
      return { id, church: "adpv", role: ROLES.MEMBRO };
    },
  };

  await new UpdateUserUseCase(repository).execute({
    id: "user-3",
    requesterId: "admin-1",
    requesterRole: ROLES.ADMIN,
    requesterChurch: "adpv",
    data: { password: "nova-senha" },
  });

  assert.notEqual(updatedData.password, "nova-senha");
  assert.equal(await bcrypt.compare("nova-senha", updatedData.password), true);
});

test("rejeita redefinicao com senha muito curta", async () => {
  const repository = {
    findById: async () => ({
      id: "user-4",
      church: "adpv",
      role: ROLES.MEMBRO,
    }),
    update: async () => assert.fail("update nao deveria ser chamado"),
  };

  await assert.rejects(
    () => new UpdateUserUseCase(repository).execute({
      id: "user-4",
      requesterId: "admin-1",
      requesterRole: ROLES.ADMIN,
      requesterChurch: "adpv",
      data: { password: "123" },
    }),
    (error) => error.statusCode === 400
  );
});
