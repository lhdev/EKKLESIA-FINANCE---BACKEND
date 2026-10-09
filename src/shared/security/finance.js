const AppError = require('../errors/AppError');

function financeSummary(entries) {
  const result = { contributionsCents: 0, expensesCents: 0, balanceCents: 0,
    pendingContributionsCents: 0, pendingExpensesCents: 0 };
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.amountCents) || entry.amountCents <= 0) {
      throw new AppError('Dados financeiros inconsistentes', 500);
    }
    const confirmed = entry.status === 'CONFIRMADO';
    const key = entry.type === 'CONTRIBUICAO'
      ? (confirmed ? 'contributionsCents' : 'pendingContributionsCents')
      : (confirmed ? 'expensesCents' : 'pendingExpensesCents');
    result[key] += entry.amountCents;
    if (!Number.isSafeInteger(result[key])) throw new AppError('Total financeiro excede o limite', 500);
  }
  result.balanceCents = result.contributionsCents - result.expensesCents;
  return result;
}
module.exports = { financeSummary };
