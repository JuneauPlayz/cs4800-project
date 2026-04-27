import { createExpense, getExpenses, requireMembership } from '../services/index.js';

export function list(req, res) {
  res.json({ expenses: getExpenses(req.user.id) });
}

export function create(req, res) {
  const { groupId, description, amount, category, splitMethod = 'equal' } = req.body ?? {};
  if (!groupId || !description || !amount || !category) {
    return res.status(400).json({ message: 'groupId, description, amount, and category are required.' });
  }
  if (!requireMembership(groupId, req.user.id)) {
    return res.status(403).json({ message: 'You are not a member of this group.' });
  }
  try {
    const result = createExpense({ ...req.body, amount: Number(amount), splitMethod, paidBy: req.user.id });
    return res.status(201).json(result);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    throw error;
  }
}
