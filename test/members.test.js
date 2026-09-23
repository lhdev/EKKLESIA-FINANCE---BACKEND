const test = require("node:test");
const assert = require("node:assert/strict");

const CreateUserUseCase = require("../src/application/usecases/CreateUserUseCase");
const ImportUsersUseCase = require("../src/application/usecases/ImportUsersUseCase");
const ListUsersUseCase = require("../src/application/usecases/ListUsersUseCase");

test("cria cadastro de membro sem senha informada pelo painel", async () => {
  let createdData;
  const repository = {
    findByEmailAndChurch: async () => null,
    create: async (data) => {
      createdData = data;
      return { id: "member-1", ...data, password: undefined };
    },
  };

  const member = await new CreateUserUseCase(repository).execute({
    name: "Maria da Silva",
    email: "MARIA@example.com",
    phone: "11999999999",
    birthDate: "1990-05-10",
    isLeader: false,
    role: "MEMBRO",
    status: "ACTIVE",
    church: "adpv",
  });

  assert.equal(member.email, "maria@example.com");
  assert.equal(member.phone, "11999999999");
  assert.equal(createdData.status, "ACTIVE");
  assert.ok(createdData.password);
});

test("importa membros de CSV com separador brasileiro", async () => {
  const received = [];
  const createUserUseCase = {
    execute: async (data) => {
      received.push(data);
      return { id: `member-${received.length}`, ...data };
    },
  };
  const csv = [
    "Nome completo;E-mail;Telefone;Data de nascimento;Lider;Status",
    "Joao Souza;joao@example.com;11911112222;15/03/1985;sim;ACTIVE",
    "Ana Lima;ana@example.com;11933334444;2000-09-20;nao;INACTIVE",
  ].join("\n");

  const result = await new ImportUsersUseCase(createUserUseCase).execute({
    file: { originalname: "membros.csv", buffer: Buffer.from(csv) },
    church: "adpv",
  });

  assert.equal(result.imported, 2);
  assert.equal(received[0].church, "adpv");
  assert.equal(received[0].isLeader, true);
  assert.equal(received[0].role, "Lider");
  assert.equal(received[0].birthDate.toISOString(), "1985-03-15T00:00:00.000Z");
  assert.equal(received[1].status, "INACTIVE");
});

test("encaminha busca e status normalizados para o repositorio", async () => {
  let received;
  const repository = {
    findAll: async (church, filters) => {
      received = { church, filters };
      return [];
    },
  };

  await new ListUsersUseCase(repository).execute("adpv", {
    status: "inactive",
    search: "  Maria  ",
  });

  assert.deepEqual(received, {
    church: "adpv",
    filters: { status: "INACTIVE", search: "Maria" },
  });
});
