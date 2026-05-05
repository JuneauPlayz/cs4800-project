import { createGroup, deleteGroup, leaveGroup, listGroups, listPendingInvites, respondToInvite, updateGroup } from '../services/index.js';

export function list(req, res) {
  res.json({ groups: listGroups(req.user.id) });
}

export function create(req, res) {
  const { name, type = 'custom', threshold = 0, inviteEntries = [], inviteEmails = [], description = '' } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ message: 'Group name is required.' });
  const thresholdValue = Number(threshold || 0);
  if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
    return res.status(400).json({ message: 'Voting threshold must be zero or greater.' });
  }
  const group = createGroup({ userId: req.user.id, name, type, threshold: thresholdValue, inviteEntries, inviteEmails, description });
  return res.status(201).json({ group });
}

export function update(req, res) {
  const payload = req.body ?? {};
  if (payload.threshold !== '' && payload.threshold != null) {
    const thresholdValue = Number(payload.threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
      return res.status(400).json({ message: 'Voting threshold must be zero or greater.' });
    }
    payload.threshold = thresholdValue;
  }
  const group = updateGroup(req.params.id, req.user.id, payload);
  if (!group) return res.status(404).json({ message: 'Group not found or you do not have permission to edit it.' });
  return res.json({ group });
}

export function remove(req, res) {
  const result = deleteGroup(req.params.id, req.user.id);
  if (!result?.ok) return res.status(400).json({ message: result?.message || 'Unable to delete this group.' });
  return res.json(result);
}

export function leave(req, res) {
  const result = leaveGroup(req.params.id, req.user.id);
  if (!result?.ok) return res.status(400).json({ message: result?.message || 'Unable to leave this group.' });
  return res.json(result);
}

export function invites(req, res) {
  res.json({ invites: listPendingInvites(req.user) });
}

export function respondInvite(req, res) {
  const { decision } = req.body ?? {};
  if (!['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be accepted or declined.' });
  }
  const invite = respondToInvite(req.params.id, req.user.id, decision);
  if (!invite) return res.status(404).json({ message: 'Invite not found.' });
  return res.json({ invite });
}
