const BASE_URL = 'http://localhost:3001/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups = () => request('/groups')
export const getGroup = (id) => request(`/groups/${id}`)
export const createGroup = (name, location) =>
  request('/groups', { method: 'POST', body: JSON.stringify({ name, location }) })
export const deleteGroup = (id) =>
  request(`/groups/${id}`, { method: 'DELETE' })

// ── Members ───────────────────────────────────────────────────────────────────
export const addMember = (groupId, name) =>
  request(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ name }),
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
