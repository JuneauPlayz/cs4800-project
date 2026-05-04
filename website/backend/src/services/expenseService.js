import db from '../db.js';
import { createNotification, getGroups, getMembersByGroup, getUserById, moneyLike } from './sharedService.js';

export function getExpenses(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((group) => group.id);

  let whereClause;
  let params;
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => '?').join(',');
    whereClause = `(e.group_id IN (${placeholders}) AND (e.vote_id IS NULL OR v.status = 'approved')) OR (e.group_id = 'self' AND e.paid_by = ?)`;
    params = [...groupIds, userId];
  } else {
    whereClause = `e.group_id = 'self' AND e.paid_by = ?`;
    params = [userId];
  }

  const expenses = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.description, e.amount, e.category, e.paid_by as paidBy,
           e.split_method as splitMethod, e.expense_date as expenseDate, e.merchant, e.receipt_url as receiptUrl, e.created_at as createdAt,
           u.name as paidByName, u.initials as paidByInitials, COALESCE(gt.name, 'Personal') as groupName
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    LEFT JOIN groups_table gt ON gt.id = e.group_id
    LEFT JOIN votes v ON v.id = e.vote_id
    WHERE ${whereClause}
    ORDER BY e.expense_date DESC, e.created_at DESC
  `).all(...params);

  const splitStmt = db.prepare('SELECT user_id as userId, amount FROM expense_splits WHERE expense_id = ?');
  return expenses.map((expense) => ({ ...expense, splits: splitStmt.all(expense.id) }));
}

export function calculateBalances(userId) {
  const groups = getGroups(userId);
  const groupIds = groups.map((group) => group.id);

  if (!groupIds.length) {
    const currentUser = getUserById(userId);
    return {
      byMember: {},
      currentUser: { ...currentUser, paid: 0, owed: 0, net: 0 },
      net: 0,
      totalOwedToYou: 0,
      totalYouOwe: 0,
      owedToYou: [],
      youOwe: [],
      settleCount: 0,
      people: []
    };
  }

  const placeholders = groupIds.map(() => '?').join(',');
  const expenses = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.amount, e.paid_by as paidBy
    FROM expenses e
    LEFT JOIN votes v ON v.id = e.vote_id
    WHERE e.group_id IN (${placeholders})
      AND (e.vote_id IS NULL OR v.status = 'approved')
  `).all(...groupIds);
  const splits = db.prepare(`
    SELECT es.expense_id as expenseId, es.user_id as userId, es.amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    LEFT JOIN votes v ON v.id = e.vote_id
    WHERE e.group_id IN (${placeholders})
      AND (e.vote_id IS NULL OR v.status = 'approved')
  `).all(...groupIds);

  const relatedUserIds = [...new Set(groups.flatMap((group) => group.members.map((member) => member.id)))];
  const userRows = relatedUserIds.length
    ? db.prepare(`SELECT id, name, initials, avatar_color as avatarColor, avatar_emoji as avatarEmoji FROM users WHERE id IN (${relatedUserIds.map(() => '?').join(',')})`).all(...relatedUserIds)
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
  const people = Object.values(summary).filter((user) => user.id !== userId).sort((first, second) => Math.abs(second.net) - Math.abs(first.net));
  const groupNames = Object.fromEntries(groups.map((group) => [group.id, group.name]));
  const owedToYouMap = {};
  const youOweMap = {};

  expenses.forEach((expense) => {
    const expenseSplits = splits.filter((split) => split.expenseId === expense.id);
    expenseSplits.forEach((split) => {
      if (split.userId === expense.paidBy) return;
      if (expense.paidBy === userId && split.userId !== userId && summary[split.userId]) {
        if (!owedToYouMap[split.userId]) owedToYouMap[split.userId] = { ...summary[split.userId], amount: 0, groups: [] };
        owedToYouMap[split.userId].amount += split.amount;
        const groupName = groupNames[expense.groupId];
        if (groupName && !owedToYouMap[split.userId].groups.find((group) => group.id === expense.groupId)) {
          owedToYouMap[split.userId].groups.push({ id: expense.groupId, name: groupName });
        }
      }
      if (split.userId === userId && expense.paidBy !== userId && summary[expense.paidBy]) {
        if (!youOweMap[expense.paidBy]) youOweMap[expense.paidBy] = { ...summary[expense.paidBy], amount: 0, groups: [] };
        youOweMap[expense.paidBy].amount += split.amount;
        const groupName = groupNames[expense.groupId];
        if (groupName && !youOweMap[expense.paidBy].groups.find((group) => group.id === expense.groupId)) {
          youOweMap[expense.paidBy].groups.push({ id: expense.groupId, name: groupName });
        }
      }
    });
  });

  const owedToYou = Object.values(owedToYouMap).map((person) => ({ ...person, amount: Number(person.amount.toFixed(2)) })).sort((first, second) => second.amount - first.amount);
  const youOwe = Object.values(youOweMap).map((person) => ({ ...person, amount: Number(person.amount.toFixed(2)) })).sort((first, second) => second.amount - first.amount);

  return {
    byMember: summary,
    currentUser,
    net: currentUser.net,
    totalOwedToYou: Number(owedToYou.reduce((sum, person) => sum + person.amount, 0).toFixed(2)),
    totalYouOwe: Number(youOwe.reduce((sum, person) => sum + person.amount, 0).toFixed(2)),
    owedToYou,
    youOwe,
    settleCount: people.filter((person) => person.net !== 0).length,
    people
  };
}

export function createExpense(payload) {
  const id = `e-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const expenseDate = payload.expenseDate ?? createdAt.slice(0, 10);

  if (payload.groupId === 'self') {
    db.prepare(`
      INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, merchant, receipt_url, reason, vote_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'self', payload.description, payload.amount, payload.category, payload.paidBy ?? 'u1', 'self', expenseDate, payload.merchant ?? null, payload.receiptUrl ?? null, null, null, createdAt);
    db.prepare('INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)').run(id, payload.paidBy ?? 'u1', payload.amount);
    const savedExpense = getExpenses(payload.paidBy).find((e) => e.id === id);
    return { expense: savedExpense, triggeredVote: null };
  }

  const groupMembers = getMembersByGroup(payload.groupId);
  const memberIds = groupMembers.map((member) => member.id);
  const group = db.prepare('SELECT threshold, name FROM groups_table WHERE id = ?').get(payload.groupId);
  const needsVote = group && group.threshold > 0 && payload.amount > group.threshold;

  let voteId = null;
  if (needsVote) {
    voteId = `v${Date.now()}`;
  }

  db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, merchant, receipt_url, reason, vote_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
      const assignedSoFar = payload.splits
        .slice(0, index)
        .reduce((sum, part) => sum + Number(((payload.amount * Number(part.percent || 0)) / 100).toFixed(2)), 0);
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
    db.prepare('INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at) VALUES (?, ?, ?, ?)')
      .run(voteId, payload.paidBy ?? 'u1', 'yes', createdAt);
    triggeredVote = voteId;
    groupMembers.filter((member) => member.id !== payload.paidBy).forEach((member) => {
      createNotification(member.id, 'vote', 'New vote request', `${payload.description} for ${moneyLike(payload.amount)} in ${group.name} needs a decision.`);
    });
  }

  const savedExpense = needsVote ? null : getExpenses(payload.paidBy).find((expense) => expense.id === id);
  return { expense: savedExpense, triggeredVote };
}
