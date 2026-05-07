export function reserveAiChatSlot(_userId, _now = new Date()) {
  return {
    allowed: true,
    limit: null,
    remaining: null,
    resetAt: null
  };
}
