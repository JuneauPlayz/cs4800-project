import db from '../db.js';
import {
  createNotification,
  getGroups,
  getPendingInvitesForUser,
  getUserByEmail,
  getUserById,
  makeId,
  normalizeInviteEntries
} from './sharedService.js';

function createInvites(groupId, userId, inviteEntries = []) {
  const normalizedEntries = normalizeInviteEntries(inviteEntries);
  let createdCount = 0;
  const insert = db.prepare(`
    INSERT INTO group_invites (id, group_id, email, invited_name, role, invited_by, status, created_at)
    VALUES (?, ?, ?, ?, 'Member', ?, 'pending', ?)
  `);
  const now = new Date().toISOString();
  const owner = getUserById(userId);

  normalizedEntries.forEach((entry) => {
    if (!entry.email || entry.email === owner?.email?.toLowerCase()) return;
    const existingPending = db.prepare("SELECT id FROM group_invites WHERE group_id = ? AND lower(email) = lower(?) AND status = 'pending'").get(groupId, entry.email);
    if (existingPending) return;
    const existingMember = db.prepare(`
      SELECT 1
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ? AND lower(u.email) = lower(?)
    `).get(groupId, entry.email);
    if (existingMember) return;

    insert.run(makeId('inv'), groupId, entry.email, null, userId, now);
    createdCount += 1;

    const invitedUser = getUserByEmail(entry.email);
    if (invitedUser) {
      const groupName = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(groupId)?.name;
      createNotification(invitedUser.id, 'invite', 'New group invite', `You were invited to join ${groupName}.`);
    }
  });

  return createdCount;
}

export function listGroups(userId) {
  return getGroups(userId);
}

export function listPendingInvites(user) {
  return getPendingInvitesForUser(user);
}

export function createGroup({ userId, name, type = 'custom', threshold = 0, inviteEntries = [], inviteEmails = [], description = '' }) {
  const normalizedName = name.trim();
  const normalizedInvites = inviteEntries?.length ? inviteEntries : inviteEmails;
  const duplicate = db.prepare(`
    SELECT id, created_at as createdAt
    FROM groups_table
    WHERE owner_id = ? AND lower(name) = lower(?) AND type = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, normalizedName, type);

  if (duplicate && Date.now() - new Date(duplicate.createdAt).getTime() < 15000) {
    createInvites(duplicate.id, userId, normalizedInvites);
    return getGroups(userId).find((group) => group.id === duplicate.id);
  }

  const id = makeId('g');
  const now = new Date().toISOString();
  const emoji = ({ roommates: '🏠', trip: '✈️', household: '🏡', custom: '👥' })[type] || '👥';

  db.prepare(`INSERT INTO groups_table (id, name, type, emoji, threshold, created_at, owner_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, normalizedName, type, emoji, Number(threshold || 0), now, userId, description || null);
  db.prepare('INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(id, userId, 'Owner', now);

  const inviteCount = createInvites(id, userId, normalizedInvites);
  createNotification(
    userId,
    'group',
    'Group created',
    inviteCount
      ? `${normalizedName} is ready and ${inviteCount} invite${inviteCount === 1 ? '' : 's'} ${inviteCount === 1 ? 'was' : 'were'} sent.`
      : `${normalizedName} is ready. Invitees will join after they accept.`
  );

  return getGroups(userId).find((group) => group.id === id);
}

export function updateGroup(groupId, userId, payload) {
  const existing = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(groupId);
  if (!existing || existing.owner_id !== userId) return null;

  const nextName = payload.name?.trim() || existing.name;
  const nextType = payload.type || existing.type;
  const nextThreshold = payload.threshold === '' || payload.threshold == null ? existing.threshold : Number(payload.threshold);
  const nextDescription = payload.description ?? existing.description ?? null;
  const normalizedInvites = payload.inviteEntries?.length ? payload.inviteEntries : (payload.inviteEmails || []);

  db.prepare('UPDATE groups_table SET name = ?, type = ?, threshold = ?, description = ? WHERE id = ?')
    .run(nextName, nextType, nextThreshold, nextDescription, groupId);

  const inviteCount = normalizedInvites?.length ? createInvites(groupId, userId, normalizedInvites) : 0;
  createNotification(
    userId,
    'group',
    'Group updated',
    inviteCount
      ? `${nextName} was updated and ${inviteCount} new invite${inviteCount === 1 ? '' : 's'} ${inviteCount === 1 ? 'was' : 'were'} sent.`
      : `${nextName} was updated successfully.`
  );

  return getGroups(userId).find((group) => group.id === groupId);
}

export function leaveGroup(groupId, userId) {
  const membership = db.prepare(`
    SELECT gm.role, gt.name as groupName, gt.owner_id as ownerId
    FROM group_members gm
    JOIN groups_table gt ON gt.id = gm.group_id
    WHERE gm.group_id = ? AND gm.user_id = ?
  `).get(groupId, userId);

  if (!membership) return { ok: false, message: 'You are not a member of this group.' };
  if (membership.ownerId === userId || membership.role === 'Owner') {
    return { ok: false, message: 'Group owners cannot leave their own group. Transfer ownership or delete the group first.' };
  }

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE group_invites
    SET status = 'left', responded_at = ?
    WHERE group_id = ? AND lower(email) = lower((SELECT email FROM users WHERE id = ?))
      AND status IN ('pending', 'accepted')
  `).run(now, groupId, userId);

  const user = getUserById(userId);
  if (user) {
    createNotification(userId, 'group', 'Left group', `You left ${membership.groupName}.`);
    createNotification(membership.ownerId, 'group', 'Member left group', `${user.name} left ${membership.groupName}.`);
  }

  return { ok: true, groupId, message: `You left ${membership.groupName}.` };
}

export function deleteGroup(groupId, userId) {
  const group = db.prepare('SELECT id, name, owner_id as ownerId FROM groups_table WHERE id = ?').get(groupId);
  if (!group) return { ok: false, message: 'Group not found.' };
  if (group.ownerId !== userId) return { ok: false, message: 'Only the group owner can delete this group.' };

  const memberIds = db.prepare('SELECT user_id as userId FROM group_members WHERE group_id = ?').all(groupId).map((row) => row.userId);
  const expenseIds = db.prepare('SELECT id FROM expenses WHERE group_id = ?').all(groupId).map((row) => row.id);
  const voteIds = db.prepare('SELECT id FROM votes WHERE group_id = ?').all(groupId).map((row) => row.id);
  const challengeIds = db.prepare('SELECT id FROM challenges WHERE group_id = ?').all(groupId).map((row) => row.id);

  const transaction = db.transaction(() => {
    if (expenseIds.length) {
      const placeholders = expenseIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM expense_splits WHERE expense_id IN (${placeholders})`).run(...expenseIds);
    }
    if (voteIds.length) {
      const placeholders = voteIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM vote_decisions WHERE vote_id IN (${placeholders})`).run(...voteIds);
    }
    if (challengeIds.length) {
      const placeholders = challengeIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM challenge_contributions WHERE challenge_id IN (${placeholders})`).run(...challengeIds);
    }

    db.prepare('DELETE FROM expenses WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM votes WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM challenges WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_invites WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM groups_table WHERE id = ?').run(groupId);
  });

  transaction();

  memberIds.filter((memberId) => memberId !== userId).forEach((memberId) => {
    createNotification(memberId, 'group', 'Group deleted', `${group.name} was deleted by the group owner.`);
  });
  createNotification(userId, 'group', 'Group deleted', `${group.name} was deleted successfully.`);

  return { ok: true, groupId, message: `${group.name} was deleted successfully.` };
}

export function respondToInvite(inviteId, userId, decision) {
  const user = getUserById(userId);
  const invite = db.prepare('SELECT * FROM group_invites WHERE id = ?').get(inviteId);
  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) return null;

  const now = new Date().toISOString();
  db.prepare('UPDATE group_invites SET status = ?, responded_at = ? WHERE id = ?').run(decision, now, inviteId);

  if (decision === 'accepted') {
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(invite.group_id, userId, invite.role, now);
    const groupName = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(invite.group_id)?.name;
    createNotification(userId, 'group', 'Invite accepted', `You joined ${groupName}.`);
    createNotification(invite.invited_by, 'invite', 'Invite accepted', `${user.name} accepted your invite.`);
  } else {
    createNotification(invite.invited_by, 'invite', 'Invite declined', `${user.name} declined your invite.`);
  }

  return { id: inviteId, status: decision };
}
