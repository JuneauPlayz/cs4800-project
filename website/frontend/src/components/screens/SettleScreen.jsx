import { EmptyState, InlineError, ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency } from '../../utils/expenseHelpers'

export default function SettleScreen({ balances, balancesError, method, onMethodChange, onSend }) {
  const methods = ['Venmo', 'Apple Pay', 'Zelle', 'SplitStack Balance']
  const negativeBalances = balances.filter((balance) => balance.net_balance < 0)

  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>Settle Up</h2>
        <p>Handle outstanding balances once expenses create a net amount owed.</p>
      </div>

      <ShellCard className="panel-column">
        {balancesError ? (
          <InlineError message={balancesError} />
        ) : negativeBalances.length ? (
          <div className="stacked-list">
            {negativeBalances.map((balance) => (
              <div key={balance.member_id} className="balance-row">
                <div className="balance-person">
                  <span className="member-avatar">{balance.initials}</span>
                  <div>
                    <strong>{balance.name}</strong>
                    <span>Outstanding balance</span>
                  </div>
                </div>
                <strong>{formatCurrency(Math.abs(balance.net_balance))}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing to settle" text="Settlement options appear after expenses create a balance." />
        )}

        <div className="payment-method-row">
          {methods.map((item) => (
            <button
              key={item}
              className={`filter-chip ${item === method ? 'active' : ''}`}
              type="button"
              onClick={() => onMethodChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <button className="button-primary wide-button" type="button" onClick={onSend}>
          Send via {method}
        </button>
      </ShellCard>
    </div>
  )
}
