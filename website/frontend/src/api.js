const BASE_URL = 'http://localhost:3001/api'

function getToken() {
  return localStorage.getItem('splitstack_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (name, email, password) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups = () => request('/groups')
export const getGroup = (id) => request(`/groups/${id}`)
export const createGroup = (name, location) =>
  request('/groups', { method: 'POST', body: JSON.stringify({ name, location }) })
export const deleteGroup = (id) =>
  request(`/groups/${id}`, { method: 'DELETE' })

// ── Members ───────────────────────────────────────────────────────────────────
export const addMember = (groupId, name, userId = null) =>
  request(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ name, user_id: userId }),
  })
export const removeMember = (groupId, memberId) =>
  request(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' })

// ── Expenses ──────────────────────────────────────────────────────────────────
export const getExpenses = (groupId) => request(`/expenses?group_id=${groupId}`)
export const createExpense = (data) =>
  request('/expenses', { method: 'POST', body: JSON.stringify(data) })
export const deleteExpense = (id) =>
  request(`/expenses/${id}`, { method: 'DELETE' })
export const getBalances = (groupId) =>
  request(`/expenses/balances?group_id=${groupId}`)
