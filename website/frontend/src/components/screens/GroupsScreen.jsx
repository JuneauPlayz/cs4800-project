import Icon from '../ui/Icon'
import { EmptyState, InlineError, ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency } from '../../utils/expenseHelpers'

export default function GroupsScreen({
  groups,
  activeGroup,
  expenses,
  balances,
  expensesError,
  balancesError,
  onSelectGroup,
  onAddMember,
  onRemoveMember,
  onDeleteExpense,
  onDeleteGroup,
  onOpenExpense,
  onOpenSettle,
}) {
  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>Group Workspace</h2>
        <p>Manage your active household, members, balances, and expense history.</p>
      </div>

      <div className="two-column-layout">
        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Groups</h3>
              <p>Switch between your shared households.</p>
            </div>
          </div>
          <div className="stacked-list">
            {groups.length ? (
              groups.map((group) => (
                <button
                  key={group.id}
                  className={`stacked-item ${group.id === activeGroup.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div>
                    <strong>{group.name}</strong>
                    <span>
                      {group.members.length} members{group.location ? ` - ${group.location}` : ''}
                    </span>
                  </div>
                  <strong>{formatCurrency(group.totalSpend || 0)}</strong>
                </button>
              ))
            ) : (
              <EmptyState title="No groups yet" text="Create a group from the top right action." />
            )}
          </div>

          <div className="section-heading-row compact-row">
            <div>
              <h3>Members</h3>
              <p>{activeGroup.name || 'No group selected'}</p>
            </div>
            {activeGroup.id ? (
              <button className="button-secondary" type="button" onClick={onAddMember}>
                Add member
              </button>
            ) : null}
          </div>
          <div className="member-chip-grid">
            {activeGroup.members.length ? (
              activeGroup.members.map((member) => (
                <button
                  key={member.id}
                  className="member-chip"
                  type="button"
                  onClick={() => onRemoveMember(member.id, member.name)}
                >
                  <span className="member-avatar">{member.initials}</span>
                  <span>{member.name}</span>
                </button>
              ))
            ) : (
              <EmptyState title="No members yet" text="Add roommates to start splitting expenses." />
            )}
          </div>

          <div className="section-heading-row compact-row">
            <div>
              <h3>Balances</h3>
              <p>Live group standing.</p>
            </div>
            <button className="button-secondary" type="button" onClick={onOpenSettle}>
              Settle up
            </button>
          </div>
          {balancesError ? (
            <InlineError message={balancesError} />
          ) : balances.length ? (
            <div className="stacked-list">
              {balances.map((balance) => (
                <div key={balance.member_id} className="balance-row">
                  <div className="balance-person">
                    <span className="member-avatar">{balance.initials}</span>
                    <div>
                      <strong>{balance.name}</strong>
                      <span>
                        Paid {formatCurrency(balance.total_paid)} | Owes {formatCurrency(balance.total_owes)}
                      </span>
                    </div>
                  </div>
                  <strong className={balance.net_balance >= 0 ? 'text-positive' : 'text-negative'}>
                    {balance.net_balance >= 0
                      ? `+${formatCurrency(balance.net_balance)}`
                      : formatCurrency(balance.net_balance)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No balances yet" text="Balances appear after expenses are created." />
          )}

          {activeGroup.id ? (
            <button className="button-ghost danger" type="button" onClick={() => onDeleteGroup(activeGroup.id)}>
              Delete this group
            </button>
          ) : null}
        </ShellCard>

        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Expense History</h3>
              <p>Chronological ledger for this group.</p>
            </div>
            <button className="button-primary" type="button" onClick={onOpenExpense}>
              Log expense
            </button>
          </div>
          {expensesError ? (
            <InlineError message={expensesError} />
          ) : expenses.length ? (
            <div className="stacked-list">
              {expenses.map((expense) => (
                <div key={expense.id} className="expense-history-card">
                  <div className="expense-history-main">
                    <div className="activity-avatar">
                      <Icon name="addExpense" size={20} />
                    </div>
                    <div>
                      <strong>{expense.description}</strong>
                      <span>
                        {expense.category} | paid by {expense.paidByMember?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="expense-history-side">
                    <strong>{formatCurrency(expense.amount)}</strong>
                    <button className="text-link danger-text" type="button" onClick={() => onDeleteExpense(expense.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No expenses yet" text="Add an expense to see it here." />
          )}
        </ShellCard>
      </div>
    </div>
  )
}
