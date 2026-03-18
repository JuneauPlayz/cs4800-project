export const SCREEN_IDS = {
  dashboard: 'dashboard',
  groups: 'groups',
  addExpense: 'addexpense',
  settle: 'settle',
  groupVoting: 'groupvoting',
  aiChat: 'aichat',
  challenges: 'challenges',
  scanner: 'scanner',
}

export const navSections = [
  {
    title: 'Main',
    items: [
      { id: SCREEN_IDS.dashboard, label: 'Dashboard', icon: 'dashboard' },
      { id: SCREEN_IDS.groups, label: 'Groups', icon: 'groups' },
      { id: SCREEN_IDS.addExpense, label: 'Add Expense', icon: 'addExpense' },
      { id: SCREEN_IDS.settle, label: 'Settle Up', icon: 'settle' },
    ],
  },
  {
    title: 'Features',
    items: [
      { id: SCREEN_IDS.groupVoting, label: 'Group Voting', icon: 'groupVoting', badge: 2 },
      { id: SCREEN_IDS.aiChat, label: 'AI Roommate', icon: 'ai' },
      { id: SCREEN_IDS.challenges, label: 'Challenges', icon: 'challenges' },
      { id: SCREEN_IDS.scanner, label: 'Receipt Scanner', icon: 'scanner' },
    ],
  },
]

export const categories = [
  'Groceries', 'Dining', 'Utilities', 'Rent',
  'Travel', 'Supplies', 'Subscriptions', 'Other',
]

export const emptyGroup = { id: null, name: '', location: '', members: [], totalSpend: 0 }

export const mockVotes = [
  {
    id: 1,
    title: 'New Living Room Couch',
    amount: 850,
    proposer: 'Marcus',
    description: 'Upgrade our current couch to a more comfortable sectional for movie nights.',
    approvals: ['Marcus', 'Priya'],
    waiting: ['Sam', 'Jordan'],
    icon: 'couch',
  },
  {
    id: 2,
    title: 'Gaming Subscription',
    amount: 15.99,
    proposer: 'Sam',
    description: 'Shared entertainment subscription for multiplayer nights and weekend tournaments.',
    approvals: ['Marcus', 'Sam'],
    waiting: ['Priya', 'Jordan'],
    icon: 'gamepad',
  },
]

export const challengeRings = [
  { id: 1, icon: 'cart', title: 'Grocery Budget', detail: '$385 / $500', value: 77, color: '#2bb3a3' },
  { id: 2, icon: 'burger', title: 'Dining Out', detail: 'meals8 / meals12', value: 67, color: '#ffb347' },
  { id: 3, icon: 'bulb', title: 'Utility Savings', detail: '$185 / $250', value: 74, color: '#ff6b6b' },
]

export const streakCards = [
  { id: 1, icon: 'chart', title: 'Daily Budget Check', subtitle: 'Keep it going!', days: 12 },
  { id: 2, icon: 'pan', title: 'Weekly Meal Prep', subtitle: 'Keep it going!', days: 5 },
  { id: 3, icon: 'moneyBag', title: 'No Impulse Buys', subtitle: 'Keep it going!', days: 8 },
]
