import { contributeToChallenge, createChallenge, getChallenges } from '../services/index.js';

export function list(req, res) {
  res.json(getChallenges(req.user.id));
}

export function create(req, res) {
  const { groupId, name, description, goal, endDate, startDate, type } = req.body ?? {};
  const challengeType = type === 'spending_goal' ? 'spending_goal' : 'group_goal';
  if (!groupId || !name || !goal) {
    return res.status(400).json({ message: 'groupId, name, and goal are required.' });
  }
  const normalizedName = String(name).trim();
  if (!normalizedName) {
    return res.status(400).json({ message: 'Challenge name is required.' });
  }
  const goalValue = Number(goal);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    return res.status(400).json({ message: 'A positive goal amount is required.' });
  }
  const challenge = createChallenge({ userId: req.user.id, groupId, name: normalizedName, description: description || '', goal: goalValue, endDate, startDate, type: challengeType });
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
