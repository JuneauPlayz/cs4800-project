import {
  generateAiReply,
  getAnalytics,
  getDashboard,
  getNotifications,
  getPendingInvitesForUser,
  getPayoutProfile,
  getSettings,
  markNotificationRead,
  upsertPayoutProfile,
  upsertSettings
} from '../services/index.js';

export function health(_req, res) {
  res.json({ ok: true, service: 'SplitStack API', port: Number(process.env.PORT || 3001), database: 'sqlite' });
}

export function me(req, res) {
  res.json({ user: req.user, invites: getPendingInvitesForUser(req.user) });
}

export function dashboard(req, res) {
  res.json(getDashboard(req.user));
}

export function analytics(req, res) {
  res.json(getAnalytics(req.user.id));
}

export function notifications(req, res) {
  res.json({ notifications: getNotifications(req.user.id) });
}

export function markNotification(req, res) {
  markNotificationRead(req.params.id, req.user.id);
  res.json({ ok: true });
}

export function settings(req, res) {
  res.json({ settings: { ...getSettings(req.user.id), payoutProfile: getPayoutProfile(req.user.id) } });
}

export function updateSettings(req, res) {
  const current = getSettings(req.user.id);
  const currentPayoutProfile = getPayoutProfile(req.user.id);
  const nextSettings = upsertSettings({
    userId: req.user.id,
    emailVotes: req.body?.emailVotes ?? current.emailVotes,
    emailBalance: req.body?.emailBalance ?? current.emailBalance,
    pushSettlements: req.body?.pushSettlements ?? current.pushSettlements,
    aiProactive: req.body?.aiProactive ?? current.aiProactive,
    profileVisibility: req.body?.profileVisibility ?? current.profileVisibility,
    activityVisibility: req.body?.activityVisibility ?? current.activityVisibility
  });
  const payoutProfile = upsertPayoutProfile({
    userId: req.user.id,
    zelleHandle: req.body?.payoutProfile?.zelleHandle ?? currentPayoutProfile.zelleHandle,
    venmoHandle: req.body?.payoutProfile?.venmoHandle ?? currentPayoutProfile.venmoHandle,
    cashNote: req.body?.payoutProfile?.cashNote ?? currentPayoutProfile.cashNote,
    preferredMethod: req.body?.payoutProfile?.preferredMethod ?? currentPayoutProfile.preferredMethod
  });
  res.json({ settings: { ...nextSettings, payoutProfile } });
}

export function chat(req, res) {
  const { message = '' } = req.body ?? {};
  res.json({ reply: generateAiReply(req.user.id, message) });
}
