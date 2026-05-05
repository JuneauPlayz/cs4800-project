import { createExpense, getExpenses, requireMembership } from '../services/index.js';
import { getMembersByGroup } from '../services/sharedService.js';

function validateSplits({ groupId, amount, splitMethod, splits }) {
  if (splitMethod === 'equal') return null;
  if (!['percent', 'custom'].includes(splitMethod)) return 'splitMethod must be equal, percent, or custom.';
  if (!Array.isArray(splits) || splits.length === 0) return 'Split details are required for this split method.';

  const memberIds = new Set(getMembersByGroup(groupId).map((member) => member.id));
  const splitIds = new Set(splits.map((split) => split.userId));
  if (splits.length !== memberIds.size || splitIds.size !== memberIds.size || [...splitIds].some((userId) => !memberIds.has(userId))) {
    return 'Splits must include each current group member exactly once.';
  }

  if (splitMethod === 'percent') {
    const total = splits.reduce((sum, split) => sum + Number(split.percent), 0);
    const allValid = splits.every((split) => Number.isFinite(Number(split.percent)) && Number(split.percent) >= 0);
    if (!allValid || Math.abs(total - 100) > 0.01) return 'Percent split must add up to 100%.';
  }

  if (splitMethod === 'custom') {
    const total = splits.reduce((sum, split) => sum + Number(split.amount), 0);
    const allValid = splits.every((split) => Number.isFinite(Number(split.amount)) && Number(split.amount) >= 0);
    if (!allValid || Math.abs(total - amount) > 0.01) return 'Custom split amounts must match the expense total.';
  }

  return null;
}

export function list(req, res) {
  res.json({ expenses: getExpenses(req.user.id) });
}

export function create(req, res) {
  const { groupId, description, amount, category, splitMethod = 'equal' } = req.body ?? {};
  if (!description || !amount || !category) {
    return res.status(400).json({ message: 'description, amount, and category are required.' });
  }
  const normalizedDescription = String(description).trim();
  if (!normalizedDescription) {
    return res.status(400).json({ message: 'Expense description is required.' });
  }
  const amountValue = Number(amount);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return res.status(400).json({ message: 'A positive expense amount is required.' });
  }
  if (groupId !== 'self') {
    if (!groupId) return res.status(400).json({ message: 'groupId is required for group expenses.' });
    if (!requireMembership(groupId, req.user.id)) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }
  }
  const splitError = groupId === 'self' ? null : validateSplits({ groupId, amount: amountValue, splitMethod, splits: req.body?.splits });
  if (splitError) {
    return res.status(400).json({ message: splitError });
  }
  const result = createExpense({ ...req.body, description: normalizedDescription, amount: amountValue, splitMethod, paidBy: req.user.id });
  return res.status(201).json(result);
}
