import { useRef, useState } from 'react'

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
  'Groceries',
  'Dining',
  'Utilities',
  'Rent',
  'Travel',
  'Supplies',
  'Subscriptions',
  'Other',
]

const groupList = []
const recentActivity = []
const expenseHistory = []
const subscriptionAlerts = []
const goalCards = []
const challengeCards = []
const receiptTemplate = []
const cannedAnswers = {}

const emptyGroup = {
  id: 'new-group',
  name: '',
  location: '',
  members: [],
  youOwe: 0,
  owedToYou: 0,
  totalSpend: 0,
  lastScan: '',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function splitEvenly(total, count) {
  if (!count) {
    return []
  }

  const cents = Math.max(0, Math.round(total * 100))
  const base = Math.floor(cents / count)
  const remainder = cents - base * count

  return Array.from({ length: count }, (_, index) => {
    const amount = base + (index < remainder ? 1 : 0)
    return amount / 100
  })
}

function parseAmount(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [activeGroupId, setActiveGroupId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [splitMethod, setSplitMethod] = useState('Equal')
  const [paidBy, setPaidBy] = useState('')
  const [scannerStatus, setScannerStatus] = useState('idle')
  const [receiptMerchant, setReceiptMerchant] = useState('')
  const [receiptDate, setReceiptDate] = useState('')
  const [receiptItems, setReceiptItems] = useState(receiptTemplate)
  const [settleMethod, setSettleMethod] = useState('Venmo')
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text:
        'Welcome to SplitStack. Create your first group to start tracking expenses, balances, and receipt scans.',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [toast, setToast] = useState('')
  const toastTimeoutRef = useRef(null)

  const activeGroup =
    groupList.find((group) => group.id === activeGroupId) ?? emptyGroup
  const expenseTotal = parseAmount(amount)
  const expenseSplit = splitEvenly(expenseTotal, activeGroup.members.length)
  const receiptTotal = receiptItems.reduce((sum, item) => {
    return item.included ? sum + item.price : sum
  }, 0)
  const receiptSplit = splitEvenly(receiptTotal, activeGroup.members.length)
  const dashboardOwe = groupList.reduce((sum, group) => sum + group.youOwe, 0)
  const dashboardOwed = groupList.reduce((sum, group) => sum + group.owedToYou, 0)

  function showToast(message) {
    setToast(message)

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast('')
      toastTimeoutRef.current = null
    }, 2500)
  }

  function openScreen(screenId) {
    setActiveScreen(screenId)
  }

  function selectGroup(groupId) {
    setActiveGroupId(groupId)
  }

  function startReceiptScan() {
    setScannerStatus('scanning')
    showToast('Running OCR on the receipt image...')

    window.setTimeout(() => {
      setScannerStatus('idle')
      setReceiptMerchant('')
      setReceiptDate('')
      setReceiptItems([])
      showToast('Connect OCR to begin extracting receipt data.')
    }, 950)
  }

  function resetReceipt() {
    setScannerStatus('idle')
    setReceiptMerchant('')
    setReceiptDate('')
    setReceiptItems([])
    showToast('Scanner reset for a new upload.')
  }

  function toggleReceiptItem(itemId) {
    setReceiptItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, included: !item.included } : item,
      ),
    )
  }

  function updateReceiptItem(itemId, field, value) {
    setReceiptItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        return {
          ...item,
          [field]:
            field === 'price' ? Number.parseFloat(value || '0') || 0 : value,
        }
      }),
    )
  }

  function applyReceiptToExpense() {
    setAmount(receiptTotal.toFixed(2))
    setDescription(receiptMerchant ? `${receiptMerchant} - OCR import` : '')
    setActiveScreen('addexpense')
    showToast('Receipt values copied into the expense form.')
  }

  function addChatMessage(text) {
    const prompt = text.trim()

    if (!prompt) {
      return
    }

    const assistantReply =
      cannedAnswers[prompt] ??
      'Create a group and add expenses first. Once account data exists, the assistant can answer questions about balances and spending.'

    setChatMessages((currentMessages) => [
      ...currentMessages,
      { id: currentMessages.length + 1, role: 'user', text: prompt },
      {
        id: currentMessages.length + 2,
        role: 'assistant',
        text: assistantReply,
      },
    ])
    setChatInput('')
  }

  const screenTitle = {
    dashboard: 'Dashboard',
    groups: 'Group Workspace',
    addexpense: 'Add Expense',
    scanner: 'Receipt Scanner',
    aichat: 'AI Roommate',
    subscriptions: 'Subscription Radar',
    goals: 'Goals and Progress',
    settle: 'Settle Up',
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
                <button
                  key={item.id}
                  className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => openScreen(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
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
            <p>
              Shared ledger, group balances, receipt scanning, notifications, and
              AI insight surfaces aligned to the requirements docs.
            </p>
          </div>
          <div className="topbar-actions">
            <div className="profile-chip">
              <span className="profile-avatar">NL</span>
              <span>New account</span>
            </div>
          </div>
        </header>

        <main className="screen-container">
          {activeScreen === 'dashboard' ? (
            <DashboardScreen
              dashboardOwe={dashboardOwe}
              dashboardOwed={dashboardOwed}
              groups={groupList}
              activities={recentActivity}
              onOpenGroup={(groupId) => {
                selectGroup(groupId)
                openScreen('groups')
              }}
              onOpenScanner={() => openScreen('scanner')}
              onOpenExpense={() => openScreen('addexpense')}
              onOpenSettle={() => openScreen('settle')}
            />
          ) : null}

          {activeScreen === 'groups' ? (
            <GroupsScreen
              groups={groupList}
              activeGroup={activeGroup}
              expenses={expenseHistory}
              onSelectGroup={selectGroup}
              onOpenScanner={() => openScreen('scanner')}
              onOpenSettle={() => openScreen('settle')}
            />
          ) : null}

          {activeScreen === 'addexpense' ? (
            <AddExpenseScreen
              amount={amount}
              description={description}
              category={category}
              categories={categories}
              paidBy={paidBy}
              splitMethod={splitMethod}
              activeGroup={activeGroup}
              expenseSplit={expenseSplit}
              onAmountChange={setAmount}
              onDescriptionChange={setDescription}
              onCategoryChange={setCategory}
              onPaidByChange={setPaidBy}
              onSplitMethodChange={setSplitMethod}
              onOpenScanner={() => openScreen('scanner')}
              onSaveExpense={() => showToast(`Expense saved and split across ${activeGroup.members.length} members.`)}
            />
          ) : null}

          {activeScreen === 'scanner' ? (
            <ReceiptScannerScreen
              activeGroup={activeGroup}
              scannerStatus={scannerStatus}
              merchant={receiptMerchant}
              date={receiptDate}
              items={receiptItems}
              total={receiptTotal}
              split={receiptSplit}
              onScan={startReceiptScan}
              onReset={resetReceipt}
              onToggleItem={toggleReceiptItem}
              onUpdateItem={updateReceiptItem}
              onApply={applyReceiptToExpense}
            />
          ) : null}

          {activeScreen === 'aichat' ? (
            <AiChatScreen
              messages={chatMessages}
              chatInput={chatInput}
              onInputChange={setChatInput}
              onSend={() => addChatMessage(chatInput)}
              onQuickReply={addChatMessage}
            />
          ) : null}

          {activeScreen === 'subscriptions' ? (
            <SubscriptionsScreen
              alerts={subscriptionAlerts}
              onAction={(title) => showToast(`${title} action queued for the group.`)}
            />
          ) : null}

          {activeScreen === 'goals' ? (
            <GoalsScreen goals={goalCards} challenges={challengeCards} />
          ) : null}

          {activeScreen === 'settle' ? (
            <SettleScreen
              activeGroup={activeGroup}
              method={settleMethod}
              onMethodChange={setSettleMethod}
              onSend={() => showToast(`Settlement request sent through ${settleMethod}.`)}
            />
          ) : null}
        </main>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function DashboardScreen({
  dashboardOwe,
  dashboardOwed,
  groups,
  activities,
  onOpenGroup,
  onOpenScanner,
  onOpenExpense,
  onOpenSettle,
}) {
  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Shared expense dashboard</div>
          <h2>
            {groups.length
              ? `${formatCurrency(dashboardOwe)} currently owed across your groups`
              : 'Set up your first group to start tracking shared expenses'}
          </h2>
          <p>
            {groups.length
              ? 'Track balances, group summaries, expense activity, and receipt uploads from one place.'
              : 'Create a group, invite members, and start logging expenses or scanning receipts.'}
          </p>
        </div>
        <div className="hero-stats">
          <StatCard label="You owe" value={formatCurrency(dashboardOwe)} tone="negative" />
          <StatCard label="Owed to you" value={formatCurrency(dashboardOwed)} tone="positive" />
          <StatCard
            label="Net balance"
            value={formatCurrency(dashboardOwed - dashboardOwe)}
            tone="neutral"
          />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Your groups</h3>
              <p>Group management, balances, and spend visibility.</p>
            </div>
          </div>
          <div className="group-grid">
            {groups.length ? groups.map((group) => (
              <button
                key={group.id}
                className="group-card"
                type="button"
                onClick={() => onOpenGroup(group.id)}
              >
                <div className="group-card-top">
                  <div className="icon-tile">{group.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="group-name">{group.name}</div>
                    <div className="group-meta">
                      {group.members.length} members - {group.location}
                    </div>
                  </div>
                </div>
                <div className="member-row">
                  {group.members.slice(0, 4).map((member) => (
                    <span key={member.id} className="member-pill">
                      <span className="mini-avatar">{member.initials}</span>
                      {member.name}
                    </span>
                  ))}
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min(95, 35 + group.members.length * 12)}%` }} />
                </div>
                <div className="group-balance-row">
                  <span>Total spend: {formatCurrency(group.totalSpend)}</span>
                  <strong>
                    {group.youOwe > 0
                      ? `You owe ${formatCurrency(group.youOwe)}`
                      : `You are owed ${formatCurrency(group.owedToYou)}`}
                  </strong>
                </div>
              </button>
            )) : <EmptyState title="No groups yet" text="Create your first group to start splitting expenses." />}
          </div>
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <div>
              <h3>Get started</h3>
              <p>Add an expense manually or scan a receipt.</p>
            </div>
          </div>
          <div className="focus-card">
            <h4>Add your first expense</h4>
            <p>
              You can enter expenses by hand or scan a receipt and review the extracted fields before saving.
            </p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onOpenScanner}>
                Scan receipt
              </button>
              <button className="secondary-button" type="button" onClick={onOpenExpense}>
                Add expense
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent activity</h3>
            <p>Chronological group expense history from the MVP requirements.</p>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={onOpenExpense}>
              Log expense
            </button>
            <button className="secondary-button" type="button" onClick={onOpenSettle}>
              Settle balance
            </button>
          </div>
        </div>
        <div className="activity-list">
          {activities.length ? activities.map((activity) => (
            <div key={activity.id} className="activity-row">
              <div className={`activity-marker ${activity.accent}`}>{activity.title.slice(0, 2).toUpperCase()}</div>
              <div className="activity-copy">
                <div className="activity-title">{activity.title}</div>
                <div className="activity-detail">{activity.detail}</div>
              </div>
              <div className={`activity-amount ${activity.accent}`}>
                {activity.amount > 0 ? '+' : '-'}
                {formatCurrency(Math.abs(activity.amount))}
              </div>
            </div>
          )) : <EmptyState title="No activity yet" text="Your expense history will appear here after you create a group and log your first expense." />}
        </div>
      </section>
    </div>
  )
}

function GroupsScreen({ groups, activeGroup, expenses, onSelectGroup, onOpenScanner, onOpenSettle }) {
  const hasGroups = groups.length > 0
  return (
    <div className="screen-stack">
      <section className="group-hero">
        <div>
          <div className="eyebrow">Group workspace</div>
          <h2>{hasGroups ? activeGroup.name : 'No groups yet'}</h2>
          <p>
            {hasGroups
              ? 'Deterministic shared ledger, group visibility, and shared expense history are all surfaced here.'
              : 'Create your first group to unlock shared balances, expense history, and member management.'}
          </p>
        </div>
        <div className="hero-stats">
          <StatCard label="You owe" value={formatCurrency(activeGroup.youOwe)} tone="negative" />
          <StatCard label="Owed to you" value={formatCurrency(activeGroup.owedToYou)} tone="positive" />
          <StatCard label="Total spend" value={formatCurrency(activeGroup.totalSpend)} tone="neutral" />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Groups</h3>
              <p>Switch context without leaving the workspace.</p>
            </div>
          </div>
          <div className="stack-list">
            {hasGroups ? groups.map((group) => (
              <button
                key={group.id}
                className={`stacked-group ${group.id === activeGroup.id ? 'selected' : ''}`}
                type="button"
                onClick={() => onSelectGroup(group.id)}
              >
                <div>
                  <strong>{group.name}</strong>
                  <div>{group.members.length} members - {group.location}</div>
                </div>
                <span>{formatCurrency(group.totalSpend)}</span>
              </button>
            )) : <EmptyState title="No groups created" text="Once you create a group, it will appear here." />}
          </div>

          <div className="group-member-panel">
            <div className="panel-subtitle">Members</div>
            <div className="member-row">
              {activeGroup.members.length ? activeGroup.members.map((member) => (
                <span key={member.id} className="member-pill">
                  <span className="mini-avatar">{member.initials}</span>
                  {member.name}
                </span>
              )) : <EmptyState title="No members yet" text="Invite people after creating a group." compact />}
            </div>
          </div>

          <div className="scanner-banner">
            <div>
              <div className="panel-subtitle">Receipt scanner</div>
              <strong>Scan receipts</strong>
              <p>
                {hasGroups
                  ? 'Extracted items can be corrected before posting.'
                  : 'Create a group before attaching scanned receipts to shared expenses.'}
              </p>
            </div>
            <button className="primary-button" type="button" onClick={onOpenScanner}>
              Open scanner
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Expense history</h3>
              <p>Chronological ledger view for the currently selected group.</p>
            </div>
            <button className="secondary-button" type="button" onClick={onOpenSettle}>
              Settle outstanding balance
            </button>
          </div>
          <div className="expense-list">
            {expenses.length ? expenses.map((expense) => (
              <div key={expense.id} className="expense-row">
                <div className={`expense-icon ${expense.categoryClass}`}>{expense.category}</div>
                <div className="expense-copy">
                  <div className="expense-name">{expense.name}</div>
                  <div className="expense-detail">{expense.detail}</div>
                </div>
                <div className="expense-amount-box">
                  <div className="expense-total">{formatCurrency(expense.total)}</div>
                  <div className={`expense-balance ${expense.balanceClass}`}>{expense.balanceLabel}</div>
                </div>
              </div>
            )) : <EmptyState title="No expense history yet" text="Logged expenses will appear here." />}
          </div>
        </div>
      </section>
    </div>
  )
}

function AddExpenseScreen({
  amount,
  description,
  category,
  categories,
  paidBy,
  splitMethod,
  activeGroup,
  expenseSplit,
  onAmountChange,
  onDescriptionChange,
  onCategoryChange,
  onPaidByChange,
  onSplitMethodChange,
  onOpenScanner,
  onSaveExpense,
}) {
  return (
    <div className="screen-stack narrow-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Log an expense</h3>
            <p>Add shared costs manually or use the scanner to pull details from a receipt.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Amount paid</span>
            <input value={amount} onChange={(event) => onAmountChange(event.target.value)} />
          </label>

          <label className="field">
            <span>Paid by</span>
            <select value={paidBy} onChange={(event) => onPaidByChange(event.target.value)}>
              <option value="">Select member</option>
              {activeGroup.members.map((member) => (
                <option key={member.id} value={member.name}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field full-width">
            <span>Description</span>
            <input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Group</span>
            <input value={activeGroup.name} placeholder="Create a group first" readOnly />
          </label>

          <label className="field">
            <span>Split method</span>
            <select
              value={splitMethod}
              onChange={(event) => onSplitMethodChange(event.target.value)}
            >
              <option>Equal</option>
              <option>Percent</option>
              <option>Custom</option>
            </select>
          </label>
        </div>

        <div className="category-grid">
          {categories.map((item) => (
            <button
              key={item}
              className={`category-chip ${item === category ? 'selected' : ''}`}
              type="button"
              onClick={() => onCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Split preview</h3>
              <p>Balances update immediately from the equal split view.</p>
            </div>
          </div>
          <div className="split-list">
            {activeGroup.members.length ? activeGroup.members.map((member, index) => (
              <div key={member.id} className="split-row">
                <div className="member-pill">
                  <span className="mini-avatar">{member.initials}</span>
                  {member.name}
                </div>
                <strong>{formatCurrency(expenseSplit[index] ?? 0)}</strong>
              </div>
            )) : <EmptyState title="No split to preview" text="Create a group and add members to calculate shares." />}
          </div>
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <div>
              <h3>Scan a receipt</h3>
              <p>Use the scanner when you want to pull details from a receipt image.</p>
            </div>
          </div>
          <div className="focus-card">
            <h4>Capture receipt details</h4>
            <p>
              Review extracted receipt data before it is applied to the expense form or saved into the shared ledger.
            </p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onOpenScanner}>
                Scan receipt
              </button>
              <button className="secondary-button" type="button" onClick={onSaveExpense}>
                Save expense
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ReceiptScannerScreen({
  activeGroup,
  scannerStatus,
  merchant,
  date,
  items,
  total,
  split,
  onScan,
  onReset,
  onToggleItem,
  onUpdateItem,
  onApply,
}) {
  return (
    <div className="screen-stack">
      <section className="dashboard-grid">
        <div className="panel panel-dark">
          <div className="panel-header">
            <div>
              <h3>Receipt scanner</h3>
              <p>
                Upload a receipt and review extracted line items before posting them
                to a shared expense.
              </p>
            </div>
          </div>

          <div className={`scanner-stage ${scannerStatus}`}>
            <div className="scanner-frame">
              <div className="scanner-overlay" />
            </div>
            <div className="scanner-copy">
              <strong>
                {scannerStatus === 'scanning'
                  ? 'Reading receipt...'
                  : scannerStatus === 'idle'
                    ? 'Ready for a new image'
                    : 'OCR results ready'}
              </strong>
              <p>
                {scannerStatus === 'ready'
                  ? 'Merchant, total, date, and editable line items are available below.'
                  : 'No receipt has been processed yet.'}
              </p>
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={onScan}>
                Start scan
              </button>
              <button className="secondary-button" type="button" onClick={onReset}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Extracted receipt</h3>
              <p>Review and correct the OCR output before creating the expense.</p>
            </div>
          </div>

          <div className="receipt-summary">
            <div>
              <span className="panel-subtitle">Merchant</span>
              <strong>{merchant || 'Not available yet'}</strong>
            </div>
            <div>
              <span className="panel-subtitle">Date</span>
              <strong>{date || 'Not available yet'}</strong>
            </div>
            <div>
              <span className="panel-subtitle">Members</span>
              <strong>{activeGroup.members.length || 0} split targets</strong>
            </div>
          </div>

          <div className="receipt-list">
            {items.length ? items.map((item) => (
              <div key={item.id} className={`receipt-row ${item.included ? '' : 'muted'}`}>
                <label className="receipt-toggle">
                  <input
                    checked={item.included}
                    type="checkbox"
                    onChange={() => onToggleItem(item.id)}
                  />
                  <span />
                </label>
                <input
                  className="receipt-input"
                  value={item.name}
                  onChange={(event) => onUpdateItem(item.id, 'name', event.target.value)}
                />
                <input
                  className="receipt-input price"
                  value={item.price.toFixed(2)}
                  onChange={(event) => onUpdateItem(item.id, 'price', event.target.value)}
                />
              </div>
            )) : <EmptyState title="No extracted receipt yet" text="Receipt fields will appear here after a successful scan." />}
          </div>

          <div className="receipt-footer">
            <div>
              <span className="panel-subtitle">Receipt total</span>
              <div className="receipt-total">{formatCurrency(total)}</div>
            </div>
            <div className="receipt-split">
              {activeGroup.members.map((member, index) => (
                <div key={member.id} className="split-chip">
                  <span>{member.initials}</span>
                  <strong>{formatCurrency(split[index] ?? 0)}</strong>
                </div>
              ))}
            </div>
            <button className="primary-button" type="button" onClick={onApply}>
              Apply to expense form
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AiChatScreen({ messages, chatInput, onInputChange, onSend, onQuickReply }) {
  const prompts = []

  return (
    <div className="screen-stack narrow-stack">
      <section className="chat-shell">
        <div className="chat-shell-header">
          <div>
            <div className="eyebrow">AI roommate</div>
            <h2>Ask about balances, trends, and savings opportunities</h2>
          </div>
          <div className="online-chip">Live group context</div>
        </div>

        <div className="chat-history">
          {messages.map((message) => (
            <div key={message.id} className={`chat-row ${message.role}`}>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
        </div>

        <div className="quick-reply-row">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              className="quick-reply"
              type="button"
              onClick={() => onQuickReply(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            value={chatInput}
            placeholder="Ask Stacky about your finances..."
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSend()
              }
            }}
          />
          <button className="primary-button" type="button" onClick={onSend}>
            Send
          </button>
        </div>
      </section>
    </div>
  )
}

function SubscriptionsScreen({ alerts, onAction }) {
  return (
    <div className="screen-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Subscription radar</h3>
            <p>Recurring spend review and obvious consolidation opportunities.</p>
          </div>
          <div className="total-savings">No alerts yet</div>
        </div>

        <div className="alert-list">
          {alerts.length ? alerts.map((alert) => (
            <div key={alert.id} className="alert-card">
              <div>
                <div className="panel-subtitle">Recommendation</div>
                <h4>{alert.title}</h4>
                <p>{alert.summary}</p>
              </div>
              <div className="alert-actions">
                <span className="savings-pill">{alert.savings}</span>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onAction(alert.title)}
                >
                  Queue action
                </button>
              </div>
            </div>
          )) : <EmptyState title="No subscription insights yet" text="Recommendations will appear after recurring expenses are added." />}
        </div>
      </section>
    </div>
  )
}

function GoalsScreen({ goals, challenges }) {
  return (
    <div className="screen-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Goals and progress</h3>
            <p>Gamified retention ideas from the project materials, adapted into the web shell.</p>
          </div>
          <div className="streak-badge">No progress yet</div>
        </div>

        <div className="goal-grid">
          {goals.length ? goals.map((goal) => (
            <div key={goal.id} className="goal-card">
              <div
                className="goal-ring"
                style={{
                  background: `conic-gradient(var(--mint) ${goal.progress}%, rgba(255,255,255,0.1) 0)`,
                }}
              >
                <div className="goal-ring-center">{goal.progress}%</div>
              </div>
              <strong>{goal.label}</strong>
              <span>{goal.value}</span>
            </div>
          )) : <EmptyState title="No goals yet" text="Goals and savings targets will appear after you start using the app." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Active challenges</h3>
            <p>Badges and streaks stay secondary to the main expense workflows.</p>
          </div>
        </div>

        <div className="challenge-list">
          {challenges.length ? challenges.map((challenge) => (
            <div key={challenge.id} className="challenge-row">
              <div>
                <strong>{challenge.title}</strong>
                <p>{challenge.detail}</p>
              </div>
              <div className="challenge-side">
                <span className="status-pill">{challenge.status}</span>
                <div className="progress-bar slim">
                  <span style={{ width: `${challenge.progress}%` }} />
                </div>
              </div>
            </div>
          )) : <EmptyState title="No challenges yet" text="Challenges unlock once your account has expense history." />}
        </div>
      </section>
    </div>
  )
}

function SettleScreen({ activeGroup, method, onMethodChange, onSend }) {
  const methods = ['Venmo', 'Apple Pay', 'Zelle', 'SplitStack Balance']

  return (
    <div className="screen-stack narrow-stack">
      <section className="settle-card">
        <div className="eyebrow">Settle outstanding balance</div>
        <h2>
          {activeGroup.youOwe
            ? `${formatCurrency(activeGroup.youOwe)} ready to settle`
            : 'No balances to settle yet'}
        </h2>
        <p>
          Add expenses and group members first. Outstanding balances will appear here when money is owed.
        </p>

        <div className="settle-breakdown">
          {activeGroup.youOwe ? (
            <div className="settle-row">
              <span>Outstanding balance</span>
              <strong>{formatCurrency(activeGroup.youOwe)}</strong>
            </div>
          ) : (
            <EmptyState title="Nothing to settle" text="Settlement options will appear after expenses create a balance." />
          )}
        </div>

        <div className="payment-grid">
          {methods.map((item) => (
            <button
              key={item}
              className={`payment-method ${item === method ? 'selected' : ''}`}
              type="button"
              onClick={() => onMethodChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="settle-note">
          Payment options stay available here once a group balance exists.
        </div>

        <button className="primary-button large" type="button" onClick={onSend}>
          Send {formatCurrency(activeGroup.youOwe)}
        </button>
      </section>
    </div>
  )
}

function EmptyState({ title, text, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
