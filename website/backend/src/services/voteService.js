import db from '../db.js';
import { createNotification, moneyLike, requireMembership } from './sharedService.js';

function buildVoteRows(groupIds) {
  const placeholders = groupIds.map(() => '?').join(',');
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const voteStmt = db.prepare(`
    SELECT v.id, v.group_id as groupId, v.requested_by as requestedBy, v.description, v.amount, v.category,
           v.reason, v.status, v.created_at as createdAt, v.resolved_at as resolvedAt,
           u.name as requestedByName, gt.name as groupName,
           (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = v.group_id) as memberCount
    FROM votes v
    JOIN users u ON u.id = v.requested_by
    JOIN groups_table gt ON gt.id = v.group_id
    WHERE v.group_id IN (${placeholders})
      AND (v.resolved_at IS NULL OR v.resolved_at > '${cutoff}')
    ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, v.created_at DESC
  `);
  const decisionStmt = db.prepare(`
    SELECT d.user_id as userId, d.decision, d.decided_at as decidedAt, u.name
    FROM vote_decisions d
    JOIN users u ON u.id = d.user_id
    WHERE d.vote_id = ?
    ORDER BY d.decided_at ASC
  `);
  return voteStmt.all(...groupIds).map((vote) => ({ ...vote, decisions: decisionStmt.all(vote.id) }));
}

export function getVotes(userId) {
  const groupIds = db.prepare('SELECT group_id as groupId FROM group_members WHERE user_id = ?').all(userId).map((row) => row.groupId);
  if (!groupIds.length) return [];
  return buildVoteRows(groupIds);
}

export function respondToVote(voteId, decision, userId) {
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId);
  if (!vote || !requireMembership(vote.group_id, userId)) return null;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(vote_id, user_id) DO UPDATE SET decision = excluded.decision, decided_at = excluded.decided_at
  `).run(voteId, userId, decision, now);

  const totals = db.prepare('SELECT decision, COUNT(*) as count FROM vote_decisions WHERE vote_id = ? GROUP BY decision').all(voteId);
  const yes = totals.find((item) => item.decision === 'yes')?.count ?? 0;
  const no = totals.find((item) => item.decision === 'no')?.count ?? 0;
  const groupSize = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(vote.group_id).count;

  let status = 'pending';
  if (no >= 1) status = 'declined';
  else if (yes >= groupSize) status = 'approved';

  const resolvedAt = status !== 'pending' ? now : null;
  db.prepare('UPDATE votes SET status = ?, resolved_at = COALESCE(resolved_at, ?) WHERE id = ?').run(status, resolvedAt, voteId);
  if (status === 'approved') {
    createNotification(vote.requested_by, 'vote', 'Expense approved', `"${vote.description}" for ${moneyLike(vote.amount)} was unanimously approved and has been added to the group balance.`);
  } else if (status === 'declined') {
    createNotification(vote.requested_by, 'vote', 'Expense declined', `"${vote.description}" for ${moneyLike(vote.amount)} was declined and will not be added to the group balance.`);
  }

  const memberIds = db.prepare('SELECT user_id as userId FROM group_members WHERE group_id = ?').all(vote.group_id).map((row) => row.userId);
  return buildVoteRows(memberIds.length ? [vote.group_id] : []).find((item) => item.id === voteId) ?? null;
}
