import { getExpenses } from './expenseService.js';

export function getAnalytics(userId) {
  const expenses = getExpenses(userId);
  const userShare = (expense) => expense.splits.find((split) => split.userId === userId)?.amount ?? 0;

  const totalSpend = Number(expenses.reduce((sum, expense) => sum + userShare(expense), 0).toFixed(2));

  const byMonth = {};
  for (const expense of expenses) {
    const month = (expense.expenseDate || expense.createdAt || '').slice(0, 7);
    if (!month) continue;
    byMonth[month] = (byMonth[month] ?? 0) + userShare(expense);
  }

  const monthValues = Object.values(byMonth);
  const avgPerMonth = monthValues.length > 0
    ? Number((monthValues.reduce((sum, value) => sum + value, 0) / monthValues.length).toFixed(2))
    : 0;

  const byCategory = Object.values(expenses.reduce((acc, expense) => {
    acc[expense.category] ??= { category: expense.category, total: 0 };
    acc[expense.category].total += userShare(expense);
    return acc;
  }, {})).map((item) => ({ ...item, total: Number(item.total.toFixed(2)) })).sort((first, second) => second.total - first.total);

  const monthlyTrend = Object.entries(byMonth)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));

  const topExpenses = expenses
    .map((expense) => ({ id: expense.id, description: expense.description, groupName: expense.groupName, date: expense.expenseDate || expense.createdAt, amount: userShare(expense) }))
    .filter((expense) => expense.amount > 0)
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 5);

  const byFrequency = Object.values(expenses.reduce((acc, expense) => {
    acc[expense.category] ??= { category: expense.category, count: 0 };
    acc[expense.category].count += 1;
    return acc;
  }, {})).sort((first, second) => second.count - first.count);

  return { totalSpend, avgPerMonth, expenseCount: expenses.length, byCategory, monthlyTrend, topExpenses, byFrequency };
}
