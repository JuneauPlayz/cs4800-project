export const SESSION_STORAGE_KEY = 'splitstack-session';

export const categoryOptions = ['Groceries', 'Dining', 'Utilities', 'Rent', 'Travel', 'Furniture', 'Streaming', 'Electronics', 'Household', 'Other'];

export const workspacePages = ['home', 'analytics', 'groups', 'add', 'vote', 'chat', 'progress', 'settings'];

export const navMeta = {
  home: ['Home', 'Your standing across all accepted groups'],
  analytics: ['Analytics', 'Live spending totals across your active groups'],
  groups: ['Groups', 'Create groups, manage invites, and edit existing groups'],
  add: ['Add Expense', 'Log and split a shared expense with real members'],
  vote: ['Group Voting', 'Approve purchases above the voting threshold'],
  chat: ['AI Assistant', 'Ask questions about your actual SplitStack data'],
  progress: ['Challenges', 'Create group challenges and add contributions'],
  settings: ['Settings', 'Account, notifications, and privacy preferences']
};

export const DICEBEAR_SEEDS = [
  'Jasper', 'Luna', 'Felix', 'River', 'Sage', 'Quinn',
  'Milo', 'Ivy', 'Oscar', 'Willow', 'Leo', 'Aurora',
  'Max', 'Zoe', 'Finn', 'Ruby', 'Kai', 'Nova',
  'Asher', 'Aria', 'Theo', 'Cleo', 'Eli', 'Violet'
];

export function getDiceBearUrl(seed) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export const initialAuthForm = { name: '', email: 'jordan@splitstack.app', password: 'demo123', avatarEmoji: '' };
export const initialExpenseForm = { groupId: '', description: '', amount: '', category: 'Groceries', splitMethod: 'equal', reason: '' };
export const initialGroupForm = { id: null, name: '', type: 'roommates', threshold: '', inviteEmail: '', inviteEmails: [], description: '' };
export const initialChallengeForm = { groupId: '', name: '', description: '', goal: '', endDate: '' };
export const initialChallengesState = { challenges: [], rings: [] };
export const initialChatMessages = [{ role: 'ai', text: 'Hi! I’m the SplitStack assistant. Ask me about balances, spending, voting, or challenges.' }];

export function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function parseInviteEntries(entries = []) {
  const raw = Array.isArray(entries) ? entries : String(entries).split(/\n|,/);
  const seen = new Set();
  return raw
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => entry && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    })
    .map((email) => ({ email }));
}

export function buildEvenPercentMap(members = []) {
  const count = members.length || 1;
  const base = Number((100 / count).toFixed(2));
  const map = {};
  members.forEach((member, index) => {
    map[member.id] = index === members.length - 1 ? Number((100 - base * (members.length - 1)).toFixed(2)) : base;
  });
  return map;
}

export function buildEvenCustomMap(members = [], amount = 0) {
  const count = members.length || 1;
  const base = Number((Number(amount || 0) / count).toFixed(2));
  const map = {};
  members.forEach((member, index) => {
    map[member.id] = index === members.length - 1 ? Number((Number(amount || 0) - base * (members.length - 1)).toFixed(2)) : base;
  });
  return map;
}
