import { randomUUID } from 'crypto';
import db from '../db.js';

export function getBudget(req, res) {
  const userId = req.user.id;
  const month = new Date().toISOString().slice(0, 7);
  const goal = db.prepare('SELECT * FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  if (!goal) return res.json({ goal: null });
  return res.json({ goal: { ...goal, breakdown: JSON.parse(goal.breakdown || '{}') } });
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

  const goal = db.prepare('SELECT * FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  return res.json({ goal: { ...goal, breakdown: JSON.parse(goal.breakdown || '{}') } });
}
