import db from '../db.js';

const CHAT_LIMIT = 15;
const WINDOW_MS = 60 * 60 * 1000;

function toIso(value) {
  return new Date(value).toISOString();
}

function getWindowStart(now = new Date()) {
  return new Date(now.getTime() - WINDOW_MS);
}

function getResetAt(userId, windowStart) {
  const oldest = db.prepare(`
    SELECT created_at as createdAt
    FROM ai_chat_usage
    WHERE user_id = ? AND created_at > ?
    ORDER BY created_at ASC
    LIMIT 1
  `).get(userId, toIso(windowStart));

  if (!oldest) return toIso(Date.now() + WINDOW_MS);
  return toIso(new Date(oldest.createdAt).getTime() + WINDOW_MS);
}

export function reserveAiChatSlot(userId, now = new Date()) {
  const windowStart = getWindowStart(now);

  db.prepare('DELETE FROM ai_chat_usage WHERE created_at <= ?').run(toIso(new Date(now.getTime() - 24 * WINDOW_MS)));

  const used = db.prepare(`
    SELECT COUNT(*) as count
    FROM ai_chat_usage
    WHERE user_id = ? AND created_at > ?
  `).get(userId, toIso(windowStart)).count;

  const resetAt = getResetAt(userId, windowStart);
  if (used >= CHAT_LIMIT) {
    return {
      allowed: false,
      limit: CHAT_LIMIT,
      remaining: 0,
      resetAt
    };
  }

  db.prepare('INSERT INTO ai_chat_usage (id, user_id, created_at) VALUES (?, ?, ?)')
    .run(`chat-${userId}-${now.getTime()}-${Math.random().toString(16).slice(2)}`, userId, toIso(now));

  return {
    allowed: true,
    limit: CHAT_LIMIT,
    remaining: Math.max(CHAT_LIMIT - used - 1, 0),
    resetAt: used === 0 ? toIso(now.getTime() + WINDOW_MS) : resetAt
  };
}
