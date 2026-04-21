import { contributeToChallenge, createChallenge, getChallenges } from '../services/index.js';

export function list(req, res) {
  res.json(getChallenges(req.user.id));
}

export function create(req, res) {
  const { groupId, name, description, goal, endDate } = req.body ?? {};
  if (!groupId || !name || !description || !goal) {
    return res.status(400).json({ message: 'groupId, name, description, and goal are required.' });
  }
  const challenge = createChallenge({ userId: req.user.id, groupId, name, description, goal, endDate });
  if (!challenge) return res.status(403).json({ message: 'You are not a member of this group.' });
  return res.status(201).json({ challenge });
}

export function contribute(req, res) {
  const { amount } = req.body ?? {};
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'A positive amount is required.' });
  }
  const challenge = contributeToChallenge({ userId: req.user.id, challengeId: req.params.id, amount: Number(amount) });
  if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
  return res.json({ challenge });
}
