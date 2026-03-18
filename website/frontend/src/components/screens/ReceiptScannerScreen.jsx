import Icon from '../ui/Icon'
import { Field, ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency, parseAmount } from '../../utils/expenseHelpers'

export default function ReceiptScannerScreen({
  activeGroup,
  scannerStatus,
  scannerStage,
  merchant,
  date,
  items,
  amount,
  selectedSplitMembers,
  perPerson,
  onAmountChange,
  onStartScan,
  onReset,
  onContinue,
  onToggleMember,
  onCalculate,
  onBackToPreview,
  onSendToExpense,
}) {
  const splitMembers = activeGroup.members.map((member) => ({
    ...member,
    selected: selectedSplitMembers.includes(member.id),
  }))

  const selectedMembers = splitMembers.filter((member) => member.selected)

  if (scannerStatus === 'scanning') {
    return (
      <div className="page-stack">
        <ShellCard className="scanner-empty">
          <h2>Receipt Scanner</h2>
          <p>Reading the uploaded receipt and preparing a preview.</p>
          <div className="scanner-loader" />
        </ShellCard>
      </div>
    )
  }

  if (scannerStage === 'done') {
    return (
      <div className="page-stack">
        <ShellCard className="scanner-success-card">
          <div className="scanner-success-header">
            <span className="success-check">✓</span>
            <h2>Split Complete!</h2>
            <p>
              Total: {formatCurrency(parseAmount(amount))} ÷ {selectedMembers.length || 1} people
            </p>
          </div>

          <div className="section-block">
            <h3>Payment Breakdown</h3>
            <div className="stacked-list">
              {selectedMembers.map((member) => (
                <div key={member.id} className="scanner-person-row selected">
                  <div className="balance-person">
                    <span className="member-avatar">{member.initials}</span>
                    <strong>{member.name}</strong>
                  </div>
                  <strong>{formatCurrency(perPerson)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="tip-card">
            <strong>Pro Tip</strong>
            <p>You can send payment requests to each roommate through the app or export this breakdown to share via text.</p>
          </div>

          <div className="button-row split-actions">
            <button className="button-secondary" type="button" onClick={onReset}>
              Scan another
            </button>
            <button className="button-primary" type="button" onClick={onSendToExpense}>
              Done
            </button>
          </div>
        </ShellCard>
      </div>
    )
  }

  if (scannerStage === 'split') {
    return (
      <div className="page-stack">
        <ShellCard className="scanner-amount-hero">
          <strong>{formatCurrency(parseAmount(amount))}</strong>
          <span>Total receipt amount</span>
        </ShellCard>

        <ShellCard className="scanner-panel">
          <div className="page-intro narrow-intro">
            <h2>Select Roommates</h2>
            <p>Choose who to split this expense with.</p>
          </div>

          <div className="stacked-list">
            {splitMembers.map((member) => (
              <button
                key={member.id}
                className={`scanner-person-row ${member.selected ? 'selected' : ''}`}
                type="button"
                onClick={() => onToggleMember(member.id)}
              >
                <div className="balance-person">
                  <span className="member-avatar muted">{member.initials}</span>
                  <div>
                    <strong>{member.name}</strong>
                    {member.selected ? <span>{formatCurrency(perPerson)} per person</span> : null}
                  </div>
                </div>
                <span className={`selection-circle ${member.selected ? 'checked' : ''}`}>
                  {member.selected ? '✓' : ''}
                </span>
              </button>
            ))}
          </div>

          {selectedMembers.length ? (
            <div className="selection-summary">
              <span>{selectedMembers.length} people selected</span>
              <strong>{formatCurrency(perPerson)}/person</strong>
            </div>
          ) : null}

          <div className="button-row split-actions">
            <button className="button-secondary" type="button" onClick={onBackToPreview}>
              Back
            </button>
            <button className="button-primary" type="button" onClick={onCalculate}>
              Calculate split
            </button>
          </div>
        </ShellCard>
      </div>
    )
  }

  if (scannerStage === 'preview') {
    return (
      <div className="page-stack">
        <ShellCard className="scanner-panel">
          <div className="section-heading-row">
            <div>
              <h3>Receipt Preview</h3>
              <p>Review the parsed result before splitting it.</p>
            </div>
            <button className="close-icon" type="button" onClick={onReset}>
              x
            </button>
          </div>

          <div className="scanner-preview-frame">
            <div className="receipt-mock">
              <div className="receipt-paper">
                <strong>{merchant}</strong>
                <span>{date}</span>
                <div className="receipt-lines">
                  {items.map((item) => (
                    <div key={item.id}>
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="receipt-total-row">
                  <span>Total</span>
                  <strong>{formatCurrency(parseAmount(amount))}</strong>
                </div>
              </div>
            </div>

            <div className="receipt-summary-card">
              <div className="receipt-summary-meta">
                <span className="success-label">Completed</span>
                <strong>{date}</strong>
                <h4>{merchant}</h4>
                <strong>{formatCurrency(parseAmount(amount))}</strong>
              </div>
              <div className="receipt-detail-list">
                <span>Checking | American Express</span>
                <span>Meals and entertainment</span>
                <span>Uploaded receipt preview</span>
              </div>
              <div className="receipt-table">
                {items.map((item) => (
                  <div key={item.id} className="receipt-table-row">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="scanner-alert">✓ Amount detected! You can edit if needed.</div>

          <Field label="Total Amount (Auto-detected)">
            <input value={amount} onChange={(e) => onAmountChange(e.target.value)} />
          </Field>
          <p className="field-note">Verify or modify the scanned amount before splitting.</p>

          <button className="button-primary wide-button" type="button" onClick={onContinue}>
            Continue to split
          </button>
        </ShellCard>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <ShellCard className="scanner-empty">
        <span className="feature-icon">
          <Icon name="scanner" size={22} />
        </span>
        <h2>Receipt Scanner</h2>
        <p>Upload a receipt to preview parsed details and split the total with roommates.</p>
        <button className="button-primary" type="button" onClick={onStartScan}>
          Start scan
        </button>
      </ShellCard>
    </div>
  )
}
