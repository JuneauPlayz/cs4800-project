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
  getPendingInvitesForUser,
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
  updateGroup,
  contributeToChallenge,
  requireMembership
} from './services.js';

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
});

app.post('/api/groups', (req, res) => {
  const { name, type = 'custom', threshold = 0, inviteEntries = [], inviteEmails = [], description = '' } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ message: 'Group name is required.' });
  const group = createGroup({ userId: req.user.id, name, type, threshold, inviteEntries, inviteEmails, description });
  res.status(201).json({ group });
});

app.put('/api/groups/:id', (req, res) => {
  const group = updateGroup(req.params.id, req.user.id, req.body ?? {});
  if (!group) return res.status(404).json({ message: 'Group not found or you do not have permission to edit it.' });
  res.json({ group });
});



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
});

app.post('/api/votes/:id/respond', (req, res) => {
  const { decision } = req.body ?? {};
  if (!['yes', 'no'].includes(decision)) return res.status(400).json({ message: 'decision must be yes or no.' });
  const vote = respondToVote(req.params.id, decision, req.user.id);
  if (!vote) return res.status(404).json({ message: 'Vote not found.' });
  res.json({ vote });
});

app.get('/api/analytics', (req, res) => {
  res.json(getAnalytics(req.user.id));
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
  res.json({ reply: generateAiReply(req.user.id, message) });
});

app.listen(PORT, () => {
  console.log(`SplitStack API running at http://localhost:${PORT}`);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err?.message || 'Server error.' });
});
