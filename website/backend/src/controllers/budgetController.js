import { randomUUID } from 'crypto';
import db from '../db.js';

function computeActuals(userId, month) {
  const selfRows = db
    .prepare(`SELECT category, amount FROM expenses WHERE group_id = 'self' AND paid_by = ? AND expense_date LIKE ?`)
    .all(userId, `${month}%`);
  const groupRows = db
    .prepare(
      `SELECT e.category, es.amount
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       LEFT JOIN votes v ON v.id = e.vote_id
       WHERE es.user_id = ? AND e.expense_date LIKE ?
         AND e.group_id != 'self'
         AND (e.vote_id IS NULL OR v.status = 'approved')`
    )
    .all(userId, `${month}%`);
  const actuals = {};
  [...selfRows, ...groupRows].forEach(({ category, amount }) => {
    actuals[category] = Number(((actuals[category] || 0) + Number(amount)).toFixed(2));
  });
  return actuals;
}

export function getBudget(req, res) {
  const userId = req.user.id;
  const month = new Date().toISOString().slice(0, 7);
  const goal = db.prepare('SELECT * FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  const actuals = computeActuals(userId, month);
  return res.json({
    goal: {
      id: goal?.id ?? null,
      total: Number(goal?.total ?? 0),
      breakdown: JSON.parse(goal?.breakdown || '{}'),
      actuals,
      month,
    },
  });
}

export function saveBudget(req, res) {
  const userId = req.user.id;
  const month = new Date().toISOString().slice(0, 7);
  const { total = 0, breakdown = {} } = req.body ?? {};
  const now = new Date().toISOString();
  const breakdownJson = JSON.stringify(breakdown);

  const existing = db.prepare('SELECT id FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  if (existing) {
    db.prepare('UPDATE budget_goals SET total = ?, breakdown = ?, updated_at = ? WHERE id = ?')
      .run(Number(total), breakdownJson, now, existing.id);
  } else {
    db.prepare('INSERT INTO budget_goals (id, user_id, month, total, breakdown, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), userId, month, Number(total), breakdownJson, now, now);
  }

  const saved = db.prepare('SELECT * FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  const actuals = computeActuals(userId, month);
  return res.json({
    goal: {
      id: saved?.id ?? null,
      total: Number(saved?.total ?? 0),
      breakdown: JSON.parse(saved?.breakdown || '{}'),
      actuals,
      month,
    },
  });
}
