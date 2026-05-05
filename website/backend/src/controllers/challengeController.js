import { contributeToChallenge, createChallenge, getChallenges } from '../services/index.js';

export function list(req, res) {
  res.json(getChallenges(req.user.id));
}

export function create(req, res) {
  const { groupId, name, description, goal, endDate } = req.body ?? {};
  if (!groupId || !name || !description || !goal) {
    return res.status(400).json({ message: 'groupId, name, description, and goal are required.' });
  }
  const normalizedName = String(name).trim();
  const normalizedDescription = String(description).trim();
  if (!normalizedName || !normalizedDescription) {
    return res.status(400).json({ message: 'Challenge name and description are required.' });
  }
  const goalValue = Number(goal);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    return res.status(400).json({ message: 'A positive goal amount is required.' });
  }
  const challenge = createChallenge({ userId: req.user.id, groupId, name: normalizedName, description: normalizedDescription, goal: goalValue, endDate });
  if (!challenge) return res.status(403).json({ message: 'You are not a member of this group.' });
  return res.status(201).json({ challenge });
}

export function contribute(req, res) {
  const { amount } = req.body ?? {};
  const amountValue = Number(amount);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return res.status(400).json({ message: 'A positive amount is required.' });
  }
  const challenge = contributeToChallenge({ userId: req.user.id, challengeId: req.params.id, amount: amountValue });
  if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
  return res.json({ challenge });
}
