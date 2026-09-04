const mongoose = require("mongoose");

const FINANCE_ENTRY_TYPES = Object.freeze({
  CONTRIBUTION: "CONTRIBUICAO",
  EXPENSE: "DESPESA",
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
    description: { type: String, trim: true, maxlength: 500, default: "" },
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

module.exports = { FinanceEntry, FINANCE_ENTRY_TYPES };
