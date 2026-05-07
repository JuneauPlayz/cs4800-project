async function api(path, options = {}, token = null) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let payload = {};
    let fallbackText = '';
    try {
      payload = await response.json();
    } catch {
      fallbackText = await response.text().catch(() => '');
    }
    throw new Error(payload.message || fallbackText || `Request failed (${response.status})`);
  }

  return response.json();
}

export const splitStackApi = {
  login(credentials) {
    return api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  },
  register(payload) {
    return api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },
  getMe(token) {
    return api('/api/me', {}, token);
  },
  getDashboard(token) {
    return api('/api/dashboard', {}, token);
  },
  getGroups(token) {
    return api('/api/groups', {}, token);
  },
  createGroup(payload, token) {
    return api('/api/groups', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  updateGroup(groupId, payload, token) {
    return api(`/api/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  },
  leaveGroup(groupId, token) {
    return api(`/api/groups/${groupId}/membership`, { method: 'DELETE' }, token);
  },
  deleteGroup(groupId, token) {
    return api(`/api/groups/${groupId}`, { method: 'DELETE' }, token);
  },
  getInvites(token) {
    return api('/api/invites', {}, token);
  },
  respondToInvite(inviteId, decision, token) {
    return api(`/api/invites/${inviteId}/respond`, { method: 'POST', body: JSON.stringify({ decision }) }, token);
  },
  getExpenses(token) {
    return api('/api/expenses', {}, token);
  },
  createExpense(payload, token) {
    return api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  async uploadReceipt(file, token) {
    const response = await fetch('/api/receipts', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': file.type || 'application/octet-stream',
        'X-Receipt-File-Name': file.name || 'receipt'
      },
      body: file
    });

    if (!response.ok) {
      let payload = {};
      let fallbackText = '';
      try {
        payload = await response.json();
      } catch {
        fallbackText = await response.text().catch(() => '');
      }
      throw new Error(payload.message || fallbackText || `Receipt upload failed (${response.status})`);
    }

    return response.json();
  },
  recordExpensePayment(expenseId, payload, token) {
    return api(`/api/expenses/${expenseId}/settlements`, { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  getVotes(token) {
    return api('/api/votes', {}, token);
  },
  respondToVote(voteId, decision, token) {
    return api(`/api/votes/${voteId}/respond`, { method: 'POST', body: JSON.stringify({ decision }) }, token);
  },
  getAnalytics(token) {
    return api('/api/analytics', {}, token);
  },
  getChallenges(token) {
    return api('/api/challenges', {}, token);
  },
  createChallenge(payload, token) {
    return api('/api/challenges', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  contributeToChallenge(challengeId, amount, token) {
    return api(`/api/challenges/${challengeId}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }, token);
  },
  getSettings(token) {
    return api('/api/settings', {}, token);
  },
  updateSettings(payload, token) {
    return api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }, token);
  },
  getNotifications(token) {
    return api('/api/notifications', {}, token);
  },
  markNotificationRead(notificationId, token) {
    return api(`/api/notifications/${notificationId}/read`, { method: 'POST' }, token);
  },
  sendChat(message, token, history = []) {
    return api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) }, token);
  },
  confirmAssistantAction(action, token) {
    return api('/api/ai/actions/confirm', { method: 'POST', body: JSON.stringify({ action }) }, token);
  },
  getBudgetGoal(token) {
    return api('/api/budget', {}, token);
  },
  saveBudgetGoal(payload, token) {
    return api('/api/budget', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  loadWorkspace(token) {
    return Promise.all([
      this.getMe(token),
      this.getDashboard(token),
      this.getGroups(token),
      this.getExpenses(token),
      this.getVotes(token),
      this.getAnalytics(token),
      this.getChallenges(token),
      this.getSettings(token),
      this.getNotifications(token),
      this.getInvites(token),
      this.getBudgetGoal(token)
    ]);
  },
  pollWorkspace(token) {
    return Promise.all([
      this.getNotifications(token),
      this.getInvites(token),
      this.getChallenges(token),
      this.getVotes(token)
    ]);
  }
};
