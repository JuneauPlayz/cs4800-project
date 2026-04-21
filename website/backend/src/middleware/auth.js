import { getUserById } from '../services/index.js';

export function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-user-id'];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  const user = getUserById(String(token));
  if (!user) return res.status(401).json({ message: 'Invalid session.' });

  req.user = user;
  next();
}
