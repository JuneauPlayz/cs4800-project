import db from './db.js';

export function getCurrentUser() {
  return db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE id = ?').get('u1');
}

export function getMembersByGroup(groupId) {
  return db.prepare(`
    SELECT u.id, u.name, u.initials, u.avatar_color as avatarColor, gm.role
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY u.name ASC
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
    summary[expense.paidBy].paid += expense.amount;
    expense.splits.forEach((split) => {
      summary[split.userId].owed += split.amount;
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
    const most = [...balances.people].sort((a, b) => a.net - b.net)[0];
    return `${most.name} owes the most right now at $${Math.abs(most.net).toFixed(2)}. Jordan is net ${balances.net >= 0 ? 'positive' : 'negative'} at $${Math.abs(balances.net).toFixed(2)}.`;
  }
  if (lower.includes('grocery')) {
    const groceries = analytics.byCategory.find((category) => category.category.toLowerCase().includes('grocer'));
    return `Groceries are at $${(groceries?.total ?? 0).toFixed(2)} this cycle. That is one of your top shared categories so far.`;
  }
  if (lower.includes('save') || lower.includes('tip')) {
    const firstAlert = analytics.subscriptionAlerts[0];
    return firstAlert
      ? `A quick win: ${firstAlert.monthlySavingsText}. You could also keep dining spend below the current challenge target.`
      : 'A quick win would be reducing dining purchases and consolidating duplicate subscriptions.';
  }
  if (lower.includes('vote')) {
    return pendingVotes.length
      ? `You have ${pendingVotes.length} pending vote${pendingVotes.length > 1 ? 's' : ''}. The top one is “${pendingVotes[0].description}” for $${pendingVotes[0].amount.toFixed(2)}.`
      : 'There are no pending votes right now.';
  }

  return `SplitStack tracks balances, votes, expenses, subscriptions, and progress challenges. Right now the group has spent $${analytics.monthTotal.toFixed(2)} and Jordan is ${balances.net >= 0 ? 'owed' : 'owing'} $${Math.abs(balances.net).toFixed(2)}.`;
}
