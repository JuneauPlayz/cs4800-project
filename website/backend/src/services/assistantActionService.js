import { randomUUID } from 'crypto';
import db from '../db.js';
import { getAnalytics } from './analyticsService.js';
import { contributeToChallenge, createChallenge, getChallenges } from './challengeService.js';
import { createExpense, createSettlement, getExpenses } from './expenseService.js';
import { getGroups, moneyLike, requireMembership } from './sharedService.js';
import { getVotes, respondToVote } from './voteService.js';

const CATEGORY_OPTIONS = ['Groceries', 'Dining', 'Utilities', 'Rent', 'Travel', 'Furniture', 'Streaming', 'Electronics', 'Household', 'Other'];

function toMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseAmount(text) {
  const moneyMatch = String(text).match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
  if (moneyMatch) return toMoney(moneyMatch[1].replaceAll(',', ''));

  const amountMatch = String(text).match(/\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:dollars|bucks|usd)\b/i);
  if (amountMatch) return toMoney(amountMatch[1].replaceAll(',', ''));

  const plainAmountMatch = String(text).match(/\b(?:of|to|for|spent|log|add|record)\s+([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i);
  if (plainAmountMatch) return toMoney(plainAmountMatch[1].replaceAll(',', ''));

  return 0;
}

function findCategory(text) {
  const normalized = normalizeText(text);
  return CATEGORY_OPTIONS.find((category) => {
    const categoryText = normalizeText(category);
    if (normalized.includes(categoryText)) return true;
    if (category === 'Dining' && /\b(food|restaurant|restaurants|burger|burgers|lunch|dinner|coffee|meal|meals)\b/.test(normalized)) return true;
    if (category === 'Groceries' && /\b(grocery|groceries|whole foods|trader joes|costco)\b/.test(normalized)) return true;
    if (category === 'Utilities' && /\b(electric|electricity|water|gas|internet|utility|utilities)\b/.test(normalized)) return true;
    return false;
  }) || 'Other';
}

function findCategoryAmountInText(text, category) {
  if (!text || !category || category === 'Other') return 0;
  const escapedCategory = escapeRegExp(category);
  const amountPattern = String.raw`\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)`;
  const patterns = [
    new RegExp(String.raw`\b${escapedCategory}\b\s*\(\s*${amountPattern}\s*\)`, 'i'),
    new RegExp(String.raw`\b${escapedCategory}\b[^.$?]{0,50}?\b(?:at|of|to|for|around|about)\s+${amountPattern}`, 'i'),
    new RegExp(String.raw`\b${escapedCategory}\b\s+${amountPattern}`, 'i'),
    new RegExp(String.raw`${amountPattern}[^.$?]{0,50}?\b${escapedCategory}\b`, 'i')
  ];
  const match = patterns.map((pattern) => String(text).match(pattern)).find(Boolean);
  return match ? toMoney(match[1].replaceAll(',', '')) : 0;
}

function isCategoryBudgetMessage(text, category = findCategory(text)) {
  if (!text || category === 'Other') return false;
  const escapedCategory = escapeRegExp(category);
  return new RegExp(String.raw`\b${escapedCategory}\b[^.?!]{0,60}\bbudget\b`, 'i').test(text)
    || new RegExp(String.raw`\bbudget\b[^.?!]{0,60}\b${escapedCategory}\b`, 'i').test(text)
    || findCategoryAmountInText(text, category) > 0;
}

function findGroup(text, userId) {
  const normalized = normalizeText(text);
  return getGroups(userId)
    .map((group) => ({ group, normalized: normalizeText(group.name) }))
    .filter(({ normalized: groupName }) => groupName && normalized.includes(groupName))
    .sort((first, second) => second.normalized.length - first.normalized.length)[0]?.group || null;
}

function findNamedItem(text, items, getName) {
  const normalized = normalizeText(text);
  return items
    .map((item) => ({ item, normalized: normalizeText(getName(item)) }))
    .filter(({ normalized: itemName }) => itemName && normalized.includes(itemName))
    .sort((first, second) => second.normalized.length - first.normalized.length)[0]?.item || null;
}

function cleanDescription(rawDescription, category) {
  const value = String(rawDescription || '')
    .replace(/\$\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?/g, '')
    .replace(/\b[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*(?:dollars|bucks|usd)\b/gi, '')
    .replace(/\b(?:for|on|at|in|to|as|a|an|the|expense|purchase|cost|paid|spent|log|add|record|please|my|our)\b/gi, ' ')
    .replace(new RegExp(`\\b${category}\\b`, 'i'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value ? value.slice(0, 80) : category;
}

function parseExpenseDescription(text, category, group) {
  const afterFor = String(text).match(/\b(?:for|on)\s+(.+?)(?:\s+\b(?:in|at|to|for)\b|$)/i)?.[1];
  const afterAmount = String(text).match(/\$\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?\s+(.+?)(?:\s+\b(?:in|at|to|for)\b|$)/i)?.[1];
  const candidate = afterFor || afterAmount || category;
  return cleanDescription(group ? candidate.replace(new RegExp(group.name, 'i'), '') : candidate, category);
}

function isBudgetRequest(text) {
  return /\b(set|create|make|add|update|start)\b.*\bbudget\b/i.test(text)
    || /\bbudget\b.*\b(of|to|for)\b/i.test(text)
    || isCategoryBudgetMessage(text);
}

function isExpenseRequest(text) {
  return /\b(log|add|record|create)\b.*\b(expense|purchase|spend|spent|cost|charge)\b/i.test(text)
    || /\b(log|add|record)\b.*\$\s*[0-9]/i.test(text)
    || /\bspent\s+\$\s*[0-9]/i.test(text)
    || /\$\s*[0-9].*\b(expense|purchase|groceries|grocery|dining|burger|burgers|utilities|rent|travel)\b/i.test(text);
}

function isChallengeCreateRequest(text) {
  return /\b(create|start|set up|make|add)\b.*\b(challenge|goal)\b/i.test(text)
    || /\b(challenge|goal)\b.*\b(for|of|to)\b.*\$\s*[0-9]/i.test(text);
}

function isChallengeContributionRequest(text) {
  return /\b(add|contribute|put|save)\b.*\$\s*[0-9].*\b(to|toward|towards|for)\b.*\b(challenge|goal)\b/i.test(text);
}

function isSettlementRequest(text) {
  return /\b(pay|settle|mark|record)\b.*\b(paid|payment|settlement|settle|owed|owe)\b/i.test(text)
    || /\b(pay|settle)\b.*\$\s*[0-9]/i.test(text);
}

function isVoteResponseRequest(text) {
  return /\b(approve|approved|yes|accept|decline|declined|reject|rejected|no)\b.*\b(vote|request|expense)\b/i.test(text)
    || /\b(vote|request)\b.*\b(yes|no|approve|decline|accept|reject)\b/i.test(text);
}

function isAffirmativeReply(text) {
  return /^(yes|yep|yeah|sure|please|ok|okay|do it|confirm)\b/i.test(String(text).trim());
}

function isBudgetCategorySelection(text) {
  const category = findCategory(text);
  return category !== 'Other' && (
    /\b(focus|category|categories|budget|set|setting|breakdown|broken down)\b/i.test(text)
    || findCategoryAmountInText(text, category) > 0
  );
}

function getLastAssistantText(history = []) {
  if (!Array.isArray(history)) return '';
  const lastAssistant = [...history].reverse().find((message) => {
    const role = String(message?.role || '').toLowerCase();
    return role === 'ai' || role === 'assistant' || role === 'model';
  });
  return String(lastAssistant?.text || '');
}

function loadBudgetGoal(userId, month = currentMonth()) {
  const row = db.prepare('SELECT * FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  if (!row) return { month, total: 0, breakdown: {} };

  let breakdown = {};
  try {
    breakdown = JSON.parse(row.breakdown || '{}');
  } catch {
    breakdown = {};
  }
  return { ...row, breakdown };
}

function parsePaymentMethod(text) {
  const normalized = normalizeText(text);
  if (/\bvenmo\b/.test(normalized)) return 'Venmo';
  if (/\bzelle\b/.test(normalized)) return 'Zelle';
  if (/\bcash\s*app\b/.test(normalized)) return 'Cash App';
  if (/\bpaypal\b/.test(normalized)) return 'PayPal';
  if (/\bcash\b/.test(normalized)) return 'Cash';
  if (/\bcard|credit|debit\b/.test(normalized)) return 'Card';
  if (/\bbank|ach|transfer\b/.test(normalized)) return 'Bank transfer';
  return 'Other';
}

function parseEndDate(text) {
  const isoMatch = String(text).match(/\b(20[0-9]{2}-[01][0-9]-[0-3][0-9])\b/);
  if (isoMatch) return isoMatch[1];

  const daysMatch = String(text).match(/\b(?:in|within)\s+([0-9]{1,3})\s+days?\b/i);
  if (daysMatch) {
    const date = new Date();
    date.setDate(date.getDate() + Number(daysMatch[1]));
    return date.toISOString().slice(0, 10);
  }

  const monthMatch = String(text).match(/\bby\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+([0-9]{1,2})(?:,\s*(20[0-9]{2}))?\b/i);
  if (!monthMatch) return null;
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = monthNames.findIndex((name) => monthMatch[1].toLowerCase().startsWith(name));
  const year = Number(monthMatch[3] || new Date().getFullYear());
  const date = new Date(year, month, Number(monthMatch[2]));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseChallengeName(text) {
  const quoted = String(text).match(/["']([^"']{2,60})["']/)?.[1];
  if (quoted) return quoted.trim();

  const named = String(text).match(/\b(?:called|named)\s+(.+?)(?:\s+(?:for|with|in|by|that|to)\b|$)/i)?.[1];
  if (named) return named.trim().slice(0, 60);

  const beforeChallenge = String(text).match(/\b(?:create|start|set up|make|add)\s+(?:a\s+)?(.+?)\s+(?:challenge|goal)\b/i)?.[1];
  if (beforeChallenge && !/\$\s*[0-9]/.test(beforeChallenge)) return beforeChallenge.trim().slice(0, 60);

  return 'Savings challenge';
}

function isCategoryBreakdownRequest(text) {
  return /\bbudget\b/i.test(text) && /\b(categories|category|breakdown|category by category|category-by-category|spending plan)\b/i.test(text);
}

function buildCategoryBreakdown(total, categoryTotals) {
  const cleanTotal = toMoney(total);
  const trackedCategories = categoryTotals
    .filter((item) => CATEGORY_OPTIONS.includes(item.category) && toMoney(item.total) > 0)
    .sort((first, second) => toMoney(second.total) - toMoney(first.total));
  const trackedTotal = trackedCategories.reduce((sum, item) => sum + toMoney(item.total), 0);
  if (cleanTotal <= 0 || trackedTotal <= 0) return {};

  let runningTotal = 0;
  const breakdown = {};
  trackedCategories.forEach((item, index) => {
    const isLast = index === trackedCategories.length - 1;
    const amount = isLast
      ? toMoney(cleanTotal - runningTotal)
      : toMoney((toMoney(item.total) / trackedTotal) * cleanTotal);
    if (amount > 0) {
      breakdown[item.category] = amount;
      runningTotal = toMoney(runningTotal + amount);
    }
  });
  return breakdown;
}

function formatBreakdownSummary(breakdown) {
  return Object.entries(breakdown)
    .map(([category, amount]) => `${category} ${moneyLike(amount)}`)
    .join(', ');
}

function formatDetails(details) {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

function buildBudgetBreakdownProposal(userId, message) {
  const month = currentMonth();
  const existing = loadBudgetGoal(userId, month);
  const requestedAmount = parseAmount(message);
  const amount = requestedAmount > 0 ? requestedAmount : toMoney(existing.total);
  if (amount <= 0) return null;

  const analytics = getAnalytics(userId);
  const currentMonthCategories = Object.entries(analytics.currentMonthByCategory || {})
    .map(([category, total]) => ({ category, total: toMoney(total) }))
    .filter((item) => item.total > 0);
  const sourceCategories = currentMonthCategories.length ? currentMonthCategories : analytics.byCategory;
  const breakdown = buildCategoryBreakdown(amount, sourceCategories);
  if (!Object.keys(breakdown).length) return null;

  return {
    type: 'set_budget',
    title: 'Set category budgets',
    summary: `Set up category budgets within your ${moneyLike(amount)} monthly budget for ${month}.`,
    details: formatDetails({
      Month: month,
      Budget: 'Category breakdown',
      Total: moneyLike(amount),
      Categories: formatBreakdownSummary(breakdown),
      Basis: currentMonthCategories.length ? 'Current-month tracked spending' : 'All tracked spending'
    }),
    payload: {
      month,
      amount,
      category: null,
      breakdown
    }
  };
}

function buildBudgetProposal(userId, message, contextText = '') {
  if (isCategoryBreakdownRequest(message)) {
    const breakdownProposal = buildBudgetBreakdownProposal(userId, message);
    if (breakdownProposal) return breakdownProposal;
  }

  const category = findCategory(message);
  const inferredCategoryAmount = category !== 'Other'
    ? findCategoryAmountInText(message, category) || findCategoryAmountInText(contextText, category)
    : 0;
  const amount = inferredCategoryAmount || parseAmount(message);
  if (amount <= 0) return null;

  const isCategoryBudget = isCategoryBudgetMessage(message, category) || (category !== 'Other' && findCategoryAmountInText(contextText, category) > 0);
  const month = currentMonth();
  const title = isCategoryBudget ? `Set ${category} budget` : 'Set monthly budget';
  const summary = isCategoryBudget
    ? `Set a ${moneyLike(amount)} ${category} budget for ${month}.`
    : `Set your total monthly budget to ${moneyLike(amount)} for ${month}.`;

  return {
    type: 'set_budget',
    title,
    summary,
    details: formatDetails({
      Month: month,
      Budget: isCategoryBudget ? `${category} category` : 'Total monthly budget',
      Amount: moneyLike(amount),
      Scope: 'Account budget goal'
    }),
    payload: {
      month,
      amount,
      category: isCategoryBudget ? category : null
    }
  };
}

function buildExpenseProposal(userId, message) {
  const amount = parseAmount(message);
  if (amount <= 0) return null;

  const category = findCategory(message);
  const group = findGroup(message, userId);
  const description = parseExpenseDescription(message, category, group);
  const groupId = group?.id || 'self';
  const groupName = group?.name || 'Personal';

  return {
    type: 'log_expense',
    title: 'Log expense',
    summary: `Log ${description} for ${moneyLike(amount)} as ${category}${group ? ` in ${group.name}` : ' as a personal expense'}.`,
    details: formatDetails({
      Description: description,
      Amount: moneyLike(amount),
      Category: category,
      Group: groupName,
      Split: group ? 'Equal split with group members' : 'Personal'
    }),
    payload: {
      description,
      amount,
      category,
      groupId,
      splitMethod: group ? 'equal' : 'self'
    }
  };
}

function buildChallengeProposal(userId, message) {
  const amount = parseAmount(message);
  if (amount <= 0) return null;

  const groups = getGroups(userId);
  const group = findGroup(message, userId) || (groups.length === 1 ? groups[0] : null);
  if (!group) return null;

  const name = parseChallengeName(message);
  const description = `Track progress toward ${name}.`;
  const endDate = parseEndDate(message);

  return {
    type: 'create_challenge',
    title: 'Create challenge',
    summary: `Create "${name}" in ${group.name} with a ${moneyLike(amount)} goal.`,
    details: formatDetails({
      Name: name,
      Group: group.name,
      Goal: moneyLike(amount),
      End: endDate || 'No end date'
    }),
    payload: {
      groupId: group.id,
      name,
      description,
      goal: amount,
      endDate
    }
  };
}

function buildChallengeContributionProposal(userId, message) {
  const amount = parseAmount(message);
  if (amount <= 0) return null;

  const challenges = getChallenges(userId).challenges.filter((challenge) => Number(challenge.current || 0) < Number(challenge.goal || 0));
  const challenge = findNamedItem(message, challenges, (item) => item.name) || (challenges.length === 1 ? challenges[0] : null);
  if (!challenge) return null;

  return {
    type: 'contribute_challenge',
    title: 'Add challenge progress',
    summary: `Add ${moneyLike(amount)} to ${challenge.name}.`,
    details: formatDetails({
      Challenge: challenge.name,
      Group: challenge.groupName,
      Amount: moneyLike(amount),
      Progress: `${moneyLike(challenge.current)} / ${moneyLike(challenge.goal)}`
    }),
    payload: {
      challengeId: challenge.id,
      amount
    }
  };
}

function findSettlementExpense(userId, message) {
  const openExpenses = getExpenses(userId)
    .filter((expense) => expense.userPaymentStatus === 'open')
    .map((expense) => ({
      ...expense,
      remaining: toMoney(Number(expense.userOwes || 0) - Number(expense.userPaid || 0))
    }))
    .filter((expense) => expense.remaining > 0)
    .sort((first, second) => second.remaining - first.remaining);
  if (!openExpenses.length) return null;

  const byDescription = findNamedItem(message, openExpenses, (expense) => expense.description);
  if (byDescription) return byDescription;

  const byGroup = findNamedItem(message, openExpenses, (expense) => expense.groupName);
  if (byGroup) return byGroup;

  const amount = parseAmount(message);
  if (amount > 0) {
    const byAmount = openExpenses.find((expense) => Math.abs(expense.remaining - amount) < 0.01);
    if (byAmount) return byAmount;
  }

  return openExpenses.length === 1 ? openExpenses[0] : null;
}

function buildSettlementProposal(userId, message) {
  const expense = findSettlementExpense(userId, message);
  if (!expense) return null;

  const requestedAmount = parseAmount(message);
  const amount = requestedAmount > 0 ? Math.min(requestedAmount, expense.remaining) : expense.remaining;
  const method = parsePaymentMethod(message);

  return {
    type: 'settle_expense',
    title: 'Mark expense paid',
    summary: `Mark ${moneyLike(amount)} paid for ${expense.description}.`,
    details: formatDetails({
      Expense: expense.description,
      Group: expense.groupName,
      PaidTo: expense.paidByName,
      Amount: moneyLike(amount),
      Method: method
    }),
    payload: {
      expenseId: expense.id,
      amount,
      method
    }
  };
}

function parseVoteDecision(text) {
  const normalized = normalizeText(text);
  if (/\b(approve|approved|accept|yes|yep|yeah)\b/.test(normalized)) return 'yes';
  if (/\b(decline|declined|reject|rejected|no)\b/.test(normalized)) return 'no';
  return null;
}

function buildVoteResponseProposal(userId, message) {
  const decision = parseVoteDecision(message);
  if (!decision) return null;

  const pendingVotes = getVotes(userId).filter((vote) => vote.status === 'pending');
  const vote = findNamedItem(message, pendingVotes, (item) => item.description) || (pendingVotes.length === 1 ? pendingVotes[0] : null);
  if (!vote) return null;

  return {
    type: 'respond_vote',
    title: decision === 'yes' ? 'Approve vote' : 'Decline vote',
    summary: `${decision === 'yes' ? 'Approve' : 'Decline'} ${vote.description} for ${moneyLike(vote.amount)} in ${vote.groupName}.`,
    details: formatDetails({
      Expense: vote.description,
      Group: vote.groupName,
      Amount: moneyLike(vote.amount),
      Decision: decision === 'yes' ? 'Approve' : 'Decline'
    }),
    payload: {
      voteId: vote.id,
      decision
    }
  };
}

export function buildAssistantActionProposal(userId, message, history = []) {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) return null;
  const previousAssistantText = getLastAssistantText(history);

  if (isChallengeContributionRequest(cleanMessage)) return buildChallengeContributionProposal(userId, cleanMessage);
  if (isChallengeCreateRequest(cleanMessage)) return buildChallengeProposal(userId, cleanMessage);
  if (isSettlementRequest(cleanMessage)) return buildSettlementProposal(userId, cleanMessage);
  if (isVoteResponseRequest(cleanMessage)) return buildVoteResponseProposal(userId, cleanMessage);
  if (isBudgetRequest(cleanMessage)) return buildBudgetProposal(userId, cleanMessage, previousAssistantText);
  if (isBudgetRequest(previousAssistantText) && isBudgetCategorySelection(cleanMessage)) {
    return buildBudgetProposal(userId, cleanMessage, previousAssistantText);
  }
  if (isExpenseRequest(cleanMessage)) return buildExpenseProposal(userId, cleanMessage);

  if (isAffirmativeReply(cleanMessage)) {
    if (isChallengeContributionRequest(previousAssistantText)) return buildChallengeContributionProposal(userId, previousAssistantText);
    if (isChallengeCreateRequest(previousAssistantText)) return buildChallengeProposal(userId, previousAssistantText);
    if (isSettlementRequest(previousAssistantText)) return buildSettlementProposal(userId, previousAssistantText);
    if (isVoteResponseRequest(previousAssistantText)) return buildVoteResponseProposal(userId, previousAssistantText);
    if (isBudgetRequest(previousAssistantText)) return buildBudgetProposal(userId, previousAssistantText);
    if (isExpenseRequest(previousAssistantText)) return buildExpenseProposal(userId, previousAssistantText);
  }

  return null;
}

function assertAllowedCategory(category) {
  if (!CATEGORY_OPTIONS.includes(category)) {
    throw new Error('Choose a valid expense category before confirming this AI action.');
  }
}

function saveBudgetAction(userId, payload = {}) {
  const month = String(payload.month || currentMonth()).slice(0, 7);
  const amount = toMoney(payload.amount);
  const category = payload.category ? String(payload.category) : null;
  const breakdown = payload.breakdown && typeof payload.breakdown === 'object' ? payload.breakdown : null;
  if (amount <= 0) throw new Error('Budget amount must be greater than zero.');
  if (category) assertAllowedCategory(category);

  const existing = loadBudgetGoal(userId, month);
  const nextBreakdown = { ...(existing.breakdown || {}) };
  let nextTotal = toMoney(existing.total);

  if (breakdown) {
    Object.entries(breakdown).forEach(([nextCategory, value]) => {
      assertAllowedCategory(nextCategory);
      const nextAmount = toMoney(value);
      if (nextAmount > 0) nextBreakdown[nextCategory] = nextAmount;
    });
    nextTotal = amount;
  } else if (category) {
    nextBreakdown[category] = amount;
    const categoryTotal = Object.values(nextBreakdown).reduce((sum, value) => sum + toMoney(value), 0);
    nextTotal = Math.max(nextTotal, toMoney(categoryTotal));
  } else {
    nextTotal = amount;
  }

  const now = new Date().toISOString();
  const breakdownJson = JSON.stringify(nextBreakdown);
  const current = db.prepare('SELECT id FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  if (current) {
    db.prepare('UPDATE budget_goals SET total = ?, breakdown = ?, updated_at = ? WHERE id = ?')
      .run(nextTotal, breakdownJson, now, current.id);
  } else {
    db.prepare('INSERT INTO budget_goals (id, user_id, month, total, breakdown, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), userId, month, nextTotal, breakdownJson, now, now);
  }

  return {
    message: breakdown
      ? `Saved category budgets for ${month}: ${formatBreakdownSummary(nextBreakdown)}. Total monthly budget is ${moneyLike(nextTotal)}.`
      : category
        ? `Saved a ${moneyLike(amount)} ${category} budget for ${month}.`
        : `Saved a ${moneyLike(nextTotal)} total monthly budget for ${month}.`,
    goal: loadBudgetGoal(userId, month)
  };
}

function logExpenseAction(userId, payload = {}) {
  const description = String(payload.description || '').trim();
  const amount = toMoney(payload.amount);
  const category = String(payload.category || '').trim();
  const groupId = String(payload.groupId || 'self');
  if (!description) throw new Error('Expense description is required.');
  if (amount <= 0) throw new Error('Expense amount must be greater than zero.');
  assertAllowedCategory(category);
  if (groupId !== 'self' && !requireMembership(groupId, userId)) {
    throw new Error('You can only log expenses for groups you belong to.');
  }

  const result = createExpense({
    groupId,
    description,
    amount,
    category,
    paidBy: userId,
    splitMethod: groupId === 'self' ? 'self' : 'equal'
  });

  const groupName = groupId === 'self' ? 'Personal' : getGroups(userId).find((group) => group.id === groupId)?.name;
  return {
    message: result.triggeredVote
      ? `Logged ${description} for ${moneyLike(amount)} in ${groupName}; it needs group approval before it appears in balances.`
      : `Logged ${description} for ${moneyLike(amount)} in ${groupName}.`,
    expense: result.expense,
    triggeredVote: result.triggeredVote
  };
}

function createChallengeAction(userId, payload = {}) {
  const groupId = String(payload.groupId || '');
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();
  const goal = toMoney(payload.goal);
  const endDate = payload.endDate ? String(payload.endDate).slice(0, 10) : null;
  if (!groupId) throw new Error('Challenge group is required.');
  if (!name) throw new Error('Challenge name is required.');
  if (!description) throw new Error('Challenge description is required.');
  if (goal <= 0) throw new Error('Challenge goal must be greater than zero.');

  const challenge = createChallenge({ userId, groupId, name, description, goal, endDate });
  if (!challenge) throw new Error('You can only create challenges for groups you belong to.');
  return {
    message: `Created ${challenge.name} in ${challenge.groupName} with a ${moneyLike(challenge.goal)} goal.`,
    challenge
  };
}

function contributeChallengeAction(userId, payload = {}) {
  const challengeId = String(payload.challengeId || '');
  const amount = toMoney(payload.amount);
  if (!challengeId) throw new Error('Challenge is required.');
  if (amount <= 0) throw new Error('Contribution amount must be greater than zero.');

  const challenge = contributeToChallenge({ userId, challengeId, amount });
  if (!challenge) throw new Error('Challenge not found.');
  return {
    message: `Added ${moneyLike(amount)} to ${challenge.name}. It is now at ${moneyLike(challenge.current)} of ${moneyLike(challenge.goal)}.`,
    challenge
  };
}

function settleExpenseAction(userId, payload = {}) {
  const expenseId = String(payload.expenseId || '');
  const amount = toMoney(payload.amount);
  const method = String(payload.method || 'Other').trim() || 'Other';
  if (!expenseId) throw new Error('Expense is required.');
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const result = createSettlement({ userId, expenseId, amount, method });
  if (!result.ok) throw new Error(result.message || 'Unable to mark that expense paid.');
  return {
    message: `Marked ${moneyLike(result.settlement.amount)} paid via ${result.settlement.method}.`,
    settlement: result.settlement
  };
}

function respondVoteAction(userId, payload = {}) {
  const voteId = String(payload.voteId || '');
  const decision = String(payload.decision || '');
  if (!voteId) throw new Error('Vote is required.');
  if (!['yes', 'no'].includes(decision)) throw new Error('Vote decision must be yes or no.');

  const vote = respondToVote(voteId, decision, userId);
  if (!vote) throw new Error('Vote not found.');
  return {
    message: `${decision === 'yes' ? 'Approved' : 'Declined'} ${vote.description}. Vote status is ${vote.status}.`,
    vote
  };
}

export function executeAssistantAction(userId, action = {}) {
  if (!action || typeof action !== 'object') throw new Error('Assistant action is required.');
  if (action.type === 'set_budget') return { ok: true, type: action.type, ...saveBudgetAction(userId, action.payload) };
  if (action.type === 'log_expense') return { ok: true, type: action.type, ...logExpenseAction(userId, action.payload) };
  if (action.type === 'create_challenge') return { ok: true, type: action.type, ...createChallengeAction(userId, action.payload) };
  if (action.type === 'contribute_challenge') return { ok: true, type: action.type, ...contributeChallengeAction(userId, action.payload) };
  if (action.type === 'settle_expense') return { ok: true, type: action.type, ...settleExpenseAction(userId, action.payload) };
  if (action.type === 'respond_vote') return { ok: true, type: action.type, ...respondVoteAction(userId, action.payload) };
  throw new Error('This assistant action is not supported yet.');
}
