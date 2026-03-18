import { Field, EmptyState, ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency } from '../../utils/expenseHelpers'

export default function AddExpenseScreen({
  amount,
  description,
  category,
  categories,
  paidBy,
  splitMethod,
  splitDrafts,
  activeGroup,
  expenseSplit,
  splitSummary,
  onAmountChange,
  onDescriptionChange,
  onCategoryChange,
  onPaidByChange,
  onSplitMethodChange,
  onSplitDraftChange,
  onOpenScanner,
  onSaveExpense,
}) {
  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>Add Expense</h2>
        <p>Log shared costs manually or import values from the receipt scanner.</p>
      </div>

      <div className="two-column-layout">
        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Expense Details</h3>
              <p>Choose the group, who paid, and how to split it.</p>
            </div>
          </div>

          <div className="form-grid two-up">
            <Field label="Amount paid">
              <input value={amount} placeholder="0.00" onChange={(e) => onAmountChange(e.target.value)} />
            </Field>
            <Field label="Paid by">
              <select value={paidBy} onChange={(e) => onPaidByChange(e.target.value)}>
                <option value="">Select member</option>
                {activeGroup.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" className="full-span">
              <input
                value={description}
                placeholder="e.g. Grocery run"
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </Field>
            <Field label="Group">
              <input value={activeGroup.name || ''} placeholder="Select a group first" readOnly />
            </Field>
            <Field label="Split method">
              <select value={splitMethod} onChange={(e) => onSplitMethodChange(e.target.value)}>
                <option>Equal</option>
                <option>Percent</option>
                <option>Custom</option>
              </select>
            </Field>
          </div>

          <div className="category-chip-row">
            {categories.map((item) => (
              <button
                key={item}
                className={`filter-chip ${item === category ? 'active' : ''}`}
                type="button"
                onClick={() => onCategoryChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </ShellCard>

        <div className="stacked-panel-column">
          <ShellCard className="panel-column">
            <div className="section-heading-row">
              <div>
                <h3>Split Preview</h3>
                <p>{splitSummary}</p>
              </div>
            </div>

            {splitMethod !== 'Equal' && activeGroup.members.length ? (
              <div className="stacked-list">
                {activeGroup.members.map((member) => (
                  <label key={member.id} className="split-editor-row">
                    <div className="balance-person">
                      <span className="member-avatar">{member.initials}</span>
                      <strong>{member.name}</strong>
                    </div>
                    <div className="split-editor-input">
                      <input
                        value={splitDrafts[member.id] ?? ''}
                        inputMode="decimal"
                        placeholder="0"
                        onChange={(e) => onSplitDraftChange(member.id, e.target.value)}
                      />
                      <span>{splitMethod === 'Percent' ? '%' : 'USD'}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="stacked-list">
              {activeGroup.members.length ? (
                activeGroup.members.map((member, index) => (
                  <div key={member.id} className="balance-row">
                    <div className="balance-person">
                      <span className="member-avatar">{member.initials}</span>
                      <strong>{member.name}</strong>
                    </div>
                    <strong>{formatCurrency(expenseSplit[index] ?? 0)}</strong>
                  </div>
                ))
              ) : (
                <EmptyState title="No split preview" text="Create a group and add members first." />
              )}
            </div>
          </ShellCard>

          <ShellCard className="panel-column action-panel">
            <div>
              <h3>Ready to save?</h3>
              <p>Review the split, then save the expense or open the receipt scanner.</p>
            </div>
            <div className="button-row">
              <button className="button-primary" type="button" onClick={onSaveExpense}>
                Save expense
              </button>
              <button className="button-secondary" type="button" onClick={onOpenScanner}>
                Scan receipt
              </button>
            </div>
          </ShellCard>
        </div>
      </div>
    </div>
  )
}
