import { getAnalytics } from './analyticsService.js';
import { getChallenges } from './challengeService.js';
import { calculateBalances } from './expenseService.js';
import { moneyLike } from './sharedService.js';
import { getSettlementHistory } from './settlementService.js';
import { getVotes } from './voteService.js';

export function generateAiReply(userId, question) {
  const balances = calculateBalances(userId);
  const analytics = getAnalytics(userId);
  const pendingVotes = getVotes(userId).filter((vote) => vote.status === 'pending');
  const settlements = getSettlementHistory(userId);
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
  if (lower.includes('settle') || lower.includes('venmo') || lower.includes('zelle')) {
    const nextPerson = balances.youOwe[0] || balances.owedToYou[0];
    if (!nextPerson) return 'Everyone is settled up right now.';
    const direction = balances.youOwe[0] ? `You still owe ${nextPerson.name} ${moneyLike(nextPerson.amount)}.` : `${nextPerson.name} still owes you ${moneyLike(nextPerson.amount)}.`;
    const methods = ['zelle', 'venmo', 'cash'].filter((method) => {
      if (method === 'zelle') return Boolean(nextPerson.payoutProfile?.zelleHandle);
      if (method === 'venmo') return Boolean(nextPerson.payoutProfile?.venmoHandle);
      return true;
    }).join(', ');
    return `${direction} Available payout methods: ${methods}. ${settlements.length ? `You have logged ${settlements.length} settlement${settlements.length === 1 ? '' : 's'} so far.` : 'No settlements have been marked yet.'}`;
  }
  return `You have ${pendingVotes.length} pending vote${pendingVotes.length === 1 ? '' : 's'}, your current outstanding balance is ${moneyLike(balances.net)}, and your top spending category is ${analytics.byCategory[0]?.category ?? 'not enough data yet'}.`;
}
