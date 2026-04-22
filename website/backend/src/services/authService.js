import db from '../db.js';
import { avatarPalette, createNotification, getUserByEmail, getUserById, initials, makeId } from './sharedService.js';

export function loginUser({ email, password }) {
  const user = getUserByEmail(String(email || '').toLowerCase());
  if (!user || user.password !== password) {
    return null;
  }
  const safeUser = getUserById(user.id);
  return { user: safeUser, token: safeUser.id };
}

export function registerUser({ name, email, password, avatarEmoji }) {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const normalizedEmail = email.trim().toLowerCase();
  const user = {
    id: makeId('u'),
    name: name.trim(),
    email: normalizedEmail,
    password,
    initials: initials(name),
    avatarColor: avatarPalette[count % avatarPalette.length],
    avatarEmoji: avatarEmoji || null,
    createdAt: new Date().toISOString()
  };

  db.prepare('INSERT INTO users (id, name, email, password, initials, avatar_color, avatar_emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, user.email, user.password, user.initials, user.avatarColor, user.avatarEmoji, user.createdAt);

  db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive, profile_visibility, activity_visibility)
    VALUES (?, 1, 1, 1, 1, 'group_members', 'group_members')
  `).run(user.id);

  createNotification(user.id, 'account', 'Account ready', `Welcome to SplitStack, ${user.name}. Your account is ready to use.`);
  const pendingInviteCount = db.prepare("SELECT COUNT(*) as count FROM group_invites WHERE lower(email) = lower(?) AND status = 'pending'").get(normalizedEmail).count;
  if (pendingInviteCount) {
    createNotification(user.id, 'invite', 'Pending invites ready', `You have ${pendingInviteCount} pending group invite${pendingInviteCount === 1 ? '' : 's'} waiting for this email.`);
  }
  return { user: getUserById(user.id), token: user.id };
}
