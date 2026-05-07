import crypto from 'node:crypto';
import db from '../db.js';

export const avatarPalette = ['#0D9488', '#8B5CF6', '#F59E0B', '#EF4444', '#2563EB', '#14B8A6', '#EC4899', '#22C55E'];
export const challengeColors = ['#0D9488', '#8B5CF6', '#F59E0B', '#2563EB', '#EC4899', '#22C55E'];

export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function moneyLike(value) {
  return `$${Math.abs(Number(value || 0)).toFixed(2)}`;
}

export function normalizeInviteEntries(textOrArray = []) {
  const raw = Array.isArray(textOrArray) ? textOrArray : String(textOrArray).split(/\n|,/);
  const seen = new Set();
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { email: entry.trim().toLowerCase() };
      return { email: String(entry?.email || '').trim().toLowerCase() };
    })
    .filter((item) => item.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))
    .filter((item) => {
      if (seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    });
}

export function ensureSettings(userId) {
  db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive, profile_visibility, activity_visibility)
    VALUES (?, 1, 1, 1, 1, 'group_members', 'group_members')
  `).run(userId);
}

export function getUserById(userId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.initials, u.avatar_color as avatarColor, u.avatar_emoji as avatarEmoji,
           u.created_at as createdAt
    FROM users u
    WHERE u.id = ?
  `).get(userId);
}

export function updateUserProfile(userId, { avatarEmoji } = {}) {
  if (avatarEmoji !== undefined) {
    db.prepare('UPDATE users SET avatar_emoji = ? WHERE id = ?').run(avatarEmoji, userId);
  }
  return getUserById(userId);
}

export function getUserByEmail(email) {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor, avatar_emoji as avatarEmoji, password FROM users WHERE lower(email) = lower(?)').get(email);
}

export function createNotification(userId, type, title, body) {
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, unread, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
    .run(makeId('n'), userId, type, title, body, new Date().toISOString());
}

export function requireMembership(groupId, userId) {
  return db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

export function getPendingInvitesForUser(user) {
  return db.prepare(`
    SELECT gi.id, gi.group_id as groupId, gi.email, gi.invited_name as invitedName, gi.role, gi.status,
           gi.created_at as createdAt, gi.invited_by as invitedBy, gt.name as groupName, gt.type as groupType,
           iu.name as invitedByName
    FROM group_invites gi
    JOIN groups_table gt ON gt.id = gi.group_id
    JOIN users iu ON iu.id = gi.invited_by
    WHERE lower(gi.email) = lower(?) AND gi.status = 'pending'
    ORDER BY gi.created_at DESC
  `).all(user.email);
}

export function getMembersByGroup(groupId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.initials, u.avatar_color as avatarColor, u.avatar_emoji as avatarEmoji, gm.role, gm.joined_at as joinedAt
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY CASE gm.role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END, u.name ASC
  `).all(groupId);
}

function getPendingInvitesByGroup(groupId) {
  return db.prepare(`
    SELECT id, email, invited_name as invitedName, role, status, created_at as createdAt
    FROM group_invites
    WHERE group_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(groupId);
}

export function getGroups(userId) {
  const groups = db.prepare(`
    SELECT gt.id, gt.name, gt.type, gt.emoji, gt.threshold, gt.created_at as createdAt, gt.owner_id as ownerId, gt.description
    FROM groups_table gt
    JOIN group_members gm ON gm.group_id = gt.id
    WHERE gm.user_id = ?
    ORDER BY gt.created_at DESC
  `).all(userId);

  return groups.map((group) => ({
    ...group,
    isOwner: group.ownerId === userId,
    members: getMembersByGroup(group.id),
    pendingInvites: getPendingInvitesByGroup(group.id)
  }));
}

export function getNotifications(userId) {
  return db.prepare('SELECT id, type, title, body, unread, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    .map((notification) => ({ ...notification, unread: Boolean(notification.unread) }));
}

export function markNotificationRead(notificationId, userId) {
  db.prepare('UPDATE notifications SET unread = 0 WHERE id = ? AND user_id = ?').run(notificationId, userId);
}

export function getSettings(userId) {
  ensureSettings(userId);
  return db.prepare(`
    SELECT user_id as userId, email_votes as emailVotes, email_balance as emailBalance,
           push_settlements as pushSettlements, ai_proactive as aiProactive,
           profile_visibility as profileVisibility, activity_visibility as activityVisibility
    FROM user_settings WHERE user_id = ?
  `).get(userId);
}

export function upsertSettings(nextSettings) {
  db.prepare(`
    INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive, profile_visibility, activity_visibility)
    VALUES (@userId, @emailVotes, @emailBalance, @pushSettlements, @aiProactive, @profileVisibility, @activityVisibility)
    ON CONFLICT(user_id) DO UPDATE SET
      email_votes = excluded.emailVotes,
      email_balance = excluded.emailBalance,
      push_settlements = excluded.pushSettlements,
      ai_proactive = excluded.aiProactive,
      profile_visibility = excluded.profileVisibility,
      activity_visibility = excluded.activityVisibility
  `).run(nextSettings);
  return getSettings(nextSettings.userId);
}
