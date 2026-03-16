import { useEffect, useRef, useState } from 'react'
import * as api from './api'

const navSections = [
  {
    title: 'Core',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
      { id: 'groups', label: 'Groups', icon: 'GP' },
      { id: 'addexpense', label: 'Add Expense', icon: 'AD' },
      { id: 'scanner', label: 'Receipt Scanner', icon: 'OC' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'aichat', label: 'AI Roommate', icon: 'AI' },
      { id: 'subscriptions', label: 'Subscription Radar', icon: 'SR' },
      { id: 'goals', label: 'Goals', icon: 'GL' },
    ],
  },
  {
    title: 'Finance',
    items: [{ id: 'settle', label: 'Settle Up', icon: 'PY' }],
  },
]

const categories = [
  'Groceries', 'Dining', 'Utilities', 'Rent',
  'Travel', 'Supplies', 'Subscriptions', 'Other',
]

const emptyGroup = { id: null, name: '', location: '', members: [], totalSpend: 0 }

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function splitEvenly(total, count) {
  if (!count) return []
  const cents = Math.max(0, Math.round(total * 100))
  const base = Math.floor(cents / count)
  const remainder = cents - base * count
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100)
}

function parseAmount(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)

  // Expense form
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [splitMethod, setSplitMethod] = useState('Equal')
  const [paidBy, setPaidBy] = useState('')

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLocation, setNewGroupLocation] = useState('')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')

  // Scanner
  const [scannerStatus, setScannerStatus] = useState('idle')
  const [receiptMerchant, setReceiptMerchant] = useState('')
  const [receiptDate, setReceiptDate] = useState('')
  const [receiptItems, setReceiptItems] = useState([])

  // Settle + chat
  const [settleMethod, setSettleMethod] = useState('Venmo')
  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'assistant', text: 'Welcome to SplitStack. Create your first group to start tracking expenses, balances, and receipt scans.' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [toast, setToast] = useState('')
  const toastRef = useRef(null)

  // ── Load data ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadGroups() }, [])

  useEffect(() => {
    if (activeGroupId) {
      loadExpenses(activeGroupId)
      loadBalances(activeGroupId)
    }
  }, [activeGroupId])

  async function loadGroups() {
    try {
      setLoading(true)
      const data = await api.getGroups()
      setGroups(data)
      if (data.length > 0) setActiveGroupId(data[0].id)
    } catch {
      showToast('Cannot reach backend — make sure it is running on port 3001')
    } finally {
      setLoading(false)
    }
  }

  async function loadExpenses(groupId) {
    try { setExpenses(await api.getExpenses(groupId)) } catch { /* silent */ }
  }

  async function loadBalances(groupId) {
    try { setBalances(await api.getBalances(groupId)) } catch { /* silent */ }
  }

  // ── Groups ────────────────────────────────────────────────────────────────────
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return showToast('Group name is required')
    try {
      const group = await api.createGroup(newGroupName, newGroupLocation)
      setGroups((prev) => [group, ...prev])
      setActiveGroupId(group.id)
      setNewGroupName('')
      setNewGroupLocation('')
      setShowGroupModal(false)
      showToast(`"${group.name}" created!`)
    } catch (err) { showToast(err.message) }
  }

  async function handleDeleteGroup(id) {
    try {
      await api.deleteGroup(id)
      const updated = groups.filter((g) => g.id !== id)
      setGroups(updated)
      setActiveGroupId(updated[0]?.id ?? null)
      setExpenses([])
      setBalances([])
      showToast('Group deleted')
    } catch (err) { showToast(err.message) }
  }

  // ── Members ───────────────────────────────────────────────────────────────────
  async function handleAddMember() {
    if (!newMemberName.trim()) return showToast('Name is required')
    if (!activeGroupId) return showToast('Select a group first')
    try {
      const member = await api.addMember(activeGroupId, newMemberName)
      setGroups((prev) =>
        prev.map((g) => g.id === activeGroupId ? { ...g, members: [...g.members, member] } : g)
      )
      setNewMemberName('')
      setShowMemberModal(false)
      showToast(`${member.name} added`)
    } catch (err) { showToast(err.message) }
  }

  async function handleRemoveMember(memberId, name) {
    try {
      await api.removeMember(activeGroupId, memberId)
      setGroups((prev) =>
        prev.map((g) => g.id === activeGroupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g)
      )
      showToast(`${name} removed`)
    } catch (err) { showToast(err.message) }
  }

  // ── Expenses ──────────────────────────────────────────────────────────────────
  async function handleSaveExpense() {
    if (!activeGroupId) return showToast('Select a group first')
    if (parseAmount(amount) <= 0) return showToast('Enter a valid amount')
    if (!description.trim()) return showToast('Enter a description')
    if (!paidBy) return showToast('Select who paid')
    try {
      const expense = await api.createExpense({
        group_id: activeGroupId,
        description,
        amount: parseAmount(amount),
        category,
        paid_by: parseInt(paidBy),
        split_method: splitMethod,
      })
      setExpenses((prev) => [expense, ...prev])
      setGroups((prev) =>
        prev.map((g) => g.id === activeGroupId ? { ...g, totalSpend: (g.totalSpend || 0) + expense.amount } : g)
      )
      await loadBalances(activeGroupId)
      setAmount('')
      setDescription('')
      setPaidBy('')
      setCategory('Groceries')
      showToast('Expense saved!')
      setActiveScreen('groups')
    } catch (err) { showToast(err.message) }
  }

  async function handleDeleteExpense(id) {
    try {
      await api.deleteExpense(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      await loadBalances(activeGroupId)
      showToast('Expense deleted')
    } catch (err) { showToast(err.message) }
  }

  // ── Scanner ───────────────────────────────────────────────────────────────────
  function startReceiptScan() {
    setScannerStatus('scanning')
    showToast('Running OCR on the receipt image...')
    window.setTimeout(() => {
      setScannerStatus('idle')
      setReceiptItems([])
      showToast('Connect OCR to begin extracting receipt data.')
    }, 950)
  }

  function applyReceiptToExpense() {
    const total = receiptItems.reduce((s, i) => i.included ? s + i.price : s, 0)
    setAmount(total.toFixed(2))
    setDescription(receiptMerchant ? `${receiptMerchant} - OCR import` : '')
    setActiveScreen('addexpense')
    showToast('Receipt values copied to expense form.')
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────
  function addChatMessage(text) {
    if (!text.trim()) return
    setChatMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', text: text.trim() },
      { id: prev.length + 2, role: 'assistant', text: 'Create a group and add expenses first. Once data exists, the assistant can answer questions about balances and spending.' },
    ])
    setChatInput('')
  }

  // ── Toast ─────────────────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2500)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? emptyGroup
  const expenseSplit = splitEvenly(parseAmount(amount), activeGroup.members.length)
  const dashboardOwe = balances.filter((b) => b.net_balance < 0).reduce((s, b) => s + Math.abs(b.net_balance), 0)
  const dashboardOwed = balances.filter((b) => b.net_balance > 0).reduce((s, b) => s + b.net_balance, 0)

  const screenTitle = {
    dashboard: 'Dashboard', groups: 'Group Workspace', addexpense: 'Add Expense',
    scanner: 'Receipt Scanner', aichat: 'AI Roommate', subscriptions: 'Subscription Radar',
    goals: 'Goals and Progress', settle: 'Settle Up',
  }[activeScreen]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SS</div>
          <div>
            <div className="brand-name">SplitStack</div>
            <div className="brand-subtitle">Shared expense management</div>
          </div>
        </div>
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            <div className="nav-list">
              {section.items.map((item) => (
                <button key={item.id} className={`nav-item ${activeScreen === item.id ? 'active' : ''}`} type="button" onClick={() => setActiveScreen(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <h1>{screenTitle}</h1>
            <p>Shared ledger, group balances, receipt scanning, and AI insights.</p>
          </div>
          <div className="topbar-actions">
            <button className="primary-button" type="button" onClick={() => setShowGroupModal(true)}>+ New Group</button>
            <div className="profile-chip">
              <span className="profile-avatar">SS</span>
              <span>SplitStack</span>
            </div>
          </div>
        </header>

        <main className="screen-container">
          {loading
            ? <div className="empty-state"><strong>Connecting to backend…</strong><p>Make sure the backend is running on port 3001.</p></div>
            : <>
              {activeScreen === 'dashboard' && <DashboardScreen dashboardOwe={dashboardOwe} dashboardOwed={dashboardOwed} groups={groups} activities={expenses.slice(0, 5)} onOpenGroup={(id) => { setActiveGroupId(id); setActiveScreen('groups') }} onOpenScanner={() => setActiveScreen('scanner')} onOpenExpense={() => setActiveScreen('addexpense')} onOpenSettle={() => setActiveScreen('settle')} onNewGroup={() => setShowGroupModal(true)} />}
              {activeScreen === 'groups' && <GroupsScreen groups={groups} activeGroup={activeGroup} expenses={expenses} balances={balances} onSelectGroup={(id) => setActiveGroupId(id)} onOpenScanner={() => setActiveScreen('scanner')} onOpenSettle={() => setActiveScreen('settle')} onAddMember={() => setShowMemberModal(true)} onRemoveMember={handleRemoveMember} onDeleteExpense={handleDeleteExpense} onDeleteGroup={handleDeleteGroup} />}
              {activeScreen === 'addexpense' && <AddExpenseScreen amount={amount} description={description} category={category} categories={categories} paidBy={paidBy} splitMethod={splitMethod} activeGroup={activeGroup} expenseSplit={expenseSplit} onAmountChange={setAmount} onDescriptionChange={setDescription} onCategoryChange={setCategory} onPaidByChange={setPaidBy} onSplitMethodChange={setSplitMethod} onOpenScanner={() => setActiveScreen('scanner')} onSaveExpense={handleSaveExpense} />}
              {activeScreen === 'scanner' && <ReceiptScannerScreen activeGroup={activeGroup} scannerStatus={scannerStatus} merchant={receiptMerchant} date={receiptDate} items={receiptItems} total={receiptItems.reduce((s, i) => i.included ? s + i.price : s, 0)} split={splitEvenly(receiptItems.reduce((s, i) => i.included ? s + i.price : s, 0), activeGroup.members.length)} onScan={startReceiptScan} onReset={() => { setScannerStatus('idle'); setReceiptItems([]); showToast('Scanner reset.') }} onToggleItem={(id) => setReceiptItems((items) => items.map((i) => i.id === id ? { ...i, included: !i.included } : i))} onUpdateItem={(id, field, val) => setReceiptItems((items) => items.map((i) => i.id === id ? { ...i, [field]: field === 'price' ? parseFloat(val) || 0 : val } : i))} onApply={applyReceiptToExpense} />}
              {activeScreen === 'aichat' && <AiChatScreen messages={chatMessages} chatInput={chatInput} onInputChange={setChatInput} onSend={() => addChatMessage(chatInput)} onQuickReply={addChatMessage} />}
              {activeScreen === 'subscriptions' && <SubscriptionsScreen />}
              {activeScreen === 'goals' && <GoalsScreen />}
              {activeScreen === 'settle' && <SettleScreen activeGroup={activeGroup} balances={balances} method={settleMethod} onMethodChange={setSettleMethod} onSend={() => showToast(`Settlement request sent via ${settleMethod}.`)} />}
            </>
          }
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {showGroupModal && (
        <div className="modal-backdrop" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create a new group</h3>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="field">
                <span>Group name</span>
                <input value={newGroupName} placeholder="e.g. Apartment 4B" onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()} autoFocus />
              </label>
              <label className="field">
                <span>Location (optional)</span>
                <input value={newGroupLocation} placeholder="e.g. Los Angeles" onChange={(e) => setNewGroupLocation(e.target.value)} />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={handleCreateGroup}>Create group</button>
              <button className="secondary-button" type="button" onClick={() => setShowGroupModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-backdrop" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add a member to {activeGroup.name}</h3>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="field">
                <span>Full name</span>
                <input value={newMemberName} placeholder="e.g. Alex Johnson" onChange={(e) => setNewMemberName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMember()} autoFocus />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={handleAddMember}>Add member</button>
              <button className="secondary-button" type="button" onClick={() => setShowMemberModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardScreen({ dashboardOwe, dashboardOwed, groups, activities, onOpenGroup, onOpenScanner, onOpenExpense, onOpenSettle, onNewGroup }) {
  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Shared expense dashboard</div>
          <h2>{groups.length ? `${formatCurrency(dashboardOwe)} currently owed across your groups` : 'Set up your first group to start tracking'}</h2>
          <p>{groups.length ? 'Track balances, group summaries, and expense activity.' : 'Create a group, invite members, and start logging expenses.'}</p>
        </div>
        <div className="hero-stats">
          <StatCard label="You owe" value={formatCurrency(dashboardOwe)} tone="negative" />
          <StatCard label="Owed to you" value={formatCurrency(dashboardOwed)} tone="positive" />
          <StatCard label="Net balance" value={formatCurrency(dashboardOwed - dashboardOwe)} tone="neutral" />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div><h3>Your groups</h3><p>Group management, balances, and spend visibility.</p></div>
            <button className="primary-button" type="button" onClick={onNewGroup}>+ New group</button>
          </div>
          <div className="group-grid">
            {groups.length ? groups.map((g) => (
              <button key={g.id} className="group-card" type="button" onClick={() => onOpenGroup(g.id)}>
                <div className="group-card-top">
                  <div className="icon-tile">{g.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="group-name">{g.name}</div>
                    <div className="group-meta">{g.members.length} members{g.location ? ` — ${g.location}` : ''}</div>
                  </div>
                </div>
                <div className="member-row">
                  {g.members.slice(0, 4).map((m) => (
                    <span key={m.id} className="member-pill"><span className="mini-avatar">{m.initials}</span>{m.name}</span>
                  ))}
                </div>
                <div className="group-balance-row">
                  <span>Total spend: {formatCurrency(g.totalSpend || 0)}</span>
                </div>
              </button>
            )) : <EmptyState title="No groups yet" text="Click '+ New group' to create your first one." />}
          </div>
        </div>
        <div className="panel panel-accent">
          <div className="panel-header"><div><h3>Get started</h3><p>Add an expense or scan a receipt.</p></div></div>
          <div className="focus-card">
            <h4>Add your first expense</h4>
            <p>Enter expenses by hand or scan a receipt and review the extracted fields before saving.</p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onOpenScanner}>Scan receipt</button>
              <button className="secondary-button" type="button" onClick={onOpenExpense}>Add expense</button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><h3>Recent activity</h3><p>Latest expenses across all groups.</p></div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={onOpenExpense}>Log expense</button>
            <button className="secondary-button" type="button" onClick={onOpenSettle}>Settle balance</button>
          </div>
        </div>
        <div className="activity-list">
          {activities.length ? activities.map((e) => (
            <div key={e.id} className="activity-row">
              <div className="activity-marker positive">{e.category?.slice(0, 2).toUpperCase()}</div>
              <div className="activity-copy">
                <div className="activity-title">{e.description}</div>
                <div className="activity-detail">{e.category} · {e.paidByMember?.name || '—'} paid</div>
              </div>
              <div className="activity-amount negative">−{formatCurrency(e.amount)}</div>
            </div>
          )) : <EmptyState title="No activity yet" text="Your expense history will appear here after you log your first expense." />}
        </div>
      </section>
    </div>
  )
}

function GroupsScreen({ groups, activeGroup, expenses, balances, onSelectGroup, onOpenScanner, onOpenSettle, onAddMember, onRemoveMember, onDeleteExpense, onDeleteGroup }) {
  return (
    <div className="screen-stack">
      <section className="group-hero">
        <div>
          <div className="eyebrow">Group workspace</div>
          <h2>{activeGroup.name || 'No groups yet'}</h2>
          <p>{activeGroup.id ? 'Shared ledger, group visibility, and expense history.' : 'Create your first group to get started.'}</p>
        </div>
        <div className="hero-stats">
          <StatCard label="Members" value={activeGroup.members.length} tone="neutral" />
          <StatCard label="Expenses" value={expenses.length} tone="neutral" />
          <StatCard label="Total spend" value={formatCurrency(activeGroup.totalSpend || 0)} tone="neutral" />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header"><div><h3>Groups</h3><p>Switch between groups.</p></div></div>
          <div className="stack-list">
            {groups.length ? groups.map((g) => (
              <button key={g.id} className={`stacked-group ${g.id === activeGroup.id ? 'selected' : ''}`} type="button" onClick={() => onSelectGroup(g.id)}>
                <div><strong>{g.name}</strong><div>{g.members.length} members{g.location ? ` — ${g.location}` : ''}</div></div>
                <span>{formatCurrency(g.totalSpend || 0)}</span>
              </button>
            )) : <EmptyState title="No groups" text="Create a group using the button in the top right." />}
          </div>

          <div className="group-member-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="panel-subtitle" style={{ marginBottom: 0 }}>Members</div>
              {activeGroup.id && <button className="secondary-button" type="button" onClick={onAddMember} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>+ Add</button>}
            </div>
            <div className="member-row" style={{ flexWrap: 'wrap' }}>
              {activeGroup.members.length ? activeGroup.members.map((m) => (
                <span key={m.id} className="member-pill" style={{ cursor: 'pointer' }} title="Click to remove" onClick={() => onRemoveMember(m.id, m.name)}>
                  <span className="mini-avatar">{m.initials}</span>{m.name} ×
                </span>
              )) : <EmptyState title="No members yet" text="Add members to start splitting." compact />}
            </div>
          </div>

          {balances.length > 0 && (
            <div className="group-member-panel" style={{ marginTop: 14 }}>
              <div className="panel-subtitle">Balances</div>
              {balances.map((b) => (
                <div key={b.member_id} className="split-row">
                  <div className="member-pill"><span className="mini-avatar">{b.initials}</span>{b.name}</div>
                  <strong style={{ color: b.net_balance >= 0 ? 'var(--mint-dark)' : 'var(--coral)' }}>
                    {b.net_balance >= 0 ? `+${formatCurrency(b.net_balance)}` : formatCurrency(b.net_balance)}
                  </strong>
                </div>
              ))}
            </div>
          )}

          <div className="scanner-banner">
            <div><div className="panel-subtitle">Receipt scanner</div><strong>Scan receipts</strong><p>Extracted items can be reviewed before posting.</p></div>
            <button className="primary-button" type="button" onClick={onOpenScanner}>Open scanner</button>
          </div>

          {activeGroup.id && (
            <button className="secondary-button" type="button" style={{ color: 'var(--coral)', marginTop: 8 }} onClick={() => onDeleteGroup(activeGroup.id)}>
              Delete this group
            </button>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div><h3>Expense history</h3><p>Chronological ledger for this group.</p></div>
            <button className="secondary-button" type="button" onClick={onOpenSettle}>Settle balance</button>
          </div>
          <div className="expense-list">
            {expenses.length ? expenses.map((e) => (
              <div key={e.id} className="expense-row">
                <div className="expense-icon mint">{e.category?.slice(0, 2).toUpperCase()}</div>
                <div className="expense-copy">
                  <div className="expense-name">{e.description}</div>
                  <div className="expense-detail">{e.category} · paid by {e.paidByMember?.name || '—'}</div>
                </div>
                <div className="expense-amount-box">
                  <div className="expense-total">{formatCurrency(e.amount)}</div>
                  <button type="button" onClick={() => onDeleteExpense(e.id)} style={{ fontSize: '0.75rem', color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>
            )) : <EmptyState title="No expenses yet" text="Add an expense to see it here." />}
          </div>
        </div>
      </section>
    </div>
  )
}

function AddExpenseScreen({ amount, description, category, categories, paidBy, splitMethod, activeGroup, expenseSplit, onAmountChange, onDescriptionChange, onCategoryChange, onPaidByChange, onSplitMethodChange, onOpenScanner, onSaveExpense }) {
  return (
    <div className="screen-stack narrow-stack">
      <section className="panel">
        <div className="panel-header"><div><h3>Log an expense</h3><p>Add shared costs manually or use the scanner.</p></div></div>
        <div className="form-grid">
          <label className="field"><span>Amount paid</span><input value={amount} placeholder="0.00" onChange={(e) => onAmountChange(e.target.value)} /></label>
          <label className="field">
            <span>Paid by</span>
            <select value={paidBy} onChange={(e) => onPaidByChange(e.target.value)}>
              <option value="">Select member</option>
              {activeGroup.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field full-width"><span>Description</span><input value={description} placeholder="e.g. Grocery run" onChange={(e) => onDescriptionChange(e.target.value)} /></label>
          <label className="field"><span>Group</span><input value={activeGroup.name || ''} placeholder="Select a group first" readOnly /></label>
          <label className="field">
            <span>Split method</span>
            <select value={splitMethod} onChange={(e) => onSplitMethodChange(e.target.value)}>
              <option>Equal</option><option>Percent</option><option>Custom</option>
            </select>
          </label>
        </div>
        <div className="category-grid">
          {categories.map((item) => <button key={item} className={`category-chip ${item === category ? 'selected' : ''}`} type="button" onClick={() => onCategoryChange(item)}>{item}</button>)}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header"><div><h3>Split preview</h3><p>Equal split across all members.</p></div></div>
          <div className="split-list">
            {activeGroup.members.length ? activeGroup.members.map((m, i) => (
              <div key={m.id} className="split-row">
                <div className="member-pill"><span className="mini-avatar">{m.initials}</span>{m.name}</div>
                <strong>{formatCurrency(expenseSplit[i] ?? 0)}</strong>
              </div>
            )) : <EmptyState title="No split preview" text="Create a group and add members first." />}
          </div>
        </div>
        <div className="panel panel-accent">
          <div className="panel-header"><div><h3>Save or scan</h3><p>Review before saving.</p></div></div>
          <div className="focus-card">
            <h4>Ready to save?</h4>
            <p>Make sure a group is selected and all fields are filled before saving.</p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onSaveExpense}>Save expense</button>
              <button className="secondary-button" type="button" onClick={onOpenScanner}>Scan receipt</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ReceiptScannerScreen({ activeGroup, scannerStatus, merchant, date, items, total, split, onScan, onReset, onToggleItem, onUpdateItem, onApply }) {
  return (
    <div className="screen-stack">
      <section className="dashboard-grid">
        <div className="panel panel-dark">
          <div className="panel-header"><div><h3>Receipt scanner</h3><p>Upload a receipt and review extracted line items.</p></div></div>
          <div className={`scanner-stage ${scannerStatus}`}>
            <div className="scanner-frame"><div className="scanner-overlay" /></div>
            <div className="scanner-copy">
              <strong>{scannerStatus === 'scanning' ? 'Reading receipt...' : 'Ready for a new image'}</strong>
              <p>No receipt has been processed yet.</p>
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onScan}>Start scan</button>
              <button className="secondary-button" type="button" onClick={onReset}>Reset</button>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><div><h3>Extracted receipt</h3><p>Review and correct before creating the expense.</p></div></div>
          <div className="receipt-summary">
            <div><span className="panel-subtitle">Merchant</span><strong>{merchant || 'Not available yet'}</strong></div>
            <div><span className="panel-subtitle">Date</span><strong>{date || 'Not available yet'}</strong></div>
            <div><span className="panel-subtitle">Members</span><strong>{activeGroup.members.length} split targets</strong></div>
          </div>
          <div className="receipt-list">
            {items.length ? items.map((item) => (
              <div key={item.id} className={`receipt-row ${item.included ? '' : 'muted'}`}>
                <label className="receipt-toggle"><input checked={item.included} type="checkbox" onChange={() => onToggleItem(item.id)} /><span /></label>
                <input className="receipt-input" value={item.name} onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)} />
                <input className="receipt-input price" value={item.price.toFixed(2)} onChange={(e) => onUpdateItem(item.id, 'price', e.target.value)} />
              </div>
            )) : <EmptyState title="No extracted receipt yet" text="Receipt fields will appear after a successful scan." />}
          </div>
          <div className="receipt-footer">
            <div><span className="panel-subtitle">Receipt total</span><div className="receipt-total">{formatCurrency(total)}</div></div>
            <button className="primary-button" type="button" onClick={onApply}>Apply to expense form</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AiChatScreen({ messages, chatInput, onInputChange, onSend, onQuickReply }) {
  return (
    <div className="screen-stack narrow-stack">
      <section className="chat-shell">
        <div className="chat-shell-header">
          <div><div className="eyebrow">AI roommate</div><h2>Ask about balances, trends, and savings</h2></div>
          <div className="online-chip">Live group context</div>
        </div>
        <div className="chat-history">
          {messages.map((m) => <div key={m.id} className={`chat-row ${m.role}`}><div className="chat-bubble">{m.text}</div></div>)}
        </div>
        <div className="chat-input-row">
          <input value={chatInput} placeholder="Ask Stacky about your finances..." onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSend()} />
          <button className="primary-button" type="button" onClick={onSend}>Send</button>
        </div>
      </section>
    </div>
  )
}

function SubscriptionsScreen() {
  return (
    <div className="screen-stack">
      <section className="panel">
        <div className="panel-header"><div><h3>Subscription radar</h3><p>Recurring spend and consolidation opportunities.</p></div></div>
        <EmptyState title="No subscription insights yet" text="Recommendations will appear after recurring expenses are added." />
      </section>
    </div>
  )
}

function GoalsScreen() {
  return (
    <div className="screen-stack">
      <section className="panel">
        <div className="panel-header"><div><h3>Goals and progress</h3></div><div className="streak-badge">No progress yet</div></div>
        <EmptyState title="No goals yet" text="Goals will appear after you start tracking expenses." />
      </section>
      <section className="panel">
        <div className="panel-header"><div><h3>Active challenges</h3></div></div>
        <EmptyState title="No challenges yet" text="Challenges unlock once your account has expense history." />
      </section>
    </div>
  )
}

function SettleScreen({ activeGroup, balances, method, onMethodChange, onSend }) {
  const methods = ['Venmo', 'Apple Pay', 'Zelle', 'SplitStack Balance']
  const negativeBalances = balances.filter((b) => b.net_balance < 0)
  return (
    <div className="screen-stack narrow-stack">
      <section className="settle-card">
        <div className="eyebrow">Settle outstanding balance</div>
        <h2>{negativeBalances.length ? `${negativeBalances.length} outstanding balance(s)` : 'No balances to settle yet'}</h2>
        <p>Outstanding balances appear here when money is owed.</p>
        <div className="settle-breakdown">
          {negativeBalances.length ? negativeBalances.map((b) => (
            <div key={b.member_id} className="settle-row">
              <span>{b.name} owes</span>
              <strong>{formatCurrency(Math.abs(b.net_balance))}</strong>
            </div>
          )) : <EmptyState title="Nothing to settle" text="Settlement options will appear after expenses create a balance." />}
        </div>
        <div className="payment-grid">
          {methods.map((item) => <button key={item} className={`payment-method ${item === method ? 'selected' : ''}`} type="button" onClick={() => onMethodChange(item)}>{item}</button>)}
        </div>
        <button className="primary-button large" type="button" onClick={onSend}>Send via {method}</button>
      </section>
    </div>
  )
}

function EmptyState({ title, text, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong><p>{text}</p>
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span><strong>{value}</strong>
    </div>
  )
}
