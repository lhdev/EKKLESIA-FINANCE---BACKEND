const test = require("node:test");
const assert = require("node:assert/strict");

const CreateUserUseCase = require("../src/application/usecases/CreateUserUseCase");
const ImportUsersUseCase = require("../src/application/usecases/ImportUsersUseCase");
const ListUsersUseCase = require("../src/application/usecases/ListUsersUseCase");
const UpdateUserUseCase = require("../src/application/usecases/UpdateUserUseCase");
const { ROLES } = require("../src/shared/config/roles");

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

test("salva dados pessoais, filhos e vida crista enviados pelo app", async () => {
  let updated;
  const repository = {
    findById: async () => ({
      id: "member-1",
      church: "adpv",
      role: ROLES.MEMBRO,
      profile: { cpf: "", address: "Endereco antigo" },
    }),
    update: async (_id, data) => {
      updated = data;
      return data;
    },
  };

  await new UpdateUserUseCase(repository).execute({
    id: "member-1",
    requesterId: "member-1",
    requesterRole: ROLES.MEMBRO,
    requesterChurch: "adpv",
    data: {
      nomeCompleto: "Maria Atualizada",
      telefone1: "(11) 91234-5678",
      dataNascimento: "1992-04-03T00:00:00.000Z",
      cpf: "",
      endereco: "Endereco novo",
      novoConvertido: true,
      desejaExercerFuncao: true,
      children: [
        { name: "Filho Um", birthDate: "2015-06-10T00:00:00.000Z" },
        { name: "Filho Dois", birthDate: "2018-09-20T00:00:00.000Z" },
      ],
    },
  });

  assert.equal(updated.name, "Maria Atualizada");
  assert.equal(updated.phone, "(11) 91234-5678");
  assert.equal(updated.profile.address, "Endereco novo");
  assert.equal(updated.profile.newConvert, true);
  assert.equal(updated.profile.desiredFunction, true);
  assert.deepEqual(updated.profile.childrenDetails, [
    { name: "Filho Um", birthDate: "2015-06-10T00:00:00.000Z" },
    { name: "Filho Dois", birthDate: "2018-09-20T00:00:00.000Z" },
  ]);
});

test("rejeita salvar perfil sem nome completo", async () => {
  const repository = {
    findById: async () => ({
      id: "member-1",
      church: "adpv",
      role: ROLES.MEMBRO,
    }),
    update: async () => assert.fail("update nao deveria ser chamado"),
  };

  await assert.rejects(
    () => new UpdateUserUseCase(repository).execute({
      id: "member-1",
      requesterId: "member-1",
      requesterRole: ROLES.MEMBRO,
      requesterChurch: "adpv",
      data: { nomeCompleto: "   " },
    }),
    (error) => error.statusCode === 400
  );
});
