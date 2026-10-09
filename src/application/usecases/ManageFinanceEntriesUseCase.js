const CloudinaryMediaStorage = require('../../infra/providers/CloudinaryMediaStorage');
const mongoose = require("mongoose");
const input = require("../../shared/security/input");
const { financeSummary } = require("../../shared/security/finance");
const AppError = require("../../shared/errors/AppError");
const {
  FinanceEntry,
  FINANCE_ENTRY_TYPES,
  FINANCE_CONTRIBUTION_CATEGORIES,
  FINANCE_ENTRY_STATUSES,
} = require("../../infra/database/mongoose/schemas/FinanceEntrySchema");
const { ROLES, normalizeRole } = require("../../shared/config/roles");

const TYPE_ALIASES = Object.freeze({
  contribuicao: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  contribution: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  receita: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  despesa: FINANCE_ENTRY_TYPES.EXPENSE,
  expense: FINANCE_ENTRY_TYPES.EXPENSE,
});

const CATEGORY_ALIASES = Object.freeze({
  dizimo: FINANCE_CONTRIBUTION_CATEGORIES.TITHE,
  tithe: FINANCE_CONTRIBUTION_CATEGORIES.TITHE,
  oferta: FINANCE_CONTRIBUTION_CATEGORIES.OFFERING,
  offering: FINANCE_CONTRIBUTION_CATEGORIES.OFFERING,
  proposito: FINANCE_CONTRIBUTION_CATEGORIES.PURPOSE,
  purpose: FINANCE_CONTRIBUTION_CATEGORIES.PURPOSE,
  outro: FINANCE_CONTRIBUTION_CATEGORIES.OTHER,
  other: FINANCE_CONTRIBUTION_CATEGORIES.OTHER,
});

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeType(value) {
  if (typeof value !== "string") return null;
  const key = normalizeText(value);
  return TYPE_ALIASES[key] || Object.values(FINANCE_ENTRY_TYPES).find(
    (type) => type === value.trim().toUpperCase()
  );
}

function normalizeCategory(value) {
  if (value !== undefined && typeof value !== "string") throw new AppError("Categoria invalida", 400);
  const key = normalizeText(value);
  return CATEGORY_ALIASES[key] || Object.values(
    FINANCE_CONTRIBUTION_CATEGORIES
  ).find((category) => category === value?.trim().toUpperCase());
}

function normalizeStatus(value) {
  if (value === undefined) return FINANCE_ENTRY_STATUSES.PENDING;
  if (typeof value !== "string") throw new AppError("Status financeiro invalido", 400);
  const normalized = normalizeText(value);
  if (normalized === "confirmado" || normalized === "confirmed") {
    return FINANCE_ENTRY_STATUSES.CONFIRMED;
  }
  if (normalized === 'pendente' || normalized === 'pending') return FINANCE_ENTRY_STATUSES.PENDING;
  throw new AppError('Status financeiro invalido', 400);
}

function validateChurch(church) {
  if (typeof church !== "string" || !church.trim()) {
    throw new AppError("Usuario sem igreja vinculada", 400);
  }
  return church.trim();
}

function validatePayload(data) {
  const type = normalizeType(data.type);
  if (!['number', 'string'].includes(typeof data.amountCents) ||
      (typeof data.amountCents === 'string' && !/^\d+$/.test(data.amountCents))) {
    throw new AppError('Valor invalido', 400);
  }
  const amountCents = Number(data.amountCents);
  const occurredAt = data.occurredAt ? input.date(data.occurredAt) : new Date();
  const category = normalizeCategory(data.category) ||
    FINANCE_CONTRIBUTION_CATEGORIES.OTHER;

  if (!type) {
    throw new AppError("Tipo deve ser CONTRIBUICAO ou DESPESA", 400);
  }
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 99999999900) {
    throw new AppError("Valor deve ser informado em centavos e ser maior que zero", 400);
  }
  if (Number.isNaN(occurredAt.getTime())) {
    throw new AppError("Data do lancamento invalida", 400);
  }

  return {
    type,
    amountCents,
    category,
    status: normalizeStatus(data.status),
    occurredAt,
    description: input.text(data.description ?? "", "Descricao", { max: 500 }),
    ...(data.receiptUrl !== undefined && {
      receiptUrl:
        typeof data.receiptUrl === "string" ? data.receiptUrl.trim() : "",
      receiptFileName:
        typeof data.receiptFileName === "string"
          ? data.receiptFileName.trim()
          : "",
      receiptStorageId:
        typeof data.receiptStorageId === "string"
          ? data.receiptStorageId.trim()
          : "",
      receiptDeliveryType: data.receiptDeliveryType === "authenticated" ? "authenticated" : "upload",
      receiptFormat: data.receiptFormat || "",
      receiptResourceType:
        typeof data.receiptResourceType === "string"
          ? data.receiptResourceType.trim()
          : "auto",
    }),
  };
}

function serialize(entry, storage) {
  return {
    id: entry._id,
    type: entry.type,
    amountCents: entry.amountCents,
    description: entry.description,
    occurredAt: entry.occurredAt,
    category: entry.category,
    status: entry.status,
    receiptUrl: storage?.receiptUrl(entry) || "",
    receiptFileName: entry.receiptFileName,
    createdBy: entry.createdBy?._id
      ? {
          id: entry.createdBy._id,
          name: entry.createdBy.name,
          email: entry.createdBy.email,
        }
      : entry.createdBy,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

class ManageFinanceEntriesUseCase {
  constructor(storage = new CloudinaryMediaStorage()) { this.storage = storage; }
  async list({ church, userId, role }) {
    const normalizedChurch = validateChurch(church);
    const filter = { church: input.churchPattern(normalizedChurch) };
    const normalizedRole = normalizeRole(role);
    if (![ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER, ROLES.MEMBRO].includes(normalizedRole)) {
      throw new AppError("Perfil sem acesso financeiro", 403);
    }
    if (
      normalizedRole === ROLES.LIDER ||
      normalizedRole === ROLES.MEMBRO
    ) {
      filter.createdBy = userId;
    }

    const query = FinanceEntry.find(filter);
    if (typeof query.populate === "function") {
      query.populate("createdBy", "name email");
    }
    const entries = await query.sort({ occurredAt: -1, createdAt: -1 }).lean();

    const summary = financeSummary(entries);

    return { entries: entries.map(entry => serialize(entry, this.storage)), summary };
  }

  async create({ church, userId, role, data }) {
    const normalizedChurch = validateChurch(church);
    const normalizedRole = normalizeRole(role);
    if (![ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER, ROLES.MEMBRO].includes(normalizedRole)) {
      throw new AppError('Perfil sem acesso financeiro', 403);
    }
    const payload = validatePayload(data);
    if (![ROLES.ADMIN, ROLES.FINANCEIRO].includes(normalizedRole)) {
      if (payload.status === FINANCE_ENTRY_STATUSES.CONFIRMED) {
        throw new AppError('Somente admin ou financeiro pode confirmar', 403);
      }
      payload.status = FINANCE_ENTRY_STATUSES.PENDING;
    }
    if (payload.status === FINANCE_ENTRY_STATUSES.CONFIRMED) {
      payload.confirmedBy = userId;
      payload.confirmedAt = new Date();
    }
    if (
      normalizeRole(role) === ROLES.MEMBRO &&
      payload.type !== FINANCE_ENTRY_TYPES.CONTRIBUTION
    ) {
      throw new AppError("Membro pode lancar apenas contribuicoes", 403);
    }
    if (
      normalizeRole(role) === ROLES.MEMBRO &&
      payload.category === FINANCE_CONTRIBUTION_CATEGORIES.OTHER
    ) {
      throw new AppError("Informe o tipo da contribuicao", 400);
    }
    if (normalizeRole(role) === ROLES.MEMBRO && !payload.receiptUrl) {
      throw new AppError("Comprovante obrigatorio", 400);
    }
    const entry = await FinanceEntry.create({
      ...payload,
      church: normalizedChurch,
      createdBy: userId,
    });
    return serialize(entry, this.storage);
  }

  async update({ id, church, userId, role, data }) {
    if (![ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER].includes(normalizeRole(role))) {
      throw new AppError("Membro nao pode alterar lancamentos", 403);
    }
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const payload = validatePayload(data);
    for (const field of ['receiptUrl', 'receiptFileName', 'receiptStorageId', 'receiptResourceType', 'receiptDeliveryType', 'receiptFormat']) delete payload[field];
    const filter = { _id: id, church: input.churchPattern(normalizedChurch) };
    if (normalizeRole(role) === ROLES.LIDER) {
      if (payload.status === FINANCE_ENTRY_STATUSES.CONFIRMED) {
        throw new AppError('Somente admin ou financeiro pode confirmar', 403);
      }
      filter.createdBy = userId;
      filter.status = FINANCE_ENTRY_STATUSES.PENDING;
    }
    if (data.status === undefined) delete payload.status;
    else {
      payload.confirmedBy = payload.status === FINANCE_ENTRY_STATUSES.CONFIRMED ? userId : null;
      payload.confirmedAt = payload.status === FINANCE_ENTRY_STATUSES.CONFIRMED ? new Date() : null;
    }
    payload.updatedBy = userId;
    const entry = await FinanceEntry.findOneAndUpdate(
      filter,
      payload,
      { new: true, runValidators: true }
    );
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
    return serialize(entry, this.storage);
  }

  async delete({ id, church, userId, role }) {
    if (![ROLES.ADMIN, ROLES.FINANCEIRO, ROLES.LIDER].includes(normalizeRole(role))) {
      throw new AppError("Membro nao pode excluir lancamentos", 403);
    }
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const filter = { _id: id, church: input.churchPattern(normalizedChurch) };
    if (normalizeRole(role) === ROLES.LIDER) {
      filter.createdBy = userId;
      filter.status = FINANCE_ENTRY_STATUSES.PENDING;
    }
    const entry = await FinanceEntry.findOneAndDelete(filter);
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
  }
}

module.exports = ManageFinanceEntriesUseCase;
