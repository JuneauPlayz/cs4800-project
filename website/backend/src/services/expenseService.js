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
  const userSettlementStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM settlements
    WHERE expense_id = ? AND from_user = ? AND status = 'completed'
  `);
  const expenseSettlementStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM settlements
    WHERE expense_id = ? AND status = 'completed'
  `);

  return expenses.map((expense) => {
    const splitsForExpense = splitStmt.all(expense.id);
    const userSplit = splitsForExpense.find((split) => split.userId === userId);
    const userPaid = Number(userSettlementStmt.get(expense.id, userId).total || 0);
    const totalSettled = Number(expenseSettlementStmt.get(expense.id).total || 0);
    const totalDue = splitsForExpense
      .filter((split) => split.userId !== expense.paidBy)
      .reduce((sum, split) => sum + split.amount, 0);
    const userOwes = expense.paidBy !== userId ? Number(userSplit?.amount || 0) : 0;

    return {
      ...expense,
      splits: splitsForExpense,
      userOwes,
      userPaid,
      settlementStatus: totalDue > 0 && totalSettled >= totalDue - 0.01 ? 'paid' : 'open',
      userPaymentStatus: userOwes <= 0 ? 'payer' : userPaid >= userOwes - 0.01 ? 'paid' : 'open'
    };
  });
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
  const settlements = db.prepare(`
    SELECT group_id as groupId, from_user as fromUser, to_user as toUser, amount
    FROM settlements
    WHERE status = 'completed' AND group_id IN (${placeholders})
  `).all(...groupIds);

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

  settlements.forEach((settlement) => {
    if (settlement.toUser === userId && owedToYouMap[settlement.fromUser]) {
      owedToYouMap[settlement.fromUser].amount -= settlement.amount;
    }
    if (settlement.fromUser === userId && youOweMap[settlement.toUser]) {
      youOweMap[settlement.toUser].amount -= settlement.amount;
    }
  });

  const owedToYou = Object.values(owedToYouMap)
    .map((person) => ({ ...person, amount: Number(Math.max(person.amount, 0).toFixed(2)) }))
    .filter((person) => person.amount > 0)
    .sort((first, second) => second.amount - first.amount);
  const youOwe = Object.values(youOweMap)
    .map((person) => ({ ...person, amount: Number(Math.max(person.amount, 0).toFixed(2)) }))
    .filter((person) => person.amount > 0)
    .sort((first, second) => second.amount - first.amount);

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

export function createSettlement({ userId, expenseId, method = 'Other', note = '', amount }) {
  const expense = db.prepare(`
    SELECT e.id, e.group_id as groupId, e.description, e.paid_by as paidBy, gt.name as groupName
    FROM expenses e
    JOIN groups_table gt ON gt.id = e.group_id
    WHERE e.id = ?
  `).get(expenseId);
  if (!expense) return { ok: false, message: 'Expense not found.' };
  if (!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(expense.groupId, userId)) {
    return { ok: false, message: 'You are not a member of this group.' };
  }
  if (expense.paidBy === userId) return { ok: false, message: 'You paid for this expense already.' };

  const split = db.prepare('SELECT amount FROM expense_splits WHERE expense_id = ? AND user_id = ?').get(expenseId, userId);
  if (!split) return { ok: false, message: 'No amount is owed for this expense.' };
  const paid = Number(db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM settlements WHERE expense_id = ? AND from_user = ? AND status = 'completed'").get(expenseId, userId).total || 0);
  const remaining = Number(Math.max(Number(split.amount) - paid, 0).toFixed(2));
  if (remaining <= 0) return { ok: false, message: 'This expense is already marked paid.' };

  const paymentAmount = Number(Math.min(Number(amount || remaining), remaining).toFixed(2));
  if (!paymentAmount || paymentAmount <= 0) return { ok: false, message: 'Payment amount must be greater than zero.' };

  const id = `set-${Date.now()}`;
  const normalizedMethod = String(method || 'Other').trim() || 'Other';
  const createdAt = new Date().toISOString();
  const settlementCols = db.pragma('table_info(settlements)').map((column) => column.name);
  const settlementRow = {
    id,
    group_id: expense.groupId,
    expense_id: expense.id,
    from_user: userId,
    to_user: expense.paidBy,
    payer_id: userId,
    payee_id: expense.paidBy,
    amount: paymentAmount,
    method: normalizedMethod,
    note: String(note || '').trim() || null,
    status: 'completed',
    created_at: createdAt,
    completed_by: userId,
    completed_at: createdAt
  };
  const insertCols = [
    'id',
    'group_id',
    'expense_id',
    'from_user',
    'to_user',
    'payer_id',
    'payee_id',
    'amount',
    'method',
    'note',
    'status',
    'created_at',
    'completed_by',
    'completed_at'
  ].filter((column) => settlementCols.includes(column));

  db.prepare(`
    INSERT INTO settlements (${insertCols.join(', ')})
    VALUES (${insertCols.map(() => '?').join(', ')})
  `).run(...insertCols.map((column) => settlementRow[column]));

  const fromUser = getUserById(userId);
  createNotification(userId, 'settlement', 'Payment recorded', `${moneyLike(paymentAmount)} marked paid for ${expense.description} via ${normalizedMethod}.`);
  createNotification(expense.paidBy, 'settlement', 'Payment received', `${fromUser?.name || 'A group member'} marked ${moneyLike(paymentAmount)} paid for ${expense.description} via ${normalizedMethod}.`);
  return { ok: true, settlement: { id, expenseId: expense.id, amount: paymentAmount, method: normalizedMethod, status: 'completed', createdAt } };
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
