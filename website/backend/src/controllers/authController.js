import { getUserByEmail, loginUser, registerUser } from '../services/index.js';

export function login(req, res) {
  const { email, password } = req.body ?? {};
  const result = loginUser({ email, password });
  if (!result) return res.status(401).json({ message: 'Invalid email or password.' });
  return res.json(result);
}

export function register(req, res) {
  const { name, email, password, avatarEmoji } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' });
  }
  const normalizedPassword = String(password);
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  const normalizedName = String(name).trim();
  if (!normalizedName) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  if (getUserByEmail(normalizedEmail)) {
    return res.status(409).json({ message: 'Email already exists.' });
  }
  const result = registerUser({ name: normalizedName, email: normalizedEmail, password: normalizedPassword, avatarEmoji });
  return res.status(201).json(result);
}
