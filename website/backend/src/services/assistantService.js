import { getAnalytics } from './analyticsService.js';
import { getChallenges } from './challengeService.js';
import db from '../db.js';
import { calculateBalances, getExpenses } from './expenseService.js';
import { getGroups, moneyLike } from './sharedService.js';
import { getVotes } from './voteService.js';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function getUserShare(expense, userId) {
  return expense.splits.find((split) => split.userId === userId)?.amount ?? 0;
}

function getMonth(value) {
  return (value || '').slice(0, 7);
}

function getBudgetGoal(userId, month) {
  const goal = db.prepare('SELECT month, total, breakdown FROM budget_goals WHERE user_id = ? AND month = ?').get(userId, month);
  if (!goal) return null;

  let breakdown = {};
  try {
    breakdown = JSON.parse(goal.breakdown || '{}');
  } catch {
    breakdown = {};
  }

  return { ...goal, breakdown };
}

function sumByCategory(expenses, userId) {
  return Object.values(expenses.reduce((acc, expense) => {
    const share = getUserShare(expense, userId);
    if (share <= 0) return acc;
    acc[expense.category] ??= { category: expense.category, total: 0, count: 0 };
    acc[expense.category].total += share;
    acc[expense.category].count += 1;
    return acc;
  }, {}))
    .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }))
    .sort((first, second) => second.total - first.total);
}

function buildBudgetStatus({ budgetGoal, currentMonthSpend, currentMonthByCategory }) {
  if (!budgetGoal) {
    return {
      hasBudget: false,
      month: null,
      total: 0,
      spent: currentMonthSpend,
      remaining: null,
      percentUsed: null,
      categoryGaps: []
    };
  }

  const total = Number(budgetGoal.total || 0);
  const categoryGaps = Object.entries(budgetGoal.breakdown || {})
    .map(([category, limit]) => {
      const limitValue = Number(limit || 0);
      const spent = Number(currentMonthByCategory[category] || 0);
      return {
        category,
        limit: limitValue,
        spent,
        remaining: Number((limitValue - spent).toFixed(2)),
        percentUsed: limitValue ? Number(((spent / limitValue) * 100).toFixed(1)) : null,
        overBy: Number(Math.max(spent - limitValue, 0).toFixed(2))
      };
    })
    .sort((first, second) => second.overBy - first.overBy || second.spent - first.spent);

  return {
    hasBudget: total > 0 || categoryGaps.length > 0,
    month: budgetGoal.month,
    total,
    spent: currentMonthSpend,
    remaining: total ? Number((total - currentMonthSpend).toFixed(2)) : null,
    percentUsed: total ? Number(((currentMonthSpend / total) * 100).toFixed(1)) : null,
    categoryGaps
  };
}

function makeConcern(type, title, evidence) {
  return { type, title, evidence };
}

function buildDataQuality({ expenses, currentMonthExpenses, budgetStatus, byCategory }) {
  const flags = [];
  if (!expenses.length) flags.push('no spending data');
  if (expenses.length > 0 && expenses.length < 3) flags.push('sparse spending history');
  if (!currentMonthExpenses.length) flags.push('no current-month spending');
  if (!budgetStatus.hasBudget) flags.push('no budget goal');
  if (byCategory.length <= 1 && expenses.length > 0) flags.push('no category variety');

  return {
    level: flags.length ? 'limited' : 'enough',
    flags,
    explanation: flags.length ? flags.join(', ') : 'Enough data for practical coaching.'
  };
}

function buildAdviceContext({ userId, balances, analytics, votes, challenges, groups, expenses }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = [...new Set(expenses.map((expense) => getMonth(expense.expenseDate || expense.createdAt)).filter(Boolean))].sort();
  const latestExpenseMonth = months.at(-1) || currentMonth;
  const currentMonthExpenses = expenses.filter((expense) => getMonth(expense.expenseDate || expense.createdAt) === currentMonth);
  const analysisMonth = currentMonthExpenses.length ? currentMonth : latestExpenseMonth;
  const analysisMonthExpenses = expenses.filter((expense) => getMonth(expense.expenseDate || expense.createdAt) === analysisMonth);
  const currentMonthSpend = Number(currentMonthExpenses.reduce((sum, expense) => sum + getUserShare(expense, userId), 0).toFixed(2));
  const analysisMonthSpend = Number(analysisMonthExpenses.reduce((sum, expense) => sum + getUserShare(expense, userId), 0).toFixed(2));
  const personalSpend = Number(expenses.filter((expense) => expense.groupId === 'self').reduce((sum, expense) => sum + getUserShare(expense, userId), 0).toFixed(2));
  const groupSpend = Number(expenses.filter((expense) => expense.groupId !== 'self').reduce((sum, expense) => sum + getUserShare(expense, userId), 0).toFixed(2));
  const currentMonthByCategory = Object.fromEntries(sumByCategory(currentMonthExpenses, userId).map((item) => [item.category, item.total]));
  const analysisMonthByCategory = sumByCategory(analysisMonthExpenses, userId);
  const budgetGoal = getBudgetGoal(userId, currentMonth);
  const budgetStatus = buildBudgetStatus({ budgetGoal, currentMonthSpend, currentMonthByCategory });
  const topExpense = analytics.topExpenses[0] || null;
  const topCategory = analytics.byCategory[0] || null;
  const overspentCategory = budgetStatus.categoryGaps.find((item) => item.overBy > 0);
  const pendingVotes = votes.filter((vote) => vote.status === 'pending');
  const dataQuality = buildDataQuality({ expenses, currentMonthExpenses, budgetStatus, byCategory: analytics.byCategory });

  let primaryConcern;
  let recommendedAction;
  if (!expenses.length) {
    primaryConcern = makeConcern('no_spending_data', 'No expenses have been logged yet.', 'Advice will improve once a few expenses are added.');
    recommendedAction = 'Log your next few shared or personal expenses, then ask me to spot the biggest pattern.';
  } else if (overspentCategory) {
    primaryConcern = makeConcern('over_category_budget', `${overspentCategory.category} is over budget by ${moneyLike(overspentCategory.overBy)}.`, `${moneyLike(overspentCategory.spent)} spent against a ${moneyLike(overspentCategory.limit)} category limit.`);
    recommendedAction = `Pause or reduce ${overspentCategory.category} spending until next month, or move ${moneyLike(overspentCategory.overBy)} from another category if this was expected.`;
  } else if (budgetStatus.hasBudget && budgetStatus.remaining !== null && budgetStatus.remaining < 0) {
    primaryConcern = makeConcern('over_total_budget', `You are over your ${currentMonth} budget by ${moneyLike(Math.abs(budgetStatus.remaining))}.`, `${moneyLike(currentMonthSpend)} spent against a ${moneyLike(budgetStatus.total)} budget.`);
    recommendedAction = `Choose one flexible category to cut by at least ${moneyLike(Math.abs(budgetStatus.remaining))} before adding more optional spending.`;
  } else if (topExpense && analytics.totalSpend > 0 && topExpense.amount >= analytics.totalSpend * 0.5) {
    primaryConcern = makeConcern('large_one_off_expense', `${topExpense.description} is driving most of your spending.`, `${moneyLike(topExpense.amount)} of ${moneyLike(analytics.totalSpend)} total tracked spend.`);
    recommendedAction = `Decide whether ${topExpense.description} was a one-time purchase; if not, set a budget or challenge around ${topExpense.groupName}.`;
  } else if (topCategory && analytics.totalSpend > 0 && topCategory.total >= analytics.totalSpend * 0.6) {
    primaryConcern = makeConcern('category_concentration', `${topCategory.category} dominates your tracked spending.`, `${moneyLike(topCategory.total)} of ${moneyLike(analytics.totalSpend)} total tracked spend.`);
    recommendedAction = `Set a soft cap for ${topCategory.category} and compare the next expense against that cap before logging it.`;
  } else if (balances.totalYouOwe > 0) {
    primaryConcern = makeConcern('settlement_pressure', `You owe ${moneyLike(balances.totalYouOwe)} across active groups.`, `${balances.youOwe.length} settlement relationship${balances.youOwe.length === 1 ? '' : 's'} need attention.`);
    recommendedAction = `Settle the largest balance first: ${balances.youOwe[0]?.name ?? 'the top person'} for ${moneyLike(balances.youOwe[0]?.amount ?? balances.totalYouOwe)}.`;
  } else if (!budgetStatus.hasBudget) {
    primaryConcern = makeConcern('missing_budget', 'You do not have a current-month budget goal yet.', 'The assistant can compare spending to budgets once a budget is set.');
    recommendedAction = `Start with a simple monthly cap near your average spend of ${moneyLike(analytics.avgPerMonth)} and refine it after a few more expenses.`;
  } else if (dataQuality.flags.includes('sparse spending history')) {
    primaryConcern = makeConcern('sparse_data', 'Your spending history is still sparse.', `${expenses.length} expense${expenses.length === 1 ? '' : 's'} logged so far.`);
    recommendedAction = 'Use this week to log every shared and personal expense so the next analysis can compare categories and patterns.';
  } else {
    primaryConcern = makeConcern('healthy_monitoring', 'No urgent spending issue stands out from the current data.', `${moneyLike(analytics.totalSpend)} total tracked spend across ${analytics.expenseCount} expenses.`);
    recommendedAction = `Keep watching ${topCategory?.category ?? 'your top category'} and settle balances before they become harder to track.`;
  }

  return {
    analysisMonth,
    currentMonth,
    currentMonthSpend,
    analysisMonthSpend,
    personalVsGroupSpend: {
      personal: personalSpend,
      group: groupSpend,
      groupSharePercent: analytics.totalSpend ? Number(((groupSpend / analytics.totalSpend) * 100).toFixed(1)) : 0
    },
    budgetStatus,
    topCategory,
    topExpense,
    analysisMonthByCategory,
    balancePressure: {
      net: balances.net,
      totalYouOwe: balances.totalYouOwe,
      totalOwedToYou: balances.totalOwedToYou,
      largestYouOwe: balances.youOwe[0] ? { name: balances.youOwe[0].name, amount: balances.youOwe[0].amount, groups: balances.youOwe[0].groups.map((group) => group.name) } : null,
      largestOwedToYou: balances.owedToYou[0] ? { name: balances.owedToYou[0].name, amount: balances.owedToYou[0].amount, groups: balances.owedToYou[0].groups.map((group) => group.name) } : null
    },
    pendingVotes: pendingVotes.map((vote) => ({ description: vote.description, groupName: vote.groupName, amount: vote.amount })),
    activeChallenges: challenges.filter((challenge) => Number(challenge.current || 0) < Number(challenge.goal || 0)).map((challenge) => ({ name: challenge.name, groupName: challenge.groupName, current: challenge.current, goal: challenge.goal })),
    groupCostDrivers: groups.map((group) => {
      const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
      const total = Number(groupExpenses.reduce((sum, expense) => sum + getUserShare(expense, userId), 0).toFixed(2));
      const top = groupExpenses
        .map((expense) => ({ description: expense.description, category: expense.category, amount: getUserShare(expense, userId) }))
        .filter((expense) => expense.amount > 0)
        .sort((first, second) => second.amount - first.amount)[0] || null;
      return { name: group.name, total, topExpense: top };
    }).filter((group) => group.total > 0).sort((first, second) => second.total - first.total),
    dataQuality,
    primaryConcern,
    recommendedAction,
    followUpOptions: [
      'Do you want a category-by-category spending plan?',
      'Should I focus on personal spending or group spending next?',
      'Do you want help setting a realistic monthly budget?'
    ]
  };
}

function generateLocalReply(userId, question) {
  const balances = calculateBalances(userId);
  const analytics = getAnalytics(userId);
  const pendingVotes = getVotes(userId).filter((vote) => vote.status === 'pending');
  const lower = question.toLowerCase();
  const adviceContext = buildAdviceContext({
    userId,
    balances,
    analytics,
    votes: getVotes(userId),
    challenges: getChallenges(userId).challenges,
    groups: getGroups(userId),
    expenses: getExpenses(userId)
  });

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
  return `${adviceContext.primaryConcern.title} ${adviceContext.recommendedAction} ${adviceContext.followUpOptions[0]}`;
}

function summarizeWorkspace(userId) {
  const balances = calculateBalances(userId);
  const analytics = getAnalytics(userId);
  const votes = getVotes(userId);
  const challenges = getChallenges(userId).challenges;
  const groups = getGroups(userId);
  const expenses = getExpenses(userId);
  const adviceContext = buildAdviceContext({ userId, balances, analytics, votes, challenges, groups, expenses });

  return {
    adviceContext,
    balances: {
      net: balances.net,
      totalOwedToYou: balances.totalOwedToYou,
      totalYouOwe: balances.totalYouOwe,
      youOwe: balances.youOwe.map((person) => ({ name: person.name, amount: person.amount, groups: person.groups.map((group) => group.name) })),
      owedToYou: balances.owedToYou.map((person) => ({ name: person.name, amount: person.amount, groups: person.groups.map((group) => group.name) }))
    },
    analytics: {
      totalSpend: analytics.totalSpend,
      avgPerMonth: analytics.avgPerMonth,
      expenseCount: analytics.expenseCount,
      byCategory: analytics.byCategory.slice(0, 8),
      monthlyTrend: analytics.monthlyTrend.slice(-6),
      currentMonthByCategory: analytics.currentMonthByCategory,
      topExpenses: analytics.topExpenses
    },
    groups: groups.map((group) => ({
      name: group.name,
      type: group.type,
      threshold: group.threshold,
      members: group.members.map((member) => member.name)
    })),
    votes: votes.slice(0, 8).map((vote) => ({
      description: vote.description,
      groupName: vote.groupName,
      amount: vote.amount,
      status: vote.status,
      decisions: vote.decisions.map((decision) => ({ name: decision.name, decision: decision.decision }))
    })),
    challenges: challenges.slice(0, 8).map((challenge) => ({
      name: challenge.name,
      groupName: challenge.groupName,
      description: challenge.description,
      goal: challenge.goal,
      current: challenge.current,
      endDate: challenge.endDate
    })),
    recentExpenses: expenses.slice(0, 10).map((expense) => ({
      description: expense.description,
      groupName: expense.groupName,
      category: expense.category,
      amount: expense.amount,
      paidByName: expense.paidByName,
      expenseDate: expense.expenseDate
    }))
  };
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-8)
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(message.text || '').slice(0, 1000) }]
    }))
    .filter((message) => message.parts[0].text.trim());
}

function extractGeminiText(payload) {
  return payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeGeminiModel(model) {
  return String(model || 'gemini-2.5-flash').replace(/^models\//, '');
}

export async function generateAiReply(userId, question, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = normalizeGeminiModel(process.env.GEMINI_MODEL);
  const fallbackReply = generateLocalReply(userId, question);

  if (!apiKey) return fallbackReply;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const workspace = summarizeWorkspace(userId);
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              'You are the SplitStack AI spending coach for a shared-expense app.',
              'Use only the provided workspace data, computed adviceContext, and chat history.',
              'Treat questions about improving, analyzing, overspending, reducing costs, risk, budgets, or what to do next as advice questions.',
              'For every advice question, use exactly three short labeled lines: "Insight: ...", "Action: ...", and "Question: ...". Do not omit any of the three lines.',
              'When the latest user message is a short quick reply such as "Yes, help me..." or "No, not...", treat it as an answer to your previous Question line and continue that thread; do not repeat the original analysis.',
              'Use exact dollar amounts, categories, person names, and group names when available.',
              'Never say the data does not contain advice. If data is sparse, give a cautious recommendation and say what extra data would improve confidence.',
              'Do not invent transactions, budgets, goals, votes, challenges, or balances.',
              'If the user asks to log an expense, set a budget, or change account data, explain the intended change briefly; the app will show a separate confirmation before anything is saved.',
              'For simple lookup questions, answer directly and briefly; add a coaching nudge only if it is useful.'
            ].join(' ')
          }]
        },
        contents: [
          ...normalizeHistory(history),
          {
            role: 'user',
            parts: [{
              text: `Workspace data:\n${JSON.stringify(workspace, null, 2)}\n\nUser question: ${question}`
            }]
          }
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 0
          },
          temperature: 0.35,
          maxOutputTokens: 600
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('Gemini API request failed:', payload?.error?.message || response.statusText);
      return fallbackReply;
    }

    return extractGeminiText(payload) || fallbackReply;
  } catch (error) {
    console.warn('Gemini assistant fallback:', error?.message || error);
    return fallbackReply;
  } finally {
    clearTimeout(timeout);
  }
}
