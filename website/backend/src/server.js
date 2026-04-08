import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {
  calculateBalances,
  createChallenge,
  createExpense,
  createGroup,
  createUser,
  generateAiReply,
  getAnalytics,
  getChallenges,
  getExpenses,
  getGroups,
  getNotifications,
<<<<<<< HEAD
  getPendingInvitesForUser,
=======
  getProgress,
  updateGroup,
  leaveGroup,
>>>>>>> dev
  getSettings,
  getUserByEmail,
  getUserById,
  getVotes,
  leaveGroup,
  deleteGroup,
  markNotificationRead,
  respondToInvite,
  respondToVote,
  upsertSettings,
<<<<<<< HEAD
  updateGroup,
  contributeToChallenge,
  requireMembership
=======
  sendInvitation,
  getPendingInvitations,
  respondToInvitation
>>>>>>> dev
} from './services.js';

function currentUserId(req) {
  return req.headers['x-user-id'] || 'u1';
}

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-user-id'];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  const user = getUserById(String(token));
  if (!user) return res.status(401).json({ message: 'Invalid session.' });
  req.user = user;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SplitStack API', port: PORT, database: 'sqlite' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = getUserByEmail(String(email || '').toLowerCase());
  if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid email or password.' });
  const safeUser = getUserById(user.id);
  res.json({ user: safeUser, token: safeUser.id });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email, and password are required.' });
  if (getUserByEmail(email)) return res.status(409).json({ message: 'Email already exists.' });
  const user = createUser({ name, email, password });
  res.status(201).json({ user, token: user.id });
});

<<<<<<< HEAD
app.use('/api', auth);

app.get('/api/me', (req, res) => {
  res.json({ user: req.user, invites: getPendingInvitesForUser(req.user) });
});

app.get('/api/dashboard', (req, res) => {
  const balances = calculateBalances(req.user.id);
  res.json({ user: req.user, balances, notifications: getNotifications(req.user.id), analytics: getAnalytics(req.user.id), pendingVotes: getVotes(req.user.id).filter((vote) => vote.status === 'pending').length });
});

app.get('/api/groups', (req, res) => {
  res.json({ groups: getGroups(req.user.id) });
=======
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
>>>>>>> dev
});

app.post('/api/groups', (req, res) => {
  const { name, type = 'custom', threshold = 0, inviteEntries = [], inviteEmails = [], description = '' } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ message: 'Group name is required.' });
<<<<<<< HEAD
  const group = createGroup({ userId: req.user.id, name, type, threshold, inviteEntries, inviteEmails, description });
=======
  const group = createGroup({ name: name.trim(), type, emoji, threshold, memberNames }, currentUserId(req));
>>>>>>> dev
  res.status(201).json({ group });
});

app.put('/api/groups/:id', (req, res) => {
  const group = updateGroup(req.params.id, req.user.id, req.body ?? {});
  if (!group) return res.status(404).json({ message: 'Group not found or you do not have permission to edit it.' });
  res.json({ group });
});

<<<<<<< HEAD


app.delete('/api/groups/:id', (req, res) => {
  const result = deleteGroup(req.params.id, req.user.id);
  if (!result?.ok) return res.status(400).json({ message: result?.message || 'Unable to delete this group.' });
  res.json(result);
});

app.delete('/api/groups/:id/membership', (req, res) => {
  const result = leaveGroup(req.params.id, req.user.id);
  if (!result?.ok) return res.status(400).json({ message: result?.message || 'Unable to leave this group.' });
  res.json(result);
});

app.get('/api/invites', (req, res) => {
  res.json({ invites: getPendingInvitesForUser(req.user) });
});

app.post('/api/invites/:id/respond', (req, res) => {
  const { decision } = req.body ?? {};
  if (!['accepted', 'declined'].includes(decision)) return res.status(400).json({ message: 'decision must be accepted or declined.' });
  const result = respondToInvite(req.params.id, req.user.id, decision);
  if (!result) return res.status(404).json({ message: 'Invite not found.' });
  res.json({ invite: result });
});

app.get('/api/expenses', (req, res) => {
  res.json({ expenses: getExpenses(req.user.id) });
});

app.post('/api/expenses', (req, res) => {
  const { groupId, description, amount, category, splitMethod = 'equal' } = req.body ?? {};
  if (!groupId || !description || !amount || !category) return res.status(400).json({ message: 'groupId, description, amount, and category are required.' });
  if (!requireMembership(groupId, req.user.id)) return res.status(403).json({ message: 'You are not a member of this group.' });
  const result = createExpense({ ...req.body, amount: Number(amount), splitMethod, paidBy: req.user.id });
  res.status(201).json(result);
});

app.get('/api/votes', (req, res) => {
  res.json({ votes: getVotes(req.user.id) });
=======
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
>>>>>>> dev
});

app.post('/api/votes/:id/respond', (req, res) => {
  const { decision } = req.body ?? {};
<<<<<<< HEAD
  if (!['yes', 'no'].includes(decision)) return res.status(400).json({ message: 'decision must be yes or no.' });
  const vote = respondToVote(req.params.id, decision, req.user.id);
  if (!vote) return res.status(404).json({ message: 'Vote not found.' });
=======
  if (!['yes', 'no'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be yes or no.' });
  }
  const vote = respondToVote(req.params.id, decision, currentUserId(req));
>>>>>>> dev
  res.json({ vote });
});

app.get('/api/analytics', (req, res) => {
<<<<<<< HEAD
  res.json(getAnalytics(req.user.id));
=======
  res.json(getAnalytics(currentUserId(req)));
>>>>>>> dev
});

app.get('/api/challenges', (req, res) => {
  res.json(getChallenges(req.user.id));
});

app.post('/api/challenges', (req, res) => {
  const { groupId, name, description, goal, endDate } = req.body ?? {};
  if (!groupId || !name || !description || !goal) return res.status(400).json({ message: 'groupId, name, description, and goal are required.' });
  const challenge = createChallenge({ userId: req.user.id, groupId, name, description, goal, endDate });
  if (!challenge) return res.status(403).json({ message: 'You are not a member of this group.' });
  res.status(201).json({ challenge });
});

<<<<<<< HEAD
app.post('/api/challenges/:id/contribute', (req, res) => {
  const { amount } = req.body ?? {};
  if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'A positive amount is required.' });
  const challenge = contributeToChallenge({ userId: req.user.id, challengeId: req.params.id, amount: Number(amount) });
  if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
  res.json({ challenge });
});

app.get('/api/notifications', (req, res) => {
  res.json({ notifications: getNotifications(req.user.id) });
});

app.post('/api/notifications/:id/read', (req, res) => {
  markNotificationRead(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  res.json({ settings: getSettings(req.user.id) });
});

app.put('/api/settings', (req, res) => {
  const current = getSettings(req.user.id);
  const settings = upsertSettings({
    userId: req.user.id,
=======
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
>>>>>>> dev
    emailVotes: req.body?.emailVotes ?? current.emailVotes,
    emailBalance: req.body?.emailBalance ?? current.emailBalance,
    pushSettlements: req.body?.pushSettlements ?? current.pushSettlements,
    aiProactive: req.body?.aiProactive ?? current.aiProactive,
    profileVisibility: req.body?.profileVisibility ?? current.profileVisibility,
    activityVisibility: req.body?.activityVisibility ?? current.activityVisibility
  });
  res.json({ settings });
});

app.post('/api/ai/chat', (req, res) => {
  const { message = '' } = req.body ?? {};
<<<<<<< HEAD
  res.json({ reply: generateAiReply(req.user.id, message) });
=======
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
>>>>>>> dev
});

app.listen(PORT, () => {
  console.log(`SplitStack API running at http://localhost:${PORT}`);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err?.message || 'Server error.' });
});
