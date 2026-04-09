import db from './db.js';
import crypto from 'node:crypto';

const avatarPalette = ['#0D9488', '#8B5CF6', '#F59E0B', '#EF4444', '#2563EB', '#14B8A6', '#EC4899', '#22C55E'];
const challengeColors = ['#0D9488', '#8B5CF6', '#F59E0B', '#2563EB', '#EC4899', '#22C55E'];

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function normalizeInviteEntries(textOrArray = []) {
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

function ensureSettings(userId) {
  db.prepare(`
    INSERT OR IGNORE INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive, profile_visibility, activity_visibility)
    VALUES (?, 1, 1, 1, 1, 'group_members', 'group_members')
  `).run(userId);
}

export function getUserById(userId) {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor, created_at as createdAt FROM users WHERE id = ?').get(userId);
}

export function getUserByEmail(email) {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor, password FROM users WHERE lower(email) = lower(?)').get(email);
}

export function createUser({ name, email, password }) {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const normalizedEmail = email.trim().toLowerCase();
  const user = {
    id: makeId('u'),
    name: name.trim(),
    email: normalizedEmail,
    password,
    initials: initials(name),
    avatarColor: avatarPalette[count % avatarPalette.length],
    createdAt: new Date().toISOString()
  };
  db.prepare('INSERT INTO users (id, name, email, password, initials, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, user.email, user.password, user.initials, user.avatarColor, user.createdAt);
  ensureSettings(user.id);
  createNotification(user.id, 'account', 'Account ready', `Welcome to SplitStack, ${user.name}. Your account is ready to use.`);
  const pendingInviteCount = db.prepare("SELECT COUNT(*) as count FROM group_invites WHERE lower(email) = lower(?) AND status = 'pending'").get(normalizedEmail).count;
  if (pendingInviteCount) {
    createNotification(user.id, 'invite', 'Pending invites ready', `You have ${pendingInviteCount} pending group invite${pendingInviteCount === 1 ? '' : 's'} waiting for this email.`);
  }
  return getUserById(user.id);
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
    SELECT u.id, u.name, u.email, u.initials, u.avatar_color as avatarColor, gm.role, gm.joined_at as joinedAt
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

export function calculateBalances(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((g) => g.id);
  if (!groupIds.length) {
    const currentUser = getUserById(userId);
    return { byMember: {}, currentUser: { ...currentUser, paid: 0, owed: 0, net: 0 }, net: 0, totalOwedToYou: 0, totalYouOwe: 0, owedToYou: [], youOwe: [], settleCount: 0, people: [] };
  }

  const placeholders = groupIds.map(() => '?').join(',');
  const expenses = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.amount, e.paid_by as paidBy
    FROM expenses e
    WHERE e.group_id IN (${placeholders})
  `).all(...groupIds);
  const splits = db.prepare(`
    SELECT es.expense_id as expenseId, es.user_id as userId, es.amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id IN (${placeholders})
  `).all(...groupIds);

  const relatedUserIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.id)))];
  const userRows = relatedUserIds.length
    ? db.prepare(`SELECT id, name, initials, avatar_color as avatarColor FROM users WHERE id IN (${relatedUserIds.map(() => '?').join(',')})`).all(...relatedUserIds)
    : [];

  const summary = Object.fromEntries(userRows.map((user) => [user.id, { ...user, paid: 0, owed: 0, net: 0 }]));
  expenses.forEach((expense) => {
    if (summary[expense.paidBy]) summary[expense.paidBy].paid += expense.amount;
  });
  splits.forEach((split) => {
    if (summary[split.userId]) summary[split.userId].owed += split.amount;
  });
  Object.values(summary).forEach((user) => {
    user.paid = Number(user.paid.toFixed(2));
    user.owed = Number(user.owed.toFixed(2));
    user.net = Number((user.paid - user.owed).toFixed(2));
  });

  const currentUser = summary[userId] || { ...getUserById(userId), paid: 0, owed: 0, net: 0 };
  const people = Object.values(summary).filter((u) => u.id !== userId).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const groupNames = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const owedToYouMap = {};
  const youOweMap = {};
  expenses.forEach((expense) => {
    const expSplits = splits.filter((s) => s.expenseId === expense.id);
    expSplits.forEach((split) => {
      if (split.userId === expense.paidBy) return;
      if (expense.paidBy === userId && split.userId !== userId && summary[split.userId]) {
        if (!owedToYouMap[split.userId]) owedToYouMap[split.userId] = { ...summary[split.userId], amount: 0, groups: [] };
        owedToYouMap[split.userId].amount += split.amount;
        const gName = groupNames[expense.groupId];
        if (gName && !owedToYouMap[split.userId].groups.find((g) => g.id === expense.groupId)) {
          owedToYouMap[split.userId].groups.push({ id: expense.groupId, name: gName });
        }
      }
      if (split.userId === userId && expense.paidBy !== userId && summary[expense.paidBy]) {
        if (!youOweMap[expense.paidBy]) youOweMap[expense.paidBy] = { ...summary[expense.paidBy], amount: 0, groups: [] };
        youOweMap[expense.paidBy].amount += split.amount;
        const gName = groupNames[expense.groupId];
        if (gName && !youOweMap[expense.paidBy].groups.find((g) => g.id === expense.groupId)) {
          youOweMap[expense.paidBy].groups.push({ id: expense.groupId, name: gName });
        }
      }
    });
  });
  const owedToYou = Object.values(owedToYouMap).map((p) => ({ ...p, amount: Number(p.amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);
  const youOwe = Object.values(youOweMap).map((p) => ({ ...p, amount: Number(p.amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);

  return {
    byMember: summary,
    currentUser,
    net: currentUser.net,
    totalOwedToYou: Number(owedToYou.reduce((s, p) => s + p.amount, 0).toFixed(2)),
    totalYouOwe: Number(youOwe.reduce((s, p) => s + p.amount, 0).toFixed(2)),
    owedToYou,
    youOwe,
    settleCount: people.filter((person) => person.net !== 0).length,
    people
  };
}


export function getExpenses(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((g) => g.id);
  if (!groupIds.length) return [];
  const placeholders = groupIds.map(() => '?').join(',');
  const expenses = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.description, e.amount, e.category, e.paid_by as paidBy,
           e.split_method as splitMethod, e.expense_date as expenseDate, e.merchant, e.receipt_url as receiptUrl, e.created_at as createdAt,
           u.name as paidByName, u.initials as paidByInitials, gt.name as groupName
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    JOIN groups_table gt ON gt.id = e.group_id
    WHERE e.group_id IN (${placeholders})
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all(...groupIds);
  const splitStmt = db.prepare('SELECT user_id as userId, amount FROM expense_splits WHERE expense_id = ?');
  return expenses.map((expense) => ({ ...expense, splits: splitStmt.all(expense.id) }));
}

export function getVotes(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((g) => g.id);
  if (!groupIds.length) return [];
  const placeholders = groupIds.map(() => '?').join(',');
  const voteStmt = db.prepare(`
    SELECT v.id, v.group_id as groupId, v.requested_by as requestedBy, v.description, v.amount, v.category,
           v.reason, v.status, v.created_at as createdAt, u.name as requestedByName, gt.name as groupName
    FROM votes v
    JOIN users u ON u.id = v.requested_by
    JOIN groups_table gt ON gt.id = v.group_id
    WHERE v.group_id IN (${placeholders})
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

export function getNotifications(userId) {
  return db.prepare('SELECT id, type, title, body, unread, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    .map((n) => ({ ...n, unread: Boolean(n.unread) }));
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
      createNotification(invitedUser.id, 'invite', 'New group invite', `You were invited to join ${db.prepare('SELECT name FROM groups_table WHERE id = ?').get(groupId).name}.`);
    }
  });
  return createdCount;
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
  createNotification(userId, 'group', 'Group created', inviteCount ? `${normalizedName} is ready and ${inviteCount} invite${inviteCount === 1 ? '' : 's'} ${inviteCount === 1 ? 'was' : 'were'} sent.` : `${normalizedName} is ready. Invitees will join after they accept.`);
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
  db.prepare('UPDATE groups_table SET name = ?, type = ?, threshold = ?, description = ? WHERE id = ?').run(nextName, nextType, nextThreshold, nextDescription, groupId);
  const inviteCount = normalizedInvites?.length ? createInvites(groupId, userId, normalizedInvites) : 0;
  createNotification(userId, 'group', 'Group updated', inviteCount ? `${nextName} was updated and ${inviteCount} new invite${inviteCount === 1 ? '' : 's'} ${inviteCount === 1 ? 'was' : 'were'} sent.` : `${nextName} was updated successfully.`);
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
    createNotification(userId, 'group', 'Invite accepted', `You joined ${db.prepare('SELECT name FROM groups_table WHERE id = ?').get(invite.group_id).name}.`);
    createNotification(invite.invited_by, 'invite', 'Invite accepted', `${user.name} accepted your invite.`);
  } else {
    createNotification(invite.invited_by, 'invite', 'Invite declined', `${user.name} declined your invite.`);
  }
  return { id: inviteId, status: decision };
}

export function createExpense(payload) {
  const id = makeId('e');
  const createdAt = new Date().toISOString();
  const expenseDate = payload.expenseDate ?? createdAt.slice(0, 10);
  const groupMembers = getMembersByGroup(payload.groupId);
  const memberIds = groupMembers.map((member) => member.id);
  // Determine if this expense needs a vote before being counted
  const group = db.prepare('SELECT threshold, name FROM groups_table WHERE id = ?').get(payload.groupId);
  const needsVote = group && group.threshold > 0 && payload.amount > group.threshold;

  let voteId = null;
  if (needsVote) {
    voteId = `v${Date.now()}`;
  }

  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, merchant, receipt_url, reason, vote_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertExpense.run(
    id,
    payload.groupId,
    payload.description,
    payload.amount,
    payload.category,
    payload.paidBy ?? 'u1',
    payload.splitMethod,
    expenseDate,
    payload.merchant ?? null,
    payload.receiptUrl ?? null,
    payload.reason ?? null,
    voteId,
    createdAt
  );

  const splitStmt = db.prepare('INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)');
  if (payload.splitMethod === 'custom' && Array.isArray(payload.splits)) {
    payload.splits.forEach((split) => splitStmt.run(id, split.userId, Number(split.amount || 0)));
  } else if (payload.splitMethod === 'percent' && Array.isArray(payload.splits)) {
    payload.splits.forEach((split, index) => {
      const raw = Number(((payload.amount * Number(split.percent || 0)) / 100).toFixed(2));
      const assignedSoFar = payload.splits.slice(0, index).reduce((sum, part) => sum + Number(((payload.amount * Number(part.percent || 0)) / 100).toFixed(2)), 0);
      const value = index === payload.splits.length - 1 ? Number((payload.amount - assignedSoFar).toFixed(2)) : raw;
      splitStmt.run(id, split.userId, value);
    });
  } else {
    const share = Number((payload.amount / memberIds.length).toFixed(2));
    memberIds.forEach((memberId, index) => {
      const value = index === memberIds.length - 1 ? Number((payload.amount - share * (memberIds.length - 1)).toFixed(2)) : share;
      splitStmt.run(id, memberId, value);
    });
  }

  let triggeredVote = null;
  if (needsVote) {
    db.prepare(`
      INSERT INTO votes (id, group_id, requested_by, description, amount, category, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voteId, payload.groupId, payload.paidBy ?? 'u1', payload.description, payload.amount, payload.category, payload.reason ?? 'Auto-created from expense above threshold.', 'pending', createdAt);
    db.prepare(`INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at) VALUES (?, ?, ?, ?)`)
      .run(voteId, payload.paidBy ?? 'u1', 'yes', createdAt);
    triggeredVote = voteId;
    groupMembers.filter((member) => member.id !== payload.paidBy).forEach((member) => {
      createNotification(member.id, 'vote', 'New vote request', `${payload.description} for ${moneyLike(payload.amount)} in ${group.name} needs a decision.`);
    });
  }

  // Return null for the expense if it's pending a vote (not yet visible in balances)
  const savedExpense = needsVote ? null : getExpenses(payload.paidBy).find((expense) => expense.id === id);
  return { expense: savedExpense, triggeredVote };
}

export function respondToVote(voteId, decision, userId) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(vote_id, user_id) DO UPDATE SET decision = excluded.decision, decided_at = excluded.decided_at
  `).run(voteId, userId, decision, now);

  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId);
  const totals = db.prepare('SELECT decision, COUNT(*) as count FROM vote_decisions WHERE vote_id = ? GROUP BY decision').all(voteId);
  const yes = totals.find((item) => item.decision === 'yes')?.count ?? 0;
  const no = totals.find((item) => item.decision === 'no')?.count ?? 0;
  const groupSize = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(vote.group_id).count;
  let status = 'pending';
  if (no >= 1) status = 'declined';
  else if (yes >= groupSize) status = 'approved';

  db.prepare('UPDATE votes SET status = ? WHERE id = ?').run(status, voteId);
  // Find the vote's group owner to pass a valid userId to getVotes
  const owner = vote ? db.prepare('SELECT user_id FROM group_members WHERE group_id = ? LIMIT 1').get(vote.group_id) : null;
  const allVotes = owner ? getVotes(owner.user_id) : [];
  return allVotes.find((v) => v.id === voteId) ?? null;
}
export function getAnalytics(userId) {
  const expenses = getExpenses(userId);
  const groups = getGroups(userId);
  const monthTotal = Number(expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const byCategory = Object.values(expenses.reduce((acc, expense) => {
    acc[expense.category] ??= { category: expense.category, total: 0 };
    acc[expense.category].total += expense.amount;
    return acc;
  }, {})).map((item) => ({ ...item, total: Number(item.total.toFixed(2)) })).sort((a, b) => b.total - a.total);
  const byGroup = groups.map((group) => ({ id: group.id, name: group.name, total: Number(expenses.filter((expense) => expense.groupId === group.id).reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)) }));
  return { monthTotal, avgExpense: Number((monthTotal / Math.max(expenses.length, 1)).toFixed(2)), expenseCount: expenses.length, byCategory, byGroup };
}

export function getChallenges(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((g) => g.id);
  if (!groupIds.length) return { challenges: [], rings: [] };
  const placeholders = groupIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT c.id, c.group_id as groupId, c.created_by as createdBy, c.name, c.description, c.goal, c.current,
           c.unit, c.color, c.start_date as startDate, c.end_date as endDate, c.created_at as createdAt,
           gt.name as groupName, u.name as createdByName
    FROM challenges c
    JOIN groups_table gt ON gt.id = c.group_id
    JOIN users u ON u.id = c.created_by
    WHERE c.group_id IN (${placeholders})
    ORDER BY c.created_at DESC
  `).all(...groupIds);
  const contribStmt = db.prepare(`
    SELECT cc.id, cc.user_id as userId, cc.amount, cc.created_at as createdAt, u.name, u.initials, u.avatar_color as avatarColor
    FROM challenge_contributions cc
    JOIN users u ON u.id = cc.user_id
    WHERE cc.challenge_id = ?
    ORDER BY cc.created_at DESC
  `);
  const challenges = rows.map((row) => ({ ...row, contributions: contribStmt.all(row.id) }));
  const rings = challenges.slice(0, 3).map((challenge) => ({ id: challenge.id, label: challenge.name, value: challenge.current, max: challenge.goal, color: challenge.color }));
  return { challenges, rings };
}

export function createChallenge({ userId, groupId, name, description, goal, endDate }) {
  if (!requireMembership(groupId, userId)) return null;
  const id = makeId('c');
  const now = new Date().toISOString();
  const count = db.prepare('SELECT COUNT(*) as count FROM challenges').get().count;
  db.prepare(`
    INSERT INTO challenges (id, group_id, created_by, name, description, goal, current, unit, color, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, '$', ?, ?, ?, ?)
  `).run(id, groupId, userId, name.trim(), description.trim(), Number(goal), challengeColors[count % challengeColors.length], now.slice(0, 10), endDate || null, now);
  const group = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(groupId);
  getMembersByGroup(groupId).forEach((member) => {
    if (member.id !== userId) createNotification(member.id, 'challenge', 'New challenge', `${name.trim()} was created in ${group.name}.`);
  });
  return getChallenges(userId).challenges.find((challenge) => challenge.id === id);
}

export function contributeToChallenge({ userId, challengeId, amount }) {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
  if (!challenge || !requireMembership(challenge.group_id, userId)) return null;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO challenge_contributions (id, challenge_id, user_id, amount, created_at) VALUES (?, ?, ?, ?, ?)').run(makeId('cc'), challengeId, userId, Number(amount), now);
  db.prepare('UPDATE challenges SET current = current + ? WHERE id = ?').run(Number(amount), challengeId);
  const group = db.prepare('SELECT name FROM groups_table WHERE id = ?').get(challenge.group_id);
  getMembersByGroup(challenge.group_id).forEach((member) => {
    if (member.id !== userId) createNotification(member.id, 'challenge', 'Challenge updated', `${getUserById(userId).name} added ${moneyLike(amount)} to ${challenge.name} in ${group.name}.`);
  });
  return getChallenges(userId).challenges.find((item) => item.id === challengeId);
}

export function generateAiReply(userId, question) {
  const balances = calculateBalances(userId);
  const analytics = getAnalytics(userId);
  const pendingVotes = getVotes(userId).filter((vote) => vote.status === 'pending');
  const lower = question.toLowerCase();
  if (lower.includes('owe')) {
    const top = balances.people[0];
    return top ? `${top.name} has the largest current imbalance at ${moneyLike(top.net)}. Your overall net balance is ${moneyLike(balances.net)}.` : 'There are no active balances yet.';
  }
  if (lower.includes('grocery')) {
    const groceries = analytics.byCategory.find((item) => item.category.toLowerCase() === 'groceries');
    return `Groceries total ${moneyLike(groceries?.total ?? 0)} across your active groups. The biggest category overall is ${analytics.byCategory[0]?.category ?? 'none yet'} at ${moneyLike(analytics.byCategory[0]?.total ?? 0)}.`;
  }
  if (lower.includes('challenge')) {
    const challenge = getChallenges(userId).challenges[0];
    return challenge ? `${challenge.name} is currently at ${moneyLike(challenge.current)} out of ${moneyLike(challenge.goal)} in ${challenge.groupName}.` : 'No challenges exist yet. Create one on the Challenges page.';
  }
  if (lower.includes('vote')) {
    if (!pendingVotes.length) return 'There are no pending votes right now.';
    const vote = pendingVotes[0];
    return `The current pending vote is ${vote.description} for ${moneyLike(vote.amount)} in ${vote.groupName}. ${vote.decisions.length} decision(s) have been logged so far.`;
  }
  return `You have ${pendingVotes.length} pending vote${pendingVotes.length === 1 ? '' : 's'} and your current net balance is ${moneyLike(balances.net)}. Your top spending category is ${analytics.byCategory[0]?.category ?? 'not enough data yet'}.`;
}

function moneyLike(value) {
  return `$${Math.abs(Number(value || 0)).toFixed(2)}`;
}

export function sendInvitation(groupId, invitedByUserId, invitedEmail) {
  const email = invitedEmail.toLowerCase().trim();
  const group = db.prepare('SELECT id, name FROM groups_table WHERE id = ?').get(groupId);
  if (!group) throw new Error('Group not found.');

  const invitedUser = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (invitedUser) {
    const alreadyMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, invitedUser.id);
    if (alreadyMember) throw new Error('This user is already a member of the group.');
  }

  const existing = db.prepare('SELECT id FROM group_invitations WHERE group_id = ? AND invited_email = ? AND status = ?').get(groupId, email, 'pending');
  if (existing) throw new Error('An invite has already been sent to this email for this group.');

  const id = `inv${Date.now()}`;
  db.prepare('INSERT INTO group_invitations (id, group_id, invited_by, invited_email, invited_user_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, groupId, invitedByUserId, email, invitedUser?.id ?? null, 'pending', new Date().toISOString());

  return { id, groupId, invitedEmail: email, status: 'pending' };
}

export function getPendingInvitations(userId) {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!user) return [];

  return db.prepare(`
    SELECT gi.id, gi.group_id as groupId, gi.invited_email as invitedEmail, gi.status, gi.created_at as createdAt,
           gt.name as groupName, gt.emoji as groupEmoji, gt.type as groupType,
           u.name as invitedByName
    FROM group_invitations gi
    JOIN groups_table gt ON gt.id = gi.group_id
    JOIN users u ON u.id = gi.invited_by
    WHERE lower(gi.invited_email) = lower(?) AND gi.status = 'pending'
    ORDER BY gi.created_at DESC
  `).all(user.email);
}

export function respondToInvitation(invitationId, userId, decision) {
  const invite = db.prepare('SELECT * FROM group_invitations WHERE id = ?').get(invitationId);
  if (!invite) throw new Error('Invitation not found.');
  if (invite.status !== 'pending') throw new Error('Invitation has already been responded to.');

  const user = db.prepare('SELECT id, name, initials, avatar_color as avatarColor FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found.');

  db.prepare('UPDATE group_invitations SET status = ?, invited_user_id = ? WHERE id = ?').run(decision, userId, invitationId);

  if (decision === 'accepted') {
    const alreadyMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(invite.group_id, userId);
    if (!alreadyMember) {
      db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(invite.group_id, userId, 'Member');
    }
  }
  return { id: invitationId, status: decision };
}
