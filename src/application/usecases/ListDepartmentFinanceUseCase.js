const UserSchema = require("../../infra/database/mongoose/schemas/UserSchema");
const {
  FinanceEntry,
  FINANCE_ENTRY_TYPES,
} = require("../../infra/database/mongoose/schemas/FinanceEntrySchema");
const AppError = require("../../shared/errors/AppError");
const { ROLES, normalizeRole } = require("../../shared/config/roles");

class ListDepartmentFinanceUseCase {
  constructor({ userModel = UserSchema, entryModel = FinanceEntry } = {}) {
    this.userModel = userModel;
    this.entryModel = entryModel;
  }

  async execute(church) {
    if (typeof church !== "string" || !church.trim()) {
      throw new AppError("Usuario sem igreja vinculada", 400);
    }

    const users = await this.userModel.find({ church: church.trim() })
      .select("name role")
      .lean();
    const leaders = users.filter(
      (user) => normalizeRole(user.role) === ROLES.LIDER
    );
    const leaderIds = leaders.map((leader) => leader._id);
    const entries = leaderIds.length
      ? await this.entryModel
          .find({ church: church.trim(), createdBy: { $in: leaderIds } })
          .sort({ occurredAt: -1, createdAt: -1 })
          .lean()
      : [];

    const entriesByLeader = new Map();
    for (const entry of entries) {
      const key = String(entry.createdBy);
      const current = entriesByLeader.get(key) || [];
      current.push(entry);
      entriesByLeader.set(key, current);
    }

    const departments = leaders
      .map((leader) => {
        const leaderEntries = entriesByLeader.get(String(leader._id)) || [];
        const totals = leaderEntries.reduce(
          (summary, entry) => {
            if (entry.type === FINANCE_ENTRY_TYPES.CONTRIBUTION) {
              summary.contributionsCents += entry.amountCents;
              summary.balanceCents += entry.amountCents;
            } else {
              summary.expensesCents += entry.amountCents;
              summary.balanceCents -= entry.amountCents;
            }
            return summary;
          },
          { contributionsCents: 0, expensesCents: 0, balanceCents: 0 }
        );

        return {
          leaderId: leader._id,
          name: leader.name,
          ...totals,
          entryCount: leaderEntries.length,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

    const summary = departments.reduce(
      (total, department) => ({
        contributionsCents:
          total.contributionsCents + department.contributionsCents,
        expensesCents: total.expensesCents + department.expensesCents,
        balanceCents: total.balanceCents + department.balanceCents,
      }),
      { contributionsCents: 0, expensesCents: 0, balanceCents: 0 }
    );

    return { departments, summary };
  }
}

module.exports = ListDepartmentFinanceUseCase;
