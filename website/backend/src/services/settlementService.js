import db from '../db.js';
import { getSettlementStrategy, getSupportedSettlementMethods } from '../settlementStrategies.js';
import { createNotification, getUserById, makeId, moneyLike } from './sharedService.js';

function normalizeProfile(row = {}, userId = null) {
  return {
    userId: row.userId || userId,
    zelleHandle: row.zelleHandle || '',
    venmoHandle: row.venmoHandle || '',
    cashNote: row.cashNote || '',
    preferredMethod: row.preferredMethod || 'cash'
  };
}

export function getPayoutProfile(userId) {
  const row = db.prepare(`
    SELECT user_id as userId, zelle_handle as zelleHandle, venmo_handle as venmoHandle,
           cash_note as cashNote, preferred_method as preferredMethod
    FROM user_payout_profiles
    WHERE user_id = ?
  `).get(userId);
  return normalizeProfile(row, userId);
}

export function upsertPayoutProfile({
  userId,
  zelleHandle = '',
  venmoHandle = '',
  cashNote = '',
  preferredMethod = 'cash'
}) {
  const supportedMethods = getSupportedSettlementMethods();
  const safeMethod = supportedMethods.includes(preferredMethod) ? preferredMethod : 'cash';
  const payload = {
    userId,
    zelleHandle: String(zelleHandle || '').trim(),
    venmoHandle: String(venmoHandle || '').trim(),
    cashNote: String(cashNote || '').trim(),
    preferredMethod: safeMethod,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO user_payout_profiles (user_id, zelle_handle, venmo_handle, cash_note, preferred_method, updated_at)
    VALUES (@userId, @zelleHandle, @venmoHandle, @cashNote, @preferredMethod, @updatedAt)
    ON CONFLICT(user_id) DO UPDATE SET
      zelle_handle = excluded.zelleHandle,
      venmo_handle = excluded.venmoHandle,
      cash_note = excluded.cashNote,
      preferred_method = excluded.preferredMethod,
      updated_at = excluded.updatedAt
  `).run(payload);

  return getPayoutProfile(userId);
}

export function getSettlementHistory(userId) {
  return db.prepare(`
    SELECT s.id, s.payer_id as payerId, s.payee_id as payeeId, s.amount, s.method, s.note, s.status,
           s.completed_by as completedBy, s.created_at as createdAt, s.completed_at as completedAt,
           payer.name as payerName, payee.name as payeeName
    FROM settlements s
    JOIN users payer ON payer.id = s.payer_id
    JOIN users payee ON payee.id = s.payee_id
    WHERE s.payer_id = ? OR s.payee_id = ?
    ORDER BY s.completed_at DESC
  `).all(userId, userId);
}

export function getCompletedSettlementAdjustments(userId) {
  const settlements = db.prepare(`
    SELECT payer_id as payerId, payee_id as payeeId, amount
    FROM settlements
    WHERE status = 'completed' AND (payer_id = ? OR payee_id = ?)
  `).all(userId, userId);

  const adjustments = { youOwe: {}, owedToYou: {} };
  settlements.forEach((settlement) => {
    if (settlement.payerId === userId) {
      adjustments.youOwe[settlement.payeeId] = Number(((adjustments.youOwe[settlement.payeeId] || 0) + settlement.amount).toFixed(2));
    }
    if (settlement.payeeId === userId) {
      adjustments.owedToYou[settlement.payerId] = Number(((adjustments.owedToYou[settlement.payerId] || 0) + settlement.amount).toFixed(2));
    }
  });
  return adjustments;
}

export function createSettlement({ payerId, payeeId, amount, method = 'cash', note = '' }) {
  if (!payeeId || payeeId === payerId) {
    const error = new Error('Please choose a different person to settle with.');
    error.statusCode = 400;
    throw error;
  }

  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('Settlement amount must be greater than zero.');
    error.statusCode = 400;
    throw error;
  }

  const payee = getUserById(payeeId);
  if (!payee) {
    const error = new Error('The person you are trying to pay could not be found.');
    error.statusCode = 404;
    throw error;
  }

  const sharedGroup = db.prepare(`
    SELECT 1
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = ? AND gm2.user_id = ?
    LIMIT 1
  `).get(payerId, payeeId);
  if (!sharedGroup) {
    const error = new Error('You can only settle balances with people who share a group with you.');
    error.statusCode = 400;
    throw error;
  }

  const payeeProfile = getPayoutProfile(payeeId);
  const strategy = getSettlementStrategy(method);
  strategy.validate({ payeeProfile, payerId, payeeId, amount: numericAmount, note });

  const now = new Date().toISOString();
  const id = makeId('settle');
  const details = strategy.buildDetails({ payeeProfile, payerId, payeeId, amount: numericAmount, note });

  db.prepare(`
    INSERT INTO settlements (id, payer_id, payee_id, amount, method, note, status, completed_by, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
  `).run(id, payerId, payeeId, numericAmount, method, details, payerId, now, now);

  const payer = getUserById(payerId);
  createNotification(payeeId, 'settlement', 'Settlement marked complete', `${payer?.name || 'A group member'} marked ${moneyLike(numericAmount)} as paid via ${method}.`);

  return {
    settlement: db.prepare(`
      SELECT s.id, s.payer_id as payerId, s.payee_id as payeeId, s.amount, s.method, s.note, s.status,
             s.completed_by as completedBy, s.created_at as createdAt, s.completed_at as completedAt
      FROM settlements s
      WHERE s.id = ?
    `).get(id),
    payeeProfile
  };
}
