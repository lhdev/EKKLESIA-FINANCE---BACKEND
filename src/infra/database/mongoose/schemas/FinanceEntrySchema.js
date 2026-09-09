const mongoose = require("mongoose");

const FINANCE_ENTRY_TYPES = Object.freeze({
  CONTRIBUTION: "CONTRIBUICAO",
  EXPENSE: "DESPESA",
});

const FINANCE_CONTRIBUTION_CATEGORIES = Object.freeze({
  TITHE: "DIZIMO",
  OFFERING: "OFERTA",
  PURPOSE: "PROPOSITO",
  OTHER: "OUTRO",
});

const FINANCE_ENTRY_STATUSES = Object.freeze({
  PENDING: "PENDENTE",
  CONFIRMED: "CONFIRMADO",
});

const FinanceEntrySchema = new mongoose.Schema(
  {
    church: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: Object.values(FINANCE_ENTRY_TYPES),
      required: true,
    },
    amountCents: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: Object.values(FINANCE_CONTRIBUTION_CATEGORIES),
      default: FINANCE_CONTRIBUTION_CATEGORIES.OTHER,
    },
    status: {
      type: String,
      enum: Object.values(FINANCE_ENTRY_STATUSES),
      default: FINANCE_ENTRY_STATUSES.PENDING,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    receiptUrl: { type: String, trim: true, default: "" },
    receiptFileName: { type: String, trim: true, default: "" },
    receiptStorageId: { type: String, trim: true, default: "" },
    receiptResourceType: { type: String, trim: true, default: "auto" },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

FinanceEntrySchema.index({ church: 1, occurredAt: -1 });

const FinanceEntry = mongoose.model("FinanceEntry", FinanceEntrySchema);

module.exports = {
  FinanceEntry,
  FINANCE_ENTRY_TYPES,
  FINANCE_CONTRIBUTION_CATEGORIES,
  FINANCE_ENTRY_STATUSES,
};
