const express = require('express')
const router = express.Router()
const db = require('../db/database')

// ── Split calculation helpers ─────────────────────────────────────────────────

function splitEvenly(totalCents, memberIds) {
  const base = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length

  return memberIds.map((id, index) => ({
    member_id: id,
    amount_owed: (base + (index < remainder ? 1 : 0)) / 100,
  }))
}

function splitByPercent(total, members) {
  // members: [{ id, percent }]
  const percentSum = members.reduce((sum, m) => sum + m.percent, 0)
  if (Math.abs(percentSum - 100) > 0.01) {
    throw new Error('Percentages must add up to 100')
  }
  return members.map((m) => ({
    member_id: m.id,
    amount_owed: Math.round((total * m.percent) / 100 * 100) / 100,
  }))
}

function splitCustom(members) {
  // members: [{ id, amount }]
  return members.map((m) => ({
    member_id: m.id,
    amount_owed: m.amount,
  }))
}

// ── GET /api/expenses?group_id=X ─────────────────────────────────────────────
// Returns all expenses for a group
router.get('/', (req, res) => {
  const { group_id } = req.query

  if (!group_id) {
    return res.status(400).json({ error: 'group_id query param is required' })
  }

  const expenses = db
    .prepare('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at DESC')
    .all(group_id)

  const result = expenses.map((expense) => {
    const splits = db
      .prepare(`
        SELECT es.*, m.name as member_name, m.initials,
               p.id as paid_by_member_id, p.name as paid_by_name, p.initials as paid_by_initials
        FROM expense_splits es
        JOIN members m ON m.id = es.member_id
        JOIN expenses e ON e.id = es.expense_id
        JOIN members p ON p.id = e.paid_by
        WHERE es.expense_id = ?
      `)
      .all(expense.id)

    const paidByMember = db
      .prepare('SELECT * FROM members WHERE id = ?')
      .get(expense.paid_by)

    return { ...expense, splits, paidByMember }
  })

  res.json(result)
})

// ── GET /api/expenses/:id ─────────────────────────────────────────────────────
// Returns a single expense with splits
router.get('/:id', (req, res) => {
  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(req.params.id)

  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' })
  }

  const splits = db
    .prepare(`
      SELECT es.*, m.name as member_name, m.initials,
             p.id as paid_by_member_id, p.name as paid_by_name, p.initials as paid_by_initials
      FROM expense_splits es
      JOIN members m ON m.id = es.member_id
      JOIN expenses e ON e.id = es.expense_id
      JOIN members p ON p.id = e.paid_by
      WHERE es.expense_id = ?
    `)
    .all(expense.id)

  const paidByMember = db
    .prepare('SELECT * FROM members WHERE id = ?')
    .get(expense.paid_by)

  res.json({ ...expense, splits, paidByMember })
})

// ── POST /api/expenses ────────────────────────────────────────────────────────
// Creates a new expense and calculates splits
router.post('/', (req, res) => {
  const {
    group_id,
    description,
    amount,
    category = 'Other',
    paid_by,
    split_method = 'Equal',
    splits, // optional: [{ member_id, percent|amount }] for non-equal splits
  } = req.body

  // Validate required fields
  if (!group_id || !description || !amount || !paid_by) {
    return res.status(400).json({
      error: 'group_id, description, amount, and paid_by are required',
    })
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' })
  }

  // Verify group exists
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(group_id)
  if (!group) {
    return res.status(404).json({ error: 'Group not found' })
  }

  // Verify paid_by member exists in group
  const payer = db
    .prepare('SELECT * FROM members WHERE id = ? AND group_id = ?')
    .get(paid_by, group_id)
  if (!payer) {
    return res.status(404).json({ error: 'Paying member not found in this group' })
  }

  // Get all group members for equal split
  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ?')
    .all(group_id)

  if (members.length === 0) {
    return res.status(400).json({ error: 'Group has no members to split with' })
  }

  // Calculate splits
  let splitRows
  try {
    const totalCents = Math.round(amount * 100)

    if (split_method === 'Equal') {
      splitRows = splitEvenly(totalCents, members.map((m) => m.id))
    } else if (split_method === 'Percent') {
      if (!splits || splits.length === 0) {
        return res.status(400).json({ error: 'splits array required for Percent method' })
      }
      splitRows = splitByPercent(amount, splits)
    } else if (split_method === 'Custom') {
      if (!splits || splits.length === 0) {
        return res.status(400).json({ error: 'splits array required for Custom method' })
      }
      splitRows = splitCustom(splits)
    } else {
      return res.status(400).json({ error: 'split_method must be Equal, Percent, or Custom' })
    }
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  // Insert expense + splits in a transaction
  const insertExpense = db.transaction(() => {
    const expenseResult = db
      .prepare(`
        INSERT INTO expenses (group_id, description, amount, category, paid_by, split_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(group_id, description.trim(), amount, category, paid_by, split_method)

    const expenseId = expenseResult.lastInsertRowid

    const insertSplit = db.prepare(
      'INSERT INTO expense_splits (expense_id, member_id, amount_owed) VALUES (?, ?, ?)'
    )

    for (const split of splitRows) {
      insertSplit.run(expenseId, split.member_id, split.amount_owed)
    }

    return expenseId
  })

  const expenseId = insertExpense()

  // Return the full expense with splits
  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(expenseId)

  const savedSplits = db
    .prepare(`
      SELECT es.*, m.name as member_name, m.initials,
             p.id as paid_by_member_id, p.name as paid_by_name, p.initials as paid_by_initials
      FROM expense_splits es
      JOIN members m ON m.id = es.member_id
      JOIN expenses e ON e.id = es.expense_id
      JOIN members p ON p.id = e.paid_by
      WHERE es.expense_id = ?
    `)
    .all(expenseId)

  res.status(201).json({ ...expense, splits: savedSplits, paidByMember: payer })
})

// ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
// Deletes an expense (cascades to splits)
router.delete('/:id', (req, res) => {
  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(req.params.id)

  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' })
  }

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.json({ message: 'Expense deleted' })
})

// ── GET /api/expenses/balances?group_id=X ────────────────────────────────────
// Returns net balances for each member in a group
router.get('/balances', (req, res) => {
  const { group_id } = req.query

  if (!group_id) {
    return res.status(400).json({ error: 'group_id query param is required' })
  }

  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ?')
    .all(group_id)

  const balances = members.map((member) => {
    // Total this member paid
    const paid = db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = ? AND paid_by = ?')
      .get(group_id, member.id).total

    // Total this member owes across all splits
    const owes = db
      .prepare(`
        SELECT COALESCE(SUM(es.amount_owed), 0) as total
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = ? AND es.member_id = ?
      `)
      .get(group_id, member.id).total

    return {
      member_id: member.id,
      name: member.name,
      initials: member.initials,
      total_paid: paid,
      total_owes: owes,
      net_balance: paid - owes, // positive = owed money, negative = owes money
    }
  })

  res.json(balances)
})

module.exports = router
