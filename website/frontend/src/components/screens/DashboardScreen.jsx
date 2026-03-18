import Icon from '../ui/Icon'
import { EmptyState, ShellCard } from '../ui/ShellPrimitives'
import { formatCurrency } from '../../utils/expenseHelpers'

export default function DashboardScreen({
  activeGroup,
  dashboardOwe,
  dashboardOwed,
  pendingVotes,
  groups,
  activities,
  onOpenAi,
  onOpenVoting,
  onOpenChallenges,
  onOpenScanner,
  onOpenGroups,
}) {
  const stats = [
    {
      label: 'Roommates',
      value: activeGroup.members.length || groups[0]?.members.length || 0,
      detail: activeGroup.members.length
        ? activeGroup.members.map((member) => member.name).join(', ')
        : 'Create a group to get started.',
      icon: 'groups',
    },
    {
      label: 'Pending Votes',
      value: pendingVotes,
      detail: 'Awaiting your decision',
      icon: 'groupVoting',
    },
    {
      label: 'Active Streaks',
      value: 3,
      detail: 'Keep it going!',
      icon: 'challenges',
    },
  ]

  const featureCards = [
    {
      title: 'AI Roommate',
      subtitle: 'Online now',
      body: 'Get instant insights about spending, ask budget questions, and receive smart recommendations.',
      cta: 'Start chatting',
      onClick: onOpenAi,
      icon: 'ai',
    },
    {
      title: 'Group Voting',
      subtitle: '2 pending votes',
      body: 'Vote on shared purchases and budgets so everyone has a say in group spending.',
      cta: 'View votes',
      onClick: onOpenVoting,
      badge: '2 new',
      icon: 'groupVoting',
    },
    {
      title: 'Challenges',
      subtitle: '3 active streaks',
      body: 'Track savings goals, maintain streaks, and compete with roommates in friendly financial challenges.',
      cta: 'View progress',
      onClick: onOpenChallenges,
      icon: 'challenges',
    },
  ]

  return (
    <div className="page-stack">
      <section className="hero-banner">
        <div>
          <div className="hero-kicker">Welcome back, Jordan!</div>
          <h2>{activeGroup.name || 'Chicago Pad'}</h2>
          <p>{activeGroup.members.length || 4} roommates sharing finances</p>
        </div>
        <button className="button-secondary" type="button" onClick={onOpenGroups}>
          Open group workspace
        </button>
      </section>

      <section className="stat-grid">
        {stats.map((stat) => (
          <ShellCard key={stat.label} className="stat-tile">
            <div className="tile-icon">
              <Icon name={stat.icon} size={24} />
            </div>
            <div>
              <div className="tile-title">{stat.label}</div>
              <div className="tile-value">{stat.value}</div>
              <p>{stat.detail}</p>
            </div>
          </ShellCard>
        ))}
      </section>

      <section className="feature-grid">
        {featureCards.map((card) => (
          <ShellCard key={card.title} className="feature-card">
            <div className="feature-card-head">
              <div className="feature-icon">
                <Icon name={card.icon} size={24} />
              </div>
              <div>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
              {card.badge ? <span className="soft-badge">{card.badge}</span> : null}
            </div>
            <p>{card.body}</p>
            <button className="text-link" type="button" onClick={card.onClick}>
              {card.cta} {'->'}
            </button>
          </ShellCard>
        ))}
      </section>

      <ShellCard className="activity-card">
        <div className="section-heading-row">
          <div>
            <h3>Recent Activity</h3>
            <p>Latest expenses and finance updates.</p>
          </div>
          <button className="button-secondary" type="button" onClick={onOpenScanner}>
            Open scanner
          </button>
        </div>
        <div className="activity-feed">
          {activities.length ? (
            activities.map((expense) => (
              <div key={expense.id} className="activity-row-large">
                <div className="activity-avatar">
                  <Icon name="addExpense" size={20} />
                </div>
                <div className="activity-copy">
                  <strong>{expense.description}</strong>
                  <span>
                    {expense.paidByMember?.name || 'A roommate'} logged {formatCurrency(expense.amount)}
                  </span>
                </div>
                <span className="activity-status">
                  {expense.amount > 50 ? 'Needs attention' : 'Recorded'}
                </span>
              </div>
            ))
          ) : (
            <EmptyState
              title="No activity yet"
              text="Create a group, add roommates, and log your first expense."
            />
          )}
        </div>
        <div className="dashboard-summary-bar">
          <span>You owe {formatCurrency(dashboardOwe)}</span>
          <span>Owed to you {formatCurrency(dashboardOwed)}</span>
        </div>
      </ShellCard>
    </div>
  )
}
