const mongoose = require("mongoose");
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
  const key = normalizeText(value);
  return CATEGORY_ALIASES[key] || Object.values(
    FINANCE_CONTRIBUTION_CATEGORIES
  ).find((category) => category === value?.trim().toUpperCase());
}

function normalizeStatus(value) {
  if (typeof value !== "string") return FINANCE_ENTRY_STATUSES.PENDING;
  const normalized = normalizeText(value);
  if (normalized === "confirmado" || normalized === "confirmed") {
    return FINANCE_ENTRY_STATUSES.CONFIRMED;
  }
  return FINANCE_ENTRY_STATUSES.PENDING;
}

function validateChurch(church) {
  if (typeof church !== "string" || !church.trim()) {
    throw new AppError("Usuario sem igreja vinculada", 400);
  }
  return church.trim();
}

function validatePayload(data) {
  const type = normalizeType(data.type);
  const amountCents = Number(data.amountCents);
  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
  const category = normalizeCategory(data.category) ||
    FINANCE_CONTRIBUTION_CATEGORIES.OTHER;

  if (!type) {
    throw new AppError("Tipo deve ser CONTRIBUICAO ou DESPESA", 400);
  }
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
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
    description: typeof data.description === "string" ? data.description.trim() : "",
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
      receiptResourceType:
        typeof data.receiptResourceType === "string"
          ? data.receiptResourceType.trim()
          : "auto",
    }),
  };
}

function serialize(entry) {
  return {
    id: entry._id,
    type: entry.type,
    amountCents: entry.amountCents,
    description: entry.description,
    occurredAt: entry.occurredAt,
    category: entry.category,
    status: entry.status,
    receiptUrl: entry.receiptUrl,
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
  async list({ church, userId, role }) {
    const normalizedChurch = validateChurch(church);
    const filter = { church: normalizedChurch };
    const normalizedRole = normalizeRole(role);
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

    const summary = entries.reduce(
      (totals, entry) => {
        if (entry.type === FINANCE_ENTRY_TYPES.CONTRIBUTION) {
          totals.contributionsCents += entry.amountCents;
          totals.balanceCents += entry.amountCents;
        } else {
          totals.expensesCents += entry.amountCents;
          totals.balanceCents -= entry.amountCents;
        }
        return totals;
      },
      { contributionsCents: 0, expensesCents: 0, balanceCents: 0 }
    );

    return { entries: entries.map(serialize), summary };
  }

  async create({ church, userId, role, data }) {
    const normalizedChurch = validateChurch(church);
    const payload = validatePayload(data);
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
    return serialize(entry);
  }

  async update({ id, church, userId, role, data }) {
    if (normalizeRole(role) === ROLES.MEMBRO) {
      throw new AppError("Membro nao pode alterar lancamentos", 403);
    }
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const payload = validatePayload(data);
    const filter = { _id: id, church: normalizedChurch };
    if (normalizeRole(role) === ROLES.LIDER) filter.createdBy = userId;
    const entry = await FinanceEntry.findOneAndUpdate(
      filter,
      payload,
      { new: true, runValidators: true }
    );
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
    return serialize(entry);
  }

  async delete({ id, church, userId, role }) {
    if (normalizeRole(role) === ROLES.MEMBRO) {
      throw new AppError("Membro nao pode excluir lancamentos", 403);
    }
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const filter = { _id: id, church: normalizedChurch };
    if (normalizeRole(role) === ROLES.LIDER) filter.createdBy = userId;
    const entry = await FinanceEntry.findOneAndDelete(filter);
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
  }
}

module.exports = ManageFinanceEntriesUseCase;
