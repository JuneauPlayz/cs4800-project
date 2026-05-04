import { createExpense, getExpenses, requireMembership } from '../services/index.js';

export function list(req, res) {
  res.json({ expenses: getExpenses(req.user.id) });
}

export function create(req, res) {
  const { groupId, description, amount, category, splitMethod = 'equal' } = req.body ?? {};
  if (!description || !amount || !category) {
    return res.status(400).json({ message: 'description, amount, and category are required.' });
  }
  if (groupId !== 'self') {
    if (!groupId) return res.status(400).json({ message: 'groupId is required for group expenses.' });
    if (!requireMembership(groupId, req.user.id)) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }
  }
  const result = createExpense({ ...req.body, amount: Number(amount), splitMethod, paidBy: req.user.id });
  return res.status(201).json(result);
}
