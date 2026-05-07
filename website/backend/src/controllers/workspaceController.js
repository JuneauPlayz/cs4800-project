import {
  buildAssistantActionProposal,
  executeAssistantAction,
  generateAiReply,
  getAnalytics,
  getDashboard,
  getNotifications,
  getPendingInvitesForUser,
  getSettings,
  markNotificationRead,
  reserveAiChatSlot,
  updateUserProfile,
  upsertSettings
} from '../services/index.js';

export function health(_req, res) {
  res.json({ ok: true, service: 'SplitStack API', port: Number(process.env.PORT || 3001), database: 'sqlite' });
}

export function me(req, res) {
  res.json({ user: req.user, invites: getPendingInvitesForUser(req.user) });
}

export function updateMe(req, res) {
  const { avatarEmoji } = req.body ?? {};
  const updated = updateUserProfile(req.user.id, { avatarEmoji });
  res.json({ user: updated });
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
  res.json({ settings: getSettings(req.user.id) });
}

export function updateSettings(req, res) {
  const current = getSettings(req.user.id);
  const nextSettings = upsertSettings({
    userId: req.user.id,
    emailVotes: req.body?.emailVotes ?? current.emailVotes,
    emailBalance: req.body?.emailBalance ?? current.emailBalance,
    pushSettlements: req.body?.pushSettlements ?? current.pushSettlements,
    aiProactive: req.body?.aiProactive ?? current.aiProactive,
    profileVisibility: req.body?.profileVisibility ?? current.profileVisibility,
    activityVisibility: req.body?.activityVisibility ?? current.activityVisibility
  });
  res.json({ settings: nextSettings });
}

export async function chat(req, res) {
  const { message = '', history = [] } = req.body ?? {};
  const cleanMessage = String(message).trim();
  if (!cleanMessage) {
    res.status(400).json({ message: 'Message is required.' });
    return;
  }

  const chatLimit = reserveAiChatSlot(req.user.id);
  if (!chatLimit.allowed) {
    res.status(429).json({
      message: `You have reached the AI chat limit of ${chatLimit.limit} messages per hour. Try again after ${new Date(chatLimit.resetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
      chatLimit
    });
    return;
  }

  const reply = await generateAiReply(req.user.id, cleanMessage, history);
  const proposedAction = buildAssistantActionProposal(req.user.id, cleanMessage, history);
  res.json({ reply, chatLimit, proposedAction });
}

export function confirmAssistantAction(req, res) {
  try {
    const result = executeAssistantAction(req.user.id, req.body?.action);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to confirm assistant action.' });
  }
}
