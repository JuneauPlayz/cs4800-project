import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db from './db.js';
import {
  calculateBalances,
  createExpense,
  createGroup,
  generateAiReply,
  getAnalytics,
  getCurrentUser,
  getExpenses,
  getGroups,
  getNotifications,
  getProgress,
  updateGroup,
  leaveGroup,
  getSettings,
  getVotes,
  respondToVote,
  upsertSettings,
  sendInvitation,
  getPendingInvitations,
  respondToInvitation
} from './services.js';

function currentUserId(req) {
  return req.headers['x-user-id'] || 'u1';
}

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SplitStack API', port: PORT, database: 'sqlite' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE email = ? AND password = ?').get(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ user, token: 'demo-token-splitstack' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' });
  }
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const id = `u${Date.now()}`;
  try {
    db.prepare('INSERT INTO users (id, name, email, password, initials, avatar_color) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, email.toLowerCase(), password, initials, '#0D9488');
    db.prepare('INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive) VALUES (?, 1, 1, 1, 1)')
      .run(id);
    const user = db.prepare('SELECT id, name, email, initials, avatar_color as avatarColor FROM users WHERE id = ?').get(id);
    res.status(201).json({ user, token: 'demo-token-splitstack' });
  } catch (error) {
    res.status(409).json({ message: 'Email already exists.' });
  }
});

app.get('/api/me', (req, res) => {
  res.json({ user: getCurrentUser(currentUserId(req)) });
});

app.get('/api/dashboard', (req, res) => {
  const uid = currentUserId(req);
  res.json({
    user: getCurrentUser(uid),
    balances: calculateBalances(uid),
    notifications: getNotifications(),
    analytics: getAnalytics(uid),
    pendingVotes: getVotes(uid).filter((vote) => vote.status === 'pending').length
  });
});

app.get('/api/groups', (req, res) => {
  res.json({ groups: getGroups(currentUserId(req)) });
});

app.post('/api/groups', (req, res) => {
  const { name, type = 'custom', emoji = '👥', threshold = 0, memberNames = [] } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ message: 'Group name is required.' });
  const group = createGroup({ name: name.trim(), type, emoji, threshold, memberNames }, currentUserId(req));
  res.status(201).json({ group });
});

app.put('/api/groups/:id', (req, res) => {
  const group = updateGroup(req.params.id, req.body ?? {});
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  res.json({ group });
});

app.delete('/api/groups/:id', (req, res) => {
  try {
    const result = leaveGroup(req.params.id, currentUserId(req));
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/expenses', (req, res) => {
  res.json({ expenses: getExpenses(currentUserId(req)) });
});

app.post('/api/expenses', (req, res) => {
  const { groupId, description, amount, category, splitMethod = 'equal', paidBy = currentUserId(req) } = req.body ?? {};
  if (!groupId || !description || !amount || !category) {
    return res.status(400).json({ message: 'groupId, description, amount, and category are required.' });
  }
  const payload = {
    ...req.body,
    amount: Number(amount),
    splitMethod,
    paidBy
  };
  const result = createExpense(payload);
  res.status(201).json(result);
});

app.post('/api/ocr/mock', (req, res) => {
  const merchant = req.body?.merchant || 'Whole Foods';
  res.json({
    merchant,
    amount: 148.5,
    date: new Date().toISOString().slice(0, 10),
    category: 'Groceries'
  });
});

app.get('/api/votes', (req, res) => {
  res.json({ votes: getVotes(currentUserId(req)) });
});

app.post('/api/votes/:id/respond', (req, res) => {
  const { decision } = req.body ?? {};
  if (!['yes', 'no'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be yes or no.' });
  }
  const vote = respondToVote(req.params.id, decision, currentUserId(req));
  res.json({ vote });
});

app.get('/api/analytics', (req, res) => {
  res.json(getAnalytics(currentUserId(req)));
});

app.get('/api/progress', (_req, res) => {
  res.json(getProgress());
});

app.get('/api/notifications', (_req, res) => {
  res.json({ notifications: getNotifications() });
});

app.get('/api/settings', (req, res) => {
  const uid = currentUserId(req);
  const settings = getSettings(uid) ?? upsertSettings({ userId: uid, emailVotes: 1, emailBalance: 1, pushSettlements: 1, aiProactive: 1 });
  res.json({ settings });
});

app.put('/api/settings', (req, res) => {
  const uid = currentUserId(req);
  const current = getSettings(uid) ?? { emailVotes: 1, emailBalance: 1, pushSettlements: 1, aiProactive: 1 };
  const settings = upsertSettings({
    userId: uid,
    emailVotes: req.body?.emailVotes ?? current.emailVotes,
    emailBalance: req.body?.emailBalance ?? current.emailBalance,
    pushSettlements: req.body?.pushSettlements ?? current.pushSettlements,
    aiProactive: req.body?.aiProactive ?? current.aiProactive
  });
  res.json({ settings });
});

app.post('/api/ai/chat', (req, res) => {
  const { message = '' } = req.body ?? {};
  res.json({ reply: generateAiReply(message, currentUserId(req)) });
});

app.post('/api/groups/:id/invite', (req, res) => {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  try {
    const result = sendInvitation(req.params.id, currentUserId(req), email);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/invitations', (req, res) => {
  const invitations = getPendingInvitations(currentUserId(req));
  res.json({ invitations });
});

app.put('/api/invitations/:id/respond', (req, res) => {
  const { decision } = req.body ?? {};
  if (!['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be accepted or declined.' });
  }
  try {
    const result = respondToInvitation(req.params.id, currentUserId(req), decision);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SplitStack API running at http://localhost:${PORT}`);
});
