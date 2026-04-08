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

export function getCurrentUser() {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE id = ?').get('u1');
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

export function getGroups() {
  const groups = db.prepare('SELECT id, name, type, emoji, threshold, blockchain_enabled as blockchainEnabled, created_at as createdAt FROM groups_table ORDER BY created_at ASC').all();
  return groups.map((group) => ({
    ...group,
    blockchainEnabled: Boolean(group.blockchainEnabled),
    members: getMembersByGroup(group.id)
  }));
}

export function getExpenses() {
  const expenses = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.description, e.amount, e.category, e.paid_by as paidBy,
           e.split_method as splitMethod, e.expense_date as expenseDate, e.blockchain_enabled as blockchainEnabled,
           e.merchant, e.receipt_url as receiptUrl, e.created_at as createdAt,
           u.name as paidByName, u.initials as paidByInitials
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all();

  const splitStmt = db.prepare(`SELECT user_id as userId, amount FROM expense_splits WHERE expense_id = ?`);
  return expenses.map((expense) => ({
    ...expense,
    blockchainEnabled: Boolean(expense.blockchainEnabled),
    splits: splitStmt.all(expense.id)
  }));
}

export function getVotes() {
  const voteStmt = db.prepare(`
    SELECT v.id, v.group_id as groupId, v.requested_by as requestedBy, v.description, v.amount, v.category,
           v.reason, v.status, v.created_at as createdAt, u.name as requestedByName
    FROM votes v
    JOIN users u ON u.id = v.requested_by
    ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, v.created_at DESC
  `);
  const decisionStmt = db.prepare(`
    SELECT d.user_id as userId, d.decision, d.decided_at as decidedAt, u.name
    FROM vote_decisions d
    JOIN users u ON u.id = d.user_id
    WHERE d.vote_id = ?
    ORDER BY d.decided_at ASC
  `);
  return voteStmt.all().map((vote) => ({
    ...vote,
    decisions: decisionStmt.all(vote.id)
  }));
}

export function calculateBalances() {
  const users = db.prepare('SELECT id, name, initials, avatar_color as avatarColor FROM users').all();
  const expenses = getExpenses();
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

  const currentUser = summary.u1;
  const people = Object.values(summary)
    .filter((user) => user.id !== 'u1')
    .map((user) => ({
      ...user,
      direction: user.net >= 0 ? 'owed' : 'owes'
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const totalOwed = Number(Object.values(summary).filter((user) => user.net > 0).reduce((sum, user) => sum + user.net, 0).toFixed(2));
  const totalOwe = Number(Math.abs(Object.values(summary).filter((user) => user.net < 0).reduce((sum, user) => sum + user.net, 0)).toFixed(2));

  return {
    byMember: summary,
    currentUser,
    net: Number((currentUser.paid - currentUser.owed).toFixed(2)),
    totalOwed,
    totalOwe,
    settleCount: people.filter((person) => person.net !== 0).length,
    people
  };
}

export function getAnalytics() {
  const expenses = getExpenses();
  const monthTotal = Number(expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const byCategory = Object.values(expenses.reduce((acc, expense) => {
    acc[expense.category] ??= { category: expense.category, total: 0 };
    acc[expense.category].total += expense.amount;
    return acc;
  }, {})).map((item) => ({ ...item, total: Number(item.total.toFixed(2)) })).sort((a, b) => b.total - a.total);

  const byGroup = getGroups().map((group) => ({
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

export function getSettings() {
  return db.prepare('SELECT user_id as userId, email_votes as emailVotes, email_balance as emailBalance, push_settlements as pushSettlements, ai_proactive as aiProactive FROM user_settings WHERE user_id = ?').get('u1');
}

export function upsertSettings(nextSettings) {
  db.prepare(`
    INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive)
    VALUES (@userId, @emailVotes, @emailBalance, @pushSettlements, @aiProactive)
    ON CONFLICT(user_id) DO UPDATE SET
      email_votes = excluded.emailVotes,
      email_balance = excluded.emailBalance,
      push_settlements = excluded.pushSettlements,
      ai_proactive = excluded.aiProactive
  `).run(nextSettings);
  return getSettings();
}

export function createGroup(payload) {
  const id = `g${Date.now()}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  db.prepare(`INSERT INTO groups_table (id, name, type, emoji, threshold, blockchain_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`) 
    .run(id, payload.name, payload.type ?? 'custom', payload.emoji ?? '👥', Number(payload.threshold ?? 0), 0, createdAt);

  const memberNames = normalizeMemberNames(payload.memberNames);
  replaceGroupMembers(id, memberNames.length ? memberNames : ['Jordan Lee']);

  return getGroups().find((group) => group.id === id);
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

  if (payload.memberNames) {
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    replaceGroupMembers(groupId, payload.memberNames);
  }

  return getGroups().find((group) => group.id === groupId);
}

export function createExpense(payload) {
  const id = `e${Date.now()}`;
  const createdAt = new Date().toISOString();
  const expenseDate = payload.expenseDate ?? createdAt.slice(0, 10);
  const groupMembers = getMembersByGroup(payload.groupId);
  const memberIds = groupMembers.map((member) => member.id);
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, blockchain_enabled, merchant, receipt_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  const group = db.prepare('SELECT threshold FROM groups_table WHERE id = ?').get(payload.groupId);
  let triggeredVote = null;
  if (group && payload.amount > group.threshold) {
    const voteId = `v${Date.now()}`;
    db.prepare(`
      INSERT INTO votes (id, group_id, requested_by, description, amount, category, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voteId, payload.groupId, payload.paidBy ?? 'u1', payload.description, payload.amount, payload.category, payload.reason ?? 'Auto-created from expense above threshold.', 'pending', createdAt);
    db.prepare(`INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at) VALUES (?, ?, ?, ?)`) 
      .run(voteId, payload.paidBy ?? 'u1', 'yes', createdAt);
    triggeredVote = voteId;
  }

  return { expense: getExpenses().find((expense) => expense.id === id), triggeredVote };
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
  if (yes >= Math.ceil(groupSize / 2)) status = 'approved';
  if (no >= Math.ceil(groupSize / 2)) status = 'declined';

  db.prepare('UPDATE votes SET status = ? WHERE id = ?').run(status, voteId);
  return getVotes().find((vote) => vote.id === voteId);
}

export function generateAiReply(question) {
  const balances = calculateBalances();
  const analytics = getAnalytics();
  const pendingVotes = getVotes().filter((vote) => vote.status === 'pending');
  const lower = question.toLowerCase();

  if (lower.includes('owe')) {
    const top = balances.people[0];
    return `${top.name} has the largest current imbalance at ${moneyLike(top.net)}. Your overall net balance is ${moneyLike(balances.net)}.`;
  }
  if (lower.includes('grocery')) {
    const groceries = analytics.byCategory.find((item) => item.category.toLowerCase() === 'groceries');
    return `Groceries total ${moneyLike(groceries?.total ?? 0)} this month. The largest category overall is ${analytics.byCategory[0]?.category} at ${moneyLike(analytics.byCategory[0]?.total ?? 0)}.`;
  }
  if (lower.includes('pending vote') || lower.includes('vote')) {
    if (!pendingVotes.length) return 'There are no pending votes right now. Everything above each group’s voting threshold has already been resolved.';
    const vote = pendingVotes[0];
    return `The current pending vote is for ${vote.description} at ${moneyLike(vote.amount)} in ${vote.category}. ${vote.decisions.length} decision(s) have been logged so far.`;
  }
  return `You have ${pendingVotes.length} pending vote${pendingVotes.length === 1 ? '' : 's'}, ${analytics.subscriptionAlerts.length} subscription sharing opportunity${analytics.subscriptionAlerts.length === 1 ? '' : 'ies'}, and your current net balance is ${moneyLike(balances.net)}. A quick win: review dining and streaming spend if you want to cut costs this week.`;
}

function moneyLike(value) {
  return `$${Math.abs(Number(value || 0)).toFixed(2)}`;
}
