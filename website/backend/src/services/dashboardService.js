import { getAnalytics } from './analyticsService.js';
import { calculateBalances } from './expenseService.js';
import { getNotifications } from './sharedService.js';
import { getVotes } from './voteService.js';

export function getDashboard(user) {
  const votes = getVotes(user.id);
  return {
    user,
    balances: calculateBalances(user.id),
    notifications: getNotifications(user.id),
    analytics: getAnalytics(user.id),
    pendingVotes: votes.filter((vote) => vote.status === 'pending').length
  };
}
