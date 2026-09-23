const path = require("node:path");
const readXlsxFile = require("read-excel-file/node");

const AppError = require("../../shared/errors/AppError");

const HEADER_ALIASES = Object.freeze({
  nome: "name",
  name: "name",
  nomecompleto: "name",
  email: "email",
  telefone: "phone",
  telefone1: "phone",
  celular: "phone",
  phone: "phone",
  nascimento: "birthDate",
  datanascimento: "birthDate",
  datadenascimento: "birthDate",
  birthdate: "birthDate",
  status: "status",
  situacao: "status",
  lider: "isLeader",
  isleader: "isLeader",
  perfil: "role",
  role: "role",
  cpf: "cpf",
  endereco: "address",
  address: "address",
  sexo: "gender",
  gender: "gender",
  estadocivil: "maritalStatus",
  conjuge: "spouse",
  nomeconjuge: "spouse",
  filhos: "children",
  nomefilhos: "children",
  pai: "father",
  filiacaopai: "father",
  mae: "mother",
  filiacaomae: "mother",
  batismo: "baptized",
  batismonasaguas: "baptized",
  igrejaanterior: "previousChurch",
  pastoranterior: "previousPastor",
  cargosexercidos: "positions",
  funcaodesejada: "desiredFunction",
  desejaexercerfuncao: "desiredFunction",
  tipoadesao: "admissionType",
});

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const delimiter =
    (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length
      ? ";"
      : ",";
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;
  return ["1", "sim", "s", "true", "yes"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function dateValue(value) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) {
    return new Date(`${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}T00:00:00.000Z`);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function rowsToUsers(rows) {
  if (rows.length < 2) {
    throw new AppError("A planilha deve conter cabecalho e ao menos um membro", 400);
  }

  const headers = rows[0].map((header) => HEADER_ALIASES[normalizeHeader(header)]);
  if (!headers.includes("name") || !headers.includes("email")) {
    throw new AppError("A planilha deve conter as colunas nome e email", 400);
  }

  const users = rows.slice(1).map((row, rowIndex) => {
    const user = {};
    headers.forEach((header, columnIndex) => {
      if (header) user[header] = row[columnIndex];
    });

    user.name = String(user.name || "").trim();
    user.email = String(user.email || "").trim();
    if (!user.name || !user.email) {
      throw new AppError(`Nome e email sao obrigatorios na linha ${rowIndex + 2}`, 400);
    }

    user.phone = String(user.phone || "").trim();
    user.birthDate = dateValue(user.birthDate);
    user.isLeader = booleanValue(user.isLeader);
    user.baptized = booleanValue(user.baptized);
    user.role = String(user.role || (user.isLeader ? "Lider" : "Membro")).trim();
    user.status = String(user.status || "ACTIVE").trim();
    return user;
  });

  if (users.length > 1000) {
    throw new AppError("A importacao aceita no maximo 1000 membros por arquivo", 400);
  }

  return users;
}

class ImportUsersUseCase {
  constructor(createUserUseCase) {
    this.createUserUseCase = createUserUseCase;
  }

  async execute({ file, church }) {
    if (!file?.buffer) {
      throw new AppError("Arquivo de importacao obrigatorio", 400);
    }

    const extension = path.extname(file.originalname || "").toLowerCase();
    const rows = extension === ".xlsx"
      ? await readXlsxFile(file.buffer)
      : parseCsv(file.buffer);
    const users = rowsToUsers(rows);
    const createdUsers = [];

    for (const user of users) {
      createdUsers.push(await this.createUserUseCase.execute({
        ...user,
        church,
      }));
    }

    return {
      imported: createdUsers.length,
      users: createdUsers,
    };
  }
}

module.exports = ImportUsersUseCase;
module.exports.parseCsv = parseCsv;
module.exports.rowsToUsers = rowsToUsers;
