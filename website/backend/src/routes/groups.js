const express = require('express')
const router = express.Router()
const db = require('../db/database')

// ── GET /api/groups ──────────────────────────────────────────────────────────
// Returns all groups with their members
router.get('/', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all()

  const result = groups.map((group) => {
    const members = db
      .prepare('SELECT * FROM members WHERE group_id = ?')
      .all(group.id)

    // Calculate balances for this group
    const expenses = db
      .prepare('SELECT * FROM expenses WHERE group_id = ?')
      .all(group.id)

    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0)

    return { ...group, members, totalSpend }
  })

  res.json(result)
})

// ── GET /api/groups/:id ──────────────────────────────────────────────────────
// Returns a single group with members and expenses
router.get('/:id', (req, res) => {
  const group = db
    .prepare('SELECT * FROM groups WHERE id = ?')
    .get(req.params.id)

  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }

  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ?')
    .all(group.id)

  const expenses = db
    .prepare('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at DESC')
    .all(group.id)

  // Attach splits to each expense
  const expensesWithSplits = expenses.map((expense) => {
    const splits = db
      .prepare(`
        SELECT es.*, m.name as member_name, m.initials
        FROM expense_splits es
        JOIN members m ON m.id = es.member_id
        WHERE es.expense_id = ?
      `)
      .all(expense.id)
    return { ...expense, splits }
  })

  res.json({ ...group, members, expenses: expensesWithSplits })
})

// ── POST /api/groups ─────────────────────────────────────────────────────────
// Creates a new group
router.post('/', (req, res) => {
  const { name, location } = req.body

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Group name is required' })
  }

  const result = db
    .prepare('INSERT INTO groups (name, location) VALUES (?, ?)')
    .run(name.trim(), location?.trim() || '')

  const group = db
    .prepare('SELECT * FROM groups WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json({ ...group, members: [], totalSpend: 0 })
})

// ── POST /api/groups/:id/members ─────────────────────────────────────────────
// Adds a member to a group
router.post('/:id/members', (req, res) => {
  const { name } = req.body

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Member name is required' })
  }

  const group = db
    .prepare('SELECT * FROM groups WHERE id = ?')
    .get(req.params.id)

  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }

  // Auto-generate initials from name
  const initials = name
    .trim()
    .split(' ')
    .map((word) => word[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('')

  const result = db
    .prepare('INSERT INTO members (group_id, name, initials) VALUES (?, ?, ?)')
    .run(req.params.id, name.trim(), initials)

  const member = db
    .prepare('SELECT * FROM members WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json(member)
})

// ── DELETE /api/groups/:id ───────────────────────────────────────────────────
// Deletes a group (cascades to members, expenses, splits)
router.delete('/:id', (req, res) => {
  const group = db
    .prepare('SELECT * FROM groups WHERE id = ?')
    .get(req.params.id)

  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }

  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id)
  res.json({ message: 'Group deleted' })
})

// ── DELETE /api/groups/:id/members/:memberId ─────────────────────────────────
// Removes a member from a group
router.delete('/:id/members/:memberId', (req, res) => {
  const member = db
    .prepare('SELECT * FROM members WHERE id = ? AND group_id = ?')
    .get(req.params.memberId, req.params.id)

  if (!member) {
    return res.status(404).json({ error: 'Member not found' })
  }

  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.memberId)
  res.json({ message: 'Member removed' })
})

module.exports = router
