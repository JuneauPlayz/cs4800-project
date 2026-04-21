import { getVotes, respondToVote } from '../services/index.js';

export function list(req, res) {
  res.json({ votes: getVotes(req.user.id) });
}

export function respond(req, res) {
  const { decision } = req.body ?? {};
  if (!['yes', 'no'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be yes or no.' });
  }
  const vote = respondToVote(req.params.id, decision, req.user.id);
  if (!vote) return res.status(404).json({ message: 'Vote not found.' });
  return res.json({ vote });
}
