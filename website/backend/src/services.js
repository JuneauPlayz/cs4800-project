import db from './db.js';

const avatarPalette = ['#0D9488', '#8B5CF6', '#F59E0B', '#EF4444', '#2563EB', '#14B8A6', '#EC4899', '#22C55E'];

function initials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeMemberNames(namesInput = []) {
  const names = Array.isArray(namesInput)
    ? namesInput
    : String(namesInput)
      .split(/\n|,/)
      .map((value) => value.trim());

  const seen = new Set();
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function ensureUserByName(name) {
  const existing = db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE lower(name) = lower(?)').get(name);
  if (existing) return existing;

  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const id = `u${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const emailSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || `member.${count + 1}`;
  const user = {
    id,
    name,
    email: `${emailSlug}@splitstack.local`,
    password: 'demo123',
    initials: initials(name),
    avatarColor: avatarPalette[count % avatarPalette.length]
  };
  db.prepare('INSERT INTO users (id, name, email, password, initials, avatar_color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, user.email, user.password, user.initials, user.avatarColor);
  db.prepare('INSERT OR IGNORE INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive) VALUES (?, 1, 1, 1, 1)')
    .run(user.id);
  return user;
}

function replaceGroupMembers(groupId, memberNames = []) {
  const normalizedNames = normalizeMemberNames(memberNames);
  const insertMember = db.prepare('INSERT OR REPLACE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)');

  const members = normalizedNames.map((name, index) => {
    const user = ensureUserByName(name);
    insertMember.run(groupId, user.id, index === 0 ? 'Owner' : 'Member');
    return user;
  });

  return members;
}

export function getCurrentUser(userId) {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE id = ?').get(userId);
}

export function getMembersByGroup(groupId) {
  return db.prepare(`
    SELECT u.id, u.name, u.initials, u.avatar_color as avatarColor, gm.role
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY CASE gm.role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END, u.name ASC
  `).all(groupId);
}

export function getGroups(userId) {
  const groups = db.prepare(`
    SELECT gt.id, gt.name, gt.type, gt.emoji, gt.threshold, gt.blockchain_enabled as blockchainEnabled, gt.created_at as createdAt
    FROM groups_table gt
    JOIN group_members gm ON gm.group_id = gt.id AND gm.user_id = ?
    ORDER BY gt.created_at ASC
  `).all(userId);
  const pendingInviteStmt = db.prepare(`
    SELECT id, invited_email as invitedEmail, created_at as createdAt
    FROM group_invitations
    WHERE group_id = ? AND status = 'pending'
    ORDER BY created_at ASC
  `);
  return groups.map((group) => ({
    ...group,
    blockchainEnabled: Boolean(group.blockchainEnabled),
    members: getMembersByGroup(group.id),
    pendingInvitations: pendingInviteStmt.all(group.id)
  }));
}

export function getExpenses(userId) {
  const expenses = db.prepare(`
    SELECT DISTINCT e.id, e.group_id as groupId, e.description, e.amount, e.category, e.paid_by as paidBy,
           e.split_method as splitMethod, e.expense_date as expenseDate, e.blockchain_enabled as blockchainEnabled,
           e.merchant, e.receipt_url as receiptUrl, e.reason, e.vote_id as voteId, e.created_at as createdAt,
           u.name as paidByName, u.initials as paidByInitials
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = ?
    WHERE e.vote_id IS NULL OR EXISTS (
      SELECT 1 FROM votes v WHERE v.id = e.vote_id AND v.status = 'approved'
    )
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all(userId);

  const splitStmt = db.prepare(`SELECT user_id as userId, amount FROM expense_splits WHERE expense_id = ?`);
  return expenses.map((expense) => ({
    ...expense,
    blockchainEnabled: Boolean(expense.blockchainEnabled),
    splits: splitStmt.all(expense.id)
  }));
}

export function getVotes(userId) {
  const voteStmt = db.prepare(`
    SELECT v.id, v.group_id as groupId, v.requested_by as requestedBy, v.description, v.amount, v.category,
           v.reason, v.status, v.created_at as createdAt, u.name as requestedByName
    FROM votes v
    JOIN users u ON u.id = v.requested_by
    JOIN group_members gm ON gm.group_id = v.group_id AND gm.user_id = ?
    ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, v.created_at DESC
  `);
  const decisionStmt = db.prepare(`
    SELECT d.user_id as userId, d.decision, d.decided_at as decidedAt, u.name
    FROM vote_decisions d
    JOIN users u ON u.id = d.user_id
    WHERE d.vote_id = ?
    ORDER BY d.decided_at ASC
  `);
  const memberCountStmt = db.prepare(`SELECT COUNT(*) as count FROM group_members WHERE group_id = ?`);
  return voteStmt.all(userId).map((vote) => {
    const decisions = decisionStmt.all(vote.id);
    const memberCount = memberCountStmt.get(vote.groupId).count;
    return { ...vote, decisions, memberCount };
  });
}

export function calculateBalances(userId) {
  const expenses = getExpenses(userId);
  // Only include users who appear in these expenses
  const involvedUserIds = new Set([
    ...expenses.map((e) => e.paidBy),
    ...expenses.flatMap((e) => e.splits.map((s) => s.userId))
  ]);
  const users = involvedUserIds.size
    ? db.prepare(`SELECT id, name, initials, avatar_color as avatarColor FROM users WHERE id IN (${[...involvedUserIds].map(() => '?').join(',')})`)
        .all(...involvedUserIds)
    : [];
  const groupNames = Object.fromEntries(
    db.prepare('SELECT id, name FROM groups_table').all().map((g) => [g.id, g.name])
  );
  const summary = Object.fromEntries(users.map((user) => [user.id, { ...user, paid: 0, owed: 0, net: 0 }]));

  expenses.forEach((expense) => {
    if (!summary[expense.paidBy]) return;
    summary[expense.paidBy].paid += expense.amount;
    expense.splits.forEach((split) => {
      if (summary[split.userId]) summary[split.userId].owed += split.amount;
    });
  });

  Object.values(summary).forEach((user) => {
    user.paid = Number(user.paid.toFixed(2));
    user.owed = Number(user.owed.toFixed(2));
    user.net = Number((user.paid - user.owed).toFixed(2));
  });

  const owedToYouMap = {};
  const youOweMap = {};

  expenses.forEach((expense) => {
    expense.splits.forEach((split) => {
      if (split.userId === expense.paidBy) return;
      if (expense.paidBy === userId && split.userId !== userId && summary[split.userId]) {
        if (!owedToYouMap[split.userId]) owedToYouMap[split.userId] = { ...summary[split.userId], amount: 0, groups: [] };
        owedToYouMap[split.userId].amount += split.amount;
        if (!owedToYouMap[split.userId].groups.find((g) => g.id === expense.groupId)) {
          owedToYouMap[split.userId].groups.push({ id: expense.groupId, name: groupNames[expense.groupId] || expense.groupId });
        }
      }
      if (split.userId === userId && expense.paidBy !== userId && summary[expense.paidBy]) {
        if (!youOweMap[expense.paidBy]) youOweMap[expense.paidBy] = { ...summary[expense.paidBy], amount: 0, groups: [] };
        youOweMap[expense.paidBy].amount += split.amount;
        if (!youOweMap[expense.paidBy].groups.find((g) => g.id === expense.groupId)) {
          youOweMap[expense.paidBy].groups.push({ id: expense.groupId, name: groupNames[expense.groupId] || expense.groupId });
        }
      }
    });
  });

  const owedToYou = Object.values(owedToYouMap).map((p) => ({ ...p, amount: Number(p.amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);
  const youOwe = Object.values(youOweMap).map((p) => ({ ...p, amount: Number(p.amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);
  const totalOwedToYou = Number(owedToYou.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
  const totalYouOwe = Number(youOwe.reduce((sum, p) => sum + p.amount, 0).toFixed(2));

  const currentUser = summary[userId] ?? { paid: 0, owed: 0, net: 0 };
  const people = Object.values(summary)
    .filter((user) => user.id !== userId)
    .map((user) => ({ ...user, direction: user.net >= 0 ? 'owed' : 'owes' }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  return {
    byMember: summary,
    currentUser,
    net: Number((currentUser.paid - currentUser.owed).toFixed(2)),
    totalOwedToYou,
    totalYouOwe,
    owedToYou,
    youOwe,
    settleCount: people.filter((person) => person.net !== 0).length,
    people
  };
}

export function getAnalytics(userId) {
  const expenses = getExpenses(userId);
  const monthTotal = Number(expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const byCategory = Object.values(expenses.reduce((acc, expense) => {
    acc[expense.category] ??= { category: expense.category, total: 0 };
    acc[expense.category].total += expense.amount;
    return acc;
  }, {})).map((item) => ({ ...item, total: Number(item.total.toFixed(2)) })).sort((a, b) => b.total - a.total);

  const byGroup = getGroups(userId).map((group) => ({
    id: group.id,
    name: group.name,
    total: Number(expenses.filter((expense) => expense.groupId === group.id).reduce((sum, expense) => sum + expense.amount, 0).toFixed(2))
  }));

  const alertSubscriptions = db.prepare(`
    SELECT id, name, emoji, cost, monthly_savings_text as monthlySavingsText
    FROM subscriptions
    WHERE monthly_savings_text IS NOT NULL
  `).all();

  return {
    monthTotal,
    avgExpense: Number((monthTotal / Math.max(expenses.length, 1)).toFixed(2)),
    expenseCount: expenses.length,
    byCategory,
    byGroup,
    subscriptionAlerts: alertSubscriptions
  };
}

export function getProgress() {
  const challenges = db.prepare('SELECT id, name, description, goal, current, unit, color FROM challenges ORDER BY name ASC').all();
  const badges = db.prepare('SELECT id, name, earned FROM badges ORDER BY id ASC').all().map((badge) => ({ ...badge, earned: Boolean(badge.earned) }));
  const rings = [
    { id: 'r1', label: 'Savings', value: 72, max: 100, color: '#0D9488' },
    { id: 'r2', label: 'Streak', value: 14, max: 30, color: '#8B5CF6' },
    { id: 'r3', label: 'Team Goal', value: 840, max: 1200, color: '#F59E0B' }
  ];
  return { challenges, badges, rings };
}

export function getNotifications() {
  return db.prepare('SELECT id, type, title, body, unread, created_at as createdAt FROM notifications ORDER BY created_at DESC').all()
    .map((notification) => ({ ...notification, unread: Boolean(notification.unread) }));
}

export function getSettings(userId) {
  return db.prepare('SELECT user_id as userId, email_votes as emailVotes, email_balance as emailBalance, push_settlements as pushSettlements, ai_proactive as aiProactive FROM user_settings WHERE user_id = ?').get(userId);
}

export function upsertSettings(nextSettings) {
  db.prepare(`
    INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive)
    VALUES (@userId, @emailVotes, @emailBalance, @pushSettlements, @aiProactive)
    ON CONFLICT(user_id) DO UPDATE SET
      email_votes = excluded.email_votes,
      email_balance = excluded.email_balance,
      push_settlements = excluded.push_settlements,
      ai_proactive = excluded.ai_proactive
  `).run(nextSettings);
  return getSettings(nextSettings.userId);
}

export function createGroup(payload, creatorId) {
  const id = `g${Date.now()}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  db.prepare(`INSERT INTO groups_table (id, name, type, emoji, threshold, blockchain_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, payload.name, payload.type ?? 'custom', payload.emoji ?? '👥', Number(payload.threshold ?? 0), 0, createdAt);

  // Always add creator as owner only; others join via invitation acceptance
  db.prepare('INSERT OR REPLACE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(id, creatorId, 'Owner');

  return getGroups(creatorId).find((group) => group.id === id);
}

export function updateGroup(groupId, payload) {
  const existing = db.prepare('SELECT * FROM groups_table WHERE id = ?').get(groupId);
  if (!existing) return null;

  const nextName = payload.name?.trim() || existing.name;
  const nextType = payload.type || existing.type;
  const nextEmoji = payload.emoji || existing.emoji;
  const nextThreshold = payload.threshold === '' || payload.threshold == null ? existing.threshold : Number(payload.threshold);

  db.prepare('UPDATE groups_table SET name = ?, type = ?, emoji = ?, threshold = ? WHERE id = ?')
    .run(nextName, nextType, nextEmoji, nextThreshold, groupId);

  // Return the group as visible to the first member (owner)
  const owner = db.prepare('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY CASE role WHEN \'Owner\' THEN 0 ELSE 1 END LIMIT 1').get(groupId);
  return getGroups(owner?.user_id ?? groupId).find((group) => group.id === groupId) ?? null;
}

export function leaveGroup(groupId, userId) {
  const membership = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  if (!membership) throw new Error('You are not a member of this group.');

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  db.prepare('DELETE FROM group_invitations WHERE group_id = ? AND invited_user_id = ?').run(groupId, userId);

  return { left: true };
}

export function createExpense(payload) {
  const id = `e${Date.now()}`;
  const createdAt = new Date().toISOString();
  const expenseDate = payload.expenseDate ?? createdAt.slice(0, 10);
  const groupMembers = getMembersByGroup(payload.groupId);
  const memberIds = groupMembers.map((member) => member.id);
  // Determine if this expense needs a vote before being counted
  const group = db.prepare('SELECT threshold FROM groups_table WHERE id = ?').get(payload.groupId);
  const needsVote = group && Number(payload.threshold ?? payload.amount) > 0 && payload.amount > group.threshold;

  let voteId = null;
  if (needsVote) {
    voteId = `v${Date.now()}`;
  }

  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, blockchain_enabled, merchant, receipt_url, reason, vote_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    payload.blockchainEnabled ? 1 : 0,
    payload.merchant ?? null,
    payload.receiptUrl ?? null,
    payload.reason ?? null,
    voteId,
    createdAt
  );

  const splitStmt = db.prepare(`INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)`);
  if (payload.splitMethod === 'custom' && Array.isArray(payload.splits)) {
    payload.splits.forEach((split) => splitStmt.run(id, split.userId, split.amount));
  } else if (payload.splitMethod === 'percent' && Array.isArray(payload.splits)) {
    payload.splits.forEach((split) => splitStmt.run(id, split.userId, Number(((payload.amount * split.percent) / 100).toFixed(2))));
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
  }

  // Return null for the expense if it's pending a vote (not yet visible in balances)
  const savedExpense = needsVote ? null : getExpenses(payload.paidBy).find((expense) => expense.id === id);
  return { expense: savedExpense, triggeredVote };
}

export function respondToVote(voteId, decision, userId = 'u1') {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(vote_id, user_id) DO UPDATE SET decision = excluded.decision, decided_at = excluded.decided_at
  `).run(voteId, userId, decision, now);

  const totals = db.prepare(`
    SELECT decision, COUNT(*) as count
    FROM vote_decisions
    WHERE vote_id = ?
    GROUP BY decision
  `).all(voteId);
  const yes = totals.find((item) => item.decision === 'yes')?.count ?? 0;
  const no = totals.find((item) => item.decision === 'no')?.count ?? 0;
  const groupSize = db.prepare(`
    SELECT COUNT(*) as count
    FROM votes v
    JOIN group_members gm ON gm.group_id = v.group_id
    WHERE v.id = ?
  `).get(voteId).count;

  let status = 'pending';
  if (no >= 1) status = 'declined';
  else if (yes >= groupSize) status = 'approved';

  db.prepare('UPDATE votes SET status = ? WHERE id = ?').run(status, voteId);
  // Find the vote's group owner to pass a valid userId to getVotes
  const vote = db.prepare('SELECT group_id FROM votes WHERE id = ?').get(voteId);
  const owner = vote ? db.prepare('SELECT user_id FROM group_members WHERE group_id = ? LIMIT 1').get(vote.group_id) : null;
  const allVotes = owner ? getVotes(owner.user_id) : [];
  return allVotes.find((v) => v.id === voteId) ?? null;
}

export function generateAiReply(question, userId) {
  const balances = calculateBalances(userId);
  const analytics = getAnalytics(userId);
  const pendingVotes = getVotes(userId).filter((vote) => vote.status === 'pending');
  const lower = question.toLowerCase();

  if (lower.includes('owe')) {
    const top = balances.people[0];
    if (!top) return `You have no shared balances yet. Your net balance is ${moneyLike(balances.net)}.`;
    return `${top.name} has the largest current imbalance at ${moneyLike(top.net)}. Your overall net balance is ${moneyLike(balances.net)}.`;
  }
  if (lower.includes('grocery')) {
    const groceries = analytics.byCategory.find((item) => item.category.toLowerCase() === 'groceries');
    return `Groceries total ${moneyLike(groceries?.total ?? 0)} this month. The largest category overall is ${analytics.byCategory[0]?.category} at ${moneyLike(analytics.byCategory[0]?.total ?? 0)}.`;
  }
  if (lower.includes('pending vote') || lower.includes('vote')) {
    if (!pendingVotes.length) return "There are no pending votes right now. Everything above each group’s voting threshold has already been resolved.";
    const vote = pendingVotes[0];
    return `The current pending vote is for ${vote.description} at ${moneyLike(vote.amount)} in ${vote.category}. ${vote.decisions.length} decision(s) have been logged so far.`;
  }
  return `You have ${pendingVotes.length} pending vote${pendingVotes.length === 1 ? '' : 's'}, ${analytics.subscriptionAlerts.length} subscription sharing opportunity${analytics.subscriptionAlerts.length === 1 ? '' : 'ies'}, and your current net balance is ${moneyLike(balances.net)}. A quick win: review dining and streaming spend if you want to cut costs this week.`;
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
