const mongoose = require("mongoose");
const AppError = require("../../shared/errors/AppError");
const {
  FinanceEntry,
  FINANCE_ENTRY_TYPES,
} = require("../../infra/database/mongoose/schemas/FinanceEntrySchema");

const TYPE_ALIASES = Object.freeze({
  contribuicao: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  contribution: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  receita: FINANCE_ENTRY_TYPES.CONTRIBUTION,
  despesa: FINANCE_ENTRY_TYPES.EXPENSE,
  expense: FINANCE_ENTRY_TYPES.EXPENSE,
});

function normalizeType(value) {
  if (typeof value !== "string") return null;
  const key = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TYPE_ALIASES[key] || Object.values(FINANCE_ENTRY_TYPES).find(
    (type) => type === value.trim().toUpperCase()
  );
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
    occurredAt,
    description: typeof data.description === "string" ? data.description.trim() : "",
  };
}

function serialize(entry) {
  return {
    id: entry._id,
    type: entry.type,
    amountCents: entry.amountCents,
    description: entry.description,
    occurredAt: entry.occurredAt,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

class ManageFinanceEntriesUseCase {
  async list(church) {
    const normalizedChurch = validateChurch(church);
    const entries = await FinanceEntry.find({ church: normalizedChurch })
      .sort({ occurredAt: -1, createdAt: -1 })
      .lean();

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

  async create({ church, userId, data }) {
    const normalizedChurch = validateChurch(church);
    const payload = validatePayload(data);
    const entry = await FinanceEntry.create({
      ...payload,
      church: normalizedChurch,
      createdBy: userId,
    });
    return serialize(entry);
  }

  async update({ id, church, data }) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const payload = validatePayload(data);
    const entry = await FinanceEntry.findOneAndUpdate(
      { _id: id, church: normalizedChurch },
      payload,
      { new: true, runValidators: true }
    );
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
    return serialize(entry);
  }

  async delete({ id, church }) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Lancamento nao encontrado", 404);
    }
    const normalizedChurch = validateChurch(church);
    const entry = await FinanceEntry.findOneAndDelete({
      _id: id,
      church: normalizedChurch,
    });
    if (!entry) throw new AppError("Lancamento nao encontrado", 404);
  }
}

module.exports = ManageFinanceEntriesUseCase;
