import { useEffect, useRef, useState } from 'react'
import * as api from './api'
import { AppHeader } from './components/AppSidebar'
import AppSidebar from './components/AppSidebar'
import AddExpenseScreen from './components/screens/AddExpenseScreen'
import AiChatScreen from './components/screens/AiChatScreen'
import ChallengesScreen from './components/screens/ChallengesScreen'
import DashboardScreen from './components/screens/DashboardScreen'
import GroupVotingScreen from './components/screens/GroupVotingScreen'
import GroupsScreen from './components/screens/GroupsScreen'
import NewAccountPreviewScreen from './components/screens/NewAccountPreviewScreen'
import ReceiptScannerScreen from './components/screens/ReceiptScannerScreen'
import SettleScreen from './components/screens/SettleScreen'
import { LoadingState, Modal, Field } from './components/ui/ShellPrimitives'
import {
  categories,
  challengeRings,
  emptyGroup,
  mockVotes,
  SCREEN_IDS,
  streakCards,
} from './data/mockData'
import {
  buildScannerReceipt,
  buildSplitDrafts,
  buildSplitPayload,
  formatCurrency,
  getCustomTotal,
  getPercentTotal,
  getSplitPreview,
  parseAmount,
  roundCurrency,
} from './utils/expenseHelpers'

export default function App() {
  const [activeScreen, setActiveScreen] = useState(SCREEN_IDS.dashboard)
  const [previewMode, setPreviewMode] = useState(false)
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])
  const [expensesError, setExpensesError] = useState('')
  const [balancesError, setBalancesError] = useState('')
  const [loading, setLoading] = useState(true)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [splitMethod, setSplitMethod] = useState('Equal')
  const [splitDrafts, setSplitDrafts] = useState({})
  const [paidBy, setPaidBy] = useState('')

  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLocation, setNewGroupLocation] = useState('')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')

  const [scannerStatus, setScannerStatus] = useState('idle')
  const [scannerStage, setScannerStage] = useState('idle')
  const [receiptMerchant, setReceiptMerchant] = useState('')
  const [receiptDate, setReceiptDate] = useState('')
  const [receiptItems, setReceiptItems] = useState([])
  const [receiptAmount, setReceiptAmount] = useState('')
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([])

  const [settleMethod, setSettleMethod] = useState('Venmo')
  const [activeVoteId, setActiveVoteId] = useState(mockVotes[0].id)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: "Hey Jordan! I'm your AI Roommate assistant. I can help you understand spending patterns, answer budget questions, and suggest smart recommendations.",
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [toast, setToast] = useState('')
  const toastRef = useRef(null)

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? emptyGroup

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (activeGroupId) {
      loadExpenses(activeGroupId)
      loadBalances(activeGroupId)
    }
  }, [activeGroupId])

  useEffect(() => {
    setSplitDrafts((prev) => buildSplitDrafts(activeGroup.members, prev))
    setSelectedSplitMembers((prev) =>
      prev.filter((memberId) => activeGroup.members.some((member) => member.id === memberId))
    )
  }, [activeGroupId, groups])

  async function loadGroups() {
    try {
      setLoading(true)
      const data = await api.getGroups()
      setGroups(data)
      if (data.length > 0) {
        setActiveGroupId(data[0].id)
      }
    } catch {
      showToast('Cannot reach backend. Make sure it is running on port 3001.')
    } finally {
      setLoading(false)
    }
  }

  async function loadExpenses(groupId) {
    try {
      setExpensesError('')
      setExpenses(await api.getExpenses(groupId))
    } catch (err) {
      setExpenses([])
      setExpensesError(err.message || 'Could not load expense history.')
    }
  }

  async function loadBalances(groupId) {
    try {
      setBalancesError('')
      setBalances(await api.getBalances(groupId))
    } catch (err) {
      setBalances([])
      setBalancesError(err.message || 'Could not load balances.')
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return showToast('Group name is required')
    try {
      const group = await api.createGroup(newGroupName, newGroupLocation)
      setGroups((prev) => [group, ...prev])
      setActiveGroupId(group.id)
      setNewGroupName('')
      setNewGroupLocation('')
      setShowGroupModal(false)
      showToast(`"${group.name}" created.`)
    } catch (err) {
      showToast(err.message)
    }
  }

  async function handleDeleteGroup(id) {
    try {
      await api.deleteGroup(id)
      const updated = groups.filter((group) => group.id !== id)
      setGroups(updated)
      setActiveGroupId(updated[0]?.id ?? null)
      setExpenses([])
      setBalances([])
      setExpensesError('')
      setBalancesError('')
      showToast('Group deleted.')
    } catch (err) {
      showToast(err.message)
    }
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return showToast('Name is required')
    if (!activeGroupId) return showToast('Select a group first')

    try {
      const member = await api.addMember(activeGroupId, newMemberName)
      setGroups((prev) =>
        prev.map((group) =>
          group.id === activeGroupId ? { ...group, members: [...group.members, member] } : group
        )
      )
      setNewMemberName('')
      setShowMemberModal(false)
      showToast(`${member.name} added.`)
    } catch (err) {
      showToast(err.message)
    }
  }

  async function handleRemoveMember(memberId, name) {
    try {
      await api.removeMember(activeGroupId, memberId)
      setGroups((prev) =>
        prev.map((group) =>
          group.id === activeGroupId
            ? { ...group, members: group.members.filter((member) => member.id !== memberId) }
            : group
        )
      )
      showToast(`${name} removed.`)
    } catch (err) {
      showToast(err.message)
    }
  }

  async function handleSaveExpense() {
    const totalAmount = parseAmount(amount)
    const percentTotal = getPercentTotal(splitDrafts, activeGroup.members)
    const customTotal = getCustomTotal(splitDrafts, activeGroup.members)

    if (!activeGroupId) return showToast('Select a group first')
    if (totalAmount <= 0) return showToast('Enter a valid amount')
    if (!description.trim()) return showToast('Enter a description')
    if (!paidBy) return showToast('Select who paid')
    if (!activeGroup.members.length) return showToast('Add at least one member first')

    if (splitMethod === 'Percent') {
      if (activeGroup.members.some((member) => splitDrafts[member.id] === '')) {
        return showToast('Enter a percentage for every member')
      }
      if (Math.abs(percentTotal - 100) > 0.01) {
        return showToast('Percent split must add up to 100%')
      }
    }

    if (splitMethod === 'Custom') {
      if (activeGroup.members.some((member) => splitDrafts[member.id] === '')) {
        return showToast('Enter an amount for every member')
      }
      if (Math.abs(customTotal - totalAmount) > 0.01) {
        return showToast('Custom split must match the expense total')
      }
    }

    try {
      const splits = buildSplitPayload(splitMethod, splitDrafts, activeGroup.members)
      const expense = await api.createExpense({
        group_id: activeGroupId,
        description,
        amount: totalAmount,
        category,
        paid_by: parseInt(paidBy),
        split_method: splitMethod,
        ...(splits ? { splits } : {}),
      })

      setExpenses((prev) => [expense, ...prev])
      setGroups((prev) =>
        prev.map((group) =>
          group.id === activeGroupId
            ? { ...group, totalSpend: (group.totalSpend || 0) + expense.amount }
            : group
        )
      )
      await loadBalances(activeGroupId)
      setAmount('')
      setDescription('')
      setPaidBy('')
      setCategory('Groceries')
      setSplitMethod('Equal')
      setSplitDrafts(buildSplitDrafts(activeGroup.members))
      showToast('Expense saved.')
      setActiveScreen(SCREEN_IDS.groups)
    } catch (err) {
      showToast(err.message)
    }
  }

  async function handleDeleteExpense(id) {
    try {
      await api.deleteExpense(id)
      setExpenses((prev) => prev.filter((expense) => expense.id !== id))
      await loadBalances(activeGroupId)
      showToast('Expense deleted.')
    } catch (err) {
      showToast(err.message)
    }
  }

  function startReceiptScan() {
    if (!activeGroup.members.length) {
      showToast('Add roommates to the active group before scanning.')
      return
    }

    setScannerStatus('scanning')
    setScannerStage('idle')
    showToast('Reading receipt...')

    window.setTimeout(() => {
      const scannedReceipt = buildScannerReceipt()
      setScannerStatus('idle')
      setReceiptMerchant(scannedReceipt.merchant)
      setReceiptDate(scannedReceipt.date)
      setReceiptItems(scannedReceipt.items)
      setReceiptAmount(scannedReceipt.amount)
      setSelectedSplitMembers(activeGroup.members.slice(0, 2).map((member) => member.id))
      setScannerStage('preview')
      showToast('Receipt ready to review.')
    }, 900)
  }

  function resetScanner() {
    setScannerStatus('idle')
    setScannerStage('idle')
    setReceiptMerchant('')
    setReceiptDate('')
    setReceiptItems([])
    setReceiptAmount('')
    setSelectedSplitMembers([])
  }

  function toggleSplitMember(memberId) {
    setSelectedSplitMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  function moveScannerToSplit() {
    if (parseAmount(receiptAmount) <= 0) {
      showToast('Enter a valid scanned amount first.')
      return
    }
    setScannerStage('split')
  }

  function calculateScannerSplit() {
    if (!selectedSplitMembers.length) {
      showToast('Select at least one roommate to split with.')
      return
    }
    setScannerStage('done')
    showToast('Split calculated.')
  }

  function sendScannerToExpenseForm() {
    setAmount(receiptAmount)
    setDescription(receiptMerchant ? `${receiptMerchant} receipt` : 'Receipt import')
    setSplitMethod('Equal')
    setActiveScreen(SCREEN_IDS.addExpense)
    showToast('Receipt values copied to Add Expense.')
  }

  function addChatMessage(text) {
    if (!text.trim()) return
    setChatMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', text: text.trim() },
      {
        id: prev.length + 2,
        role: 'assistant',
        text: 'Start with recent expenses or balances, and I can summarize the trend and suggest a next step.',
      },
    ])
    setChatInput('')
  }

  function showToast(message) {
    setToast(message)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2400)
  }

  const expenseAmount = parseAmount(amount)
  const expenseSplit = getSplitPreview(splitMethod, expenseAmount, activeGroup.members, splitDrafts)
  const splitSummary = {
    Equal: 'Equal split across all roommates.',
    Percent: `Percent split totals ${getPercentTotal(splitDrafts, activeGroup.members).toFixed(2)}%.`,
    Custom: `Custom split totals ${formatCurrency(getCustomTotal(splitDrafts, activeGroup.members))}.`,
  }[splitMethod]

  const dashboardOwe = balances
    .filter((balance) => balance.net_balance < 0)
    .reduce((sum, balance) => sum + Math.abs(balance.net_balance), 0)
  const dashboardOwed = balances
    .filter((balance) => balance.net_balance > 0)
    .reduce((sum, balance) => sum + balance.net_balance, 0)
  const pendingVotes = mockVotes.length
  const scannerPerPerson = selectedSplitMembers.length
    ? roundCurrency(parseAmount(receiptAmount) / selectedSplitMembers.length)
    : 0
  const activeVote = mockVotes.find((vote) => vote.id === activeVoteId) ?? mockVotes[0]

  return (
    <div className="app-shell figma-shell">
      <AppSidebar
        activeGroupName={activeGroup.name}
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        previewMode={previewMode}
      />

      <div className="workspace">
        <AppHeader previewMode={previewMode} onTogglePreview={() => setPreviewMode((prev) => !prev)} />

        <main className="workspace-content">
          {loading ? (
            <LoadingState />
          ) : previewMode ? (
            <NewAccountPreviewScreen />
          ) : (
            <>
              {activeScreen === SCREEN_IDS.dashboard ? (
                <DashboardScreen
                  activeGroup={activeGroup}
                  dashboardOwe={dashboardOwe}
                  dashboardOwed={dashboardOwed}
                  pendingVotes={pendingVotes}
                  groups={groups}
                  activities={expenses.slice(0, 4)}
                  onOpenAi={() => setActiveScreen(SCREEN_IDS.aiChat)}
                  onOpenVoting={() => setActiveScreen(SCREEN_IDS.groupVoting)}
                  onOpenChallenges={() => setActiveScreen(SCREEN_IDS.challenges)}
                  onOpenScanner={() => setActiveScreen(SCREEN_IDS.scanner)}
                  onOpenGroups={() => setActiveScreen(SCREEN_IDS.groups)}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.groups ? (
                <GroupsScreen
                  groups={groups}
                  activeGroup={activeGroup}
                  expenses={expenses}
                  balances={balances}
                  expensesError={expensesError}
                  balancesError={balancesError}
                  onSelectGroup={setActiveGroupId}
                  onAddMember={() => setShowMemberModal(true)}
                  onRemoveMember={handleRemoveMember}
                  onDeleteExpense={handleDeleteExpense}
                  onDeleteGroup={handleDeleteGroup}
                  onOpenExpense={() => setActiveScreen(SCREEN_IDS.addExpense)}
                  onOpenSettle={() => setActiveScreen(SCREEN_IDS.settle)}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.addExpense ? (
                <AddExpenseScreen
                  amount={amount}
                  description={description}
                  category={category}
                  categories={categories}
                  paidBy={paidBy}
                  splitMethod={splitMethod}
                  splitDrafts={splitDrafts}
                  activeGroup={activeGroup}
                  expenseSplit={expenseSplit}
                  splitSummary={splitSummary}
                  onAmountChange={setAmount}
                  onDescriptionChange={setDescription}
                  onCategoryChange={setCategory}
                  onPaidByChange={setPaidBy}
                  onSplitMethodChange={setSplitMethod}
                  onSplitDraftChange={(memberId, value) =>
                    setSplitDrafts((prev) => ({ ...prev, [memberId]: value }))
                  }
                  onOpenScanner={() => setActiveScreen(SCREEN_IDS.scanner)}
                  onSaveExpense={handleSaveExpense}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.settle ? (
                <SettleScreen
                  balances={balances}
                  balancesError={balancesError}
                  method={settleMethod}
                  onMethodChange={setSettleMethod}
                  onSend={() => showToast(`Settlement request sent via ${settleMethod}.`)}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.groupVoting ? (
                <GroupVotingScreen
                  votes={mockVotes}
                  activeVote={activeVote}
                  onSelectVote={setActiveVoteId}
                  onApprove={() => showToast('Vote recorded as approved.')}
                  onDecline={() => showToast('Vote recorded as declined.')}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.aiChat ? (
                <AiChatScreen
                  messages={chatMessages}
                  chatInput={chatInput}
                  onInputChange={setChatInput}
                  onSend={() => addChatMessage(chatInput)}
                  onQuickReply={addChatMessage}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.challenges ? (
                <ChallengesScreen
                  balances={balances}
                  challengeRings={challengeRings}
                  streakCards={streakCards}
                />
              ) : null}

              {activeScreen === SCREEN_IDS.scanner ? (
                <ReceiptScannerScreen
                  activeGroup={activeGroup}
                  scannerStatus={scannerStatus}
                  scannerStage={scannerStage}
                  merchant={receiptMerchant}
                  date={receiptDate}
                  items={receiptItems}
                  amount={receiptAmount}
                  selectedSplitMembers={selectedSplitMembers}
                  perPerson={scannerPerPerson}
                  onAmountChange={setReceiptAmount}
                  onStartScan={startReceiptScan}
                  onReset={resetScanner}
                  onContinue={moveScannerToSplit}
                  onToggleMember={toggleSplitMember}
                  onCalculate={calculateScannerSplit}
                  onBackToPreview={() => setScannerStage('preview')}
                  onSendToExpense={sendScannerToExpenseForm}
                />
              ) : null}
            </>
          )}
        </main>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}

      {showGroupModal ? (
        <Modal title="Create a new group" onClose={() => setShowGroupModal(false)}>
          <div className="modal-grid">
            <Field label="Group name">
              <input
                value={newGroupName}
                placeholder="e.g. Apartment 4B"
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </Field>
            <Field label="Location">
              <input
                value={newGroupLocation}
                placeholder="e.g. Chicago"
                onChange={(e) => setNewGroupLocation(e.target.value)}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button className="button-primary" type="button" onClick={handleCreateGroup}>
              Create group
            </button>
            <button className="button-secondary" type="button" onClick={() => setShowGroupModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}

      {showMemberModal ? (
        <Modal
          title={`Add a member to ${activeGroup.name || 'this group'}`}
          onClose={() => setShowMemberModal(false)}
        >
          <div className="modal-grid">
            <Field label="Full name">
              <input
                value={newMemberName}
                placeholder="e.g. Alex Johnson"
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button className="button-primary" type="button" onClick={handleAddMember}>
              Add member
            </button>
            <button className="button-secondary" type="button" onClick={() => setShowMemberModal(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
