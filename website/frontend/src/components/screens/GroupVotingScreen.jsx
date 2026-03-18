import Icon from '../ui/Icon'
import { ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency } from '../../utils/expenseHelpers'

export default function GroupVotingScreen({ votes, activeVote, onSelectVote, onApprove, onDecline }) {
  const approvalPercent = Math.round((activeVote.approvals.length / 4) * 100)

  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>Group Voting</h2>
        <p>Democratic decisions for shared purchases and budgets.</p>
      </div>

      <div className="two-column-layout voting-layout">
        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Pending Votes (2)</h3>
              <p>Select a request to review the details.</p>
            </div>
          </div>
          <div className="stacked-list">
            {votes.map((vote) => (
              <button
                key={vote.id}
                className={`vote-list-card ${vote.id === activeVote.id ? 'active' : ''}`}
                type="button"
                onClick={() => onSelectVote(vote.id)}
              >
                <div className="vote-list-top">
                  <span className="activity-avatar">
                    <Icon name={vote.icon} size={20} />
                  </span>
                  <div>
                    <strong>{vote.title}</strong>
                    <span>
                      {formatCurrency(vote.amount)} | {vote.proposer}
                    </span>
                  </div>
                </div>
                <div className="vote-pill-row">
                  {['Marcus', 'Priya', 'Sam', 'Jordan'].map((name) => (
                    <span
                      key={name}
                      className={`vote-pill ${
                        vote.approvals.includes(name) ? 'approved' : vote.waiting.includes(name) ? 'pending' : ''
                      }`}
                    >
                      {name[0]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            <button className="vote-list-card add-card" type="button">
              <span className="plus-mark">+</span>
              <strong>Add New Vote</strong>
            </button>
          </div>
        </ShellCard>

        <ShellCard className="panel-column vote-detail-card">
          <div className="vote-hero-card">
            <div className="vote-hero-icon">
              <Icon name={activeVote.icon} size={26} />
            </div>
            <div className="vote-hero-amount">{formatCurrency(activeVote.amount)}</div>
            <strong>{activeVote.title}</strong>
            <span>Proposed by {activeVote.proposer}</span>
          </div>

          <div className="section-block">
            <h3>Description</h3>
            <p>{activeVote.description}</p>
          </div>

          <div className="progress-meta">
            <span>Approval: {activeVote.approvals.length} of 4 votes</span>
            <span>{approvalPercent}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${approvalPercent}%` }} />
          </div>

          <div className="section-block">
            <h3>Roommate Votes</h3>
            <div className="stacked-list">
              {activeVote.approvals.map((name) => (
                <div key={name} className="vote-status-card approved">
                  <div className="balance-person">
                    <span className="member-avatar">{name[0]}</span>
                    <div>
                      <strong>{name}</strong>
                      <span>Approved</span>
                    </div>
                  </div>
                  <strong>✓</strong>
                </div>
              ))}
              {activeVote.waiting.map((name) => (
                <div key={name} className="vote-status-card waiting">
                  <div className="balance-person">
                    <span className="member-avatar muted">{name[0]}</span>
                    <div>
                      <strong>{name}</strong>
                      <span>Not voted yet</span>
                    </div>
                  </div>
                  <strong>•</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="button-row split-actions">
            <button className="button-primary" type="button" onClick={onApprove}>
              Approve Purchase
            </button>
            <button className="button-danger" type="button" onClick={onDecline}>
              Decline
            </button>
          </div>
        </ShellCard>
      </div>
    </div>
  )
}
