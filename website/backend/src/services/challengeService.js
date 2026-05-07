import db from '../db.js';
import { challengeColors, createNotification, getGroups, getMembersByGroup, getUserById, makeId, moneyLike, requireMembership } from './sharedService.js';

export function getChallenges(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((group) => group.id);
  if (!groupIds.length) return { challenges: [], rings: [] };

  const placeholders = groupIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT c.id, c.group_id as groupId, c.created_by as createdBy, c.name, c.description, c.goal, c.current,
           c.unit, c.color, c.start_date as startDate, c.end_date as endDate, c.created_at as createdAt,
           c.challenge_type, gt.name as groupName, u.name as createdByName
    FROM challenges c
    JOIN groups_table gt ON gt.id = c.group_id
    JOIN users u ON u.id = c.created_by
    WHERE c.group_id IN (${placeholders})
    ORDER BY c.created_at DESC
  `).all(...groupIds);

  const contributionStmt = db.prepare(`
    SELECT cc.id, cc.user_id as userId, cc.amount, cc.created_at as createdAt, u.name, u.initials, u.avatar_color as avatarColor, u.avatar_emoji as avatarEmoji
    FROM challenge_contributions cc
    JOIN users u ON u.id = cc.user_id
    WHERE cc.challenge_id = ?
    ORDER BY cc.created_at DESC
  `);

  const memberSpendStmt = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total FROM (
      SELECT es.amount as total
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE es.user_id = ?
        AND e.group_id != 'self'
        AND e.expense_date >= ? AND e.expense_date <= ?
      UNION ALL
      SELECT e.amount as total
      FROM expenses e
      WHERE e.group_id = 'self'
        AND e.paid_by = ?
        AND e.expense_date >= ? AND e.expense_date <= ?
    )
  `);

  const challenges = rows.map((row) => {
    if (row.challenge_type === 'spending_goal') {
      const members = getMembersByGroup(row.groupId);
      const startDate = row.startDate || row.createdAt.slice(0, 10);
      const endDate = row.endDate || '9999-12-31';
      const memberProgress = members.map((member) => {
        const spent = memberSpendStmt.get(member.id, startDate, endDate, member.id, startDate, endDate);
        return {
          userId: member.id,
          name: member.name,
          initials: member.initials,
          avatarColor: member.avatarColor,
          avatarEmoji: member.avatarEmoji,
          spent: Number((spent?.total ?? 0).toFixed(2)),
          goal: row.goal,
        };
      });
      return { ...row, contributions: [], memberProgress };
    }
    return { ...row, contributions: contributionStmt.all(row.id), memberProgress: [] };
  });

  const rings = challenges.slice(0, 3).map((challenge) => ({ id: challenge.id, label: challenge.name, value: challenge.current, max: challenge.goal, color: challenge.color }));
  return { challenges, rings };
}

export function createChallenge({ userId, groupId, name, description, goal, endDate, startDate, type = 'group_goal' }) {
  if (!requireMembership(groupId, userId)) return null;

  const id = makeId('c');
  const now = new Date().toISOString();
  const resolvedStartDate = startDate || now.slice(0, 10);
  const count = db.prepare('SELECT COUNT(*) as count FROM challenges').get().count;
  db.prepare(`
    INSERT INTO challenges (id, group_id, created_by, name, description, goal, current, unit, color, start_date, end_date, challenge_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, '$', ?, ?, ?, ?, ?)
  `).run(id, groupId, userId, name.trim(), (description || '').trim(), Number(goal), challengeColors[count % challengeColors.length], resolvedStartDate, endDate || null, type, now);

  const group = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(groupId);
  getMembersByGroup(groupId).forEach((member) => {
    if (member.id !== userId) {
      createNotification(member.id, 'challenge', 'New challenge', `${name.trim()} was created in ${group.name}.`);
    }
  });

  return getChallenges(userId).challenges.find((challenge) => challenge.id === id);
}

export function contributeToChallenge({ userId, challengeId, amount }) {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
  if (!challenge || !requireMembership(challenge.group_id, userId)) return null;

  const now = new Date().toISOString();
  db.prepare('INSERT INTO challenge_contributions (id, challenge_id, user_id, amount, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(makeId('cc'), challengeId, userId, Number(amount), now);
  db.prepare('UPDATE challenges SET current = current + ? WHERE id = ?').run(Number(amount), challengeId);

  const group = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(challenge.group_id);
  getMembersByGroup(challenge.group_id).forEach((member) => {
    if (member.id !== userId) {
      createNotification(member.id, 'challenge', 'Challenge updated', `${getUserById(userId).name} added ${moneyLike(amount)} to ${challenge.name} in ${group.name}.`);
    }
  });

  return getChallenges(userId).challenges.find((item) => item.id === challengeId);
}
