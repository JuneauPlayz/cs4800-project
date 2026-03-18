import Icon from '../ui/Icon'
import { ShellCard } from '../ui/ShellPrimitives'

export default function ChallengesScreen({ balances, challengeRings, streakCards }) {
  const leaderboard = balances.length
    ? [...balances]
        .sort((left, right) => right.net_balance - left.net_balance)
        .map((balance, index) => ({
          id: balance.member_id,
          rank: index + 1,
          name: balance.name,
          subtitle: 'Savings Champion',
          score: Math.round(1200 + balance.net_balance * 10),
          delta: index === 0 ? '+12%' : index === balances.length - 1 ? '-3%' : `+${8 - index * 3}%`,
        }))
    : [
        { id: 1, rank: 1, name: 'You (Jordan)', subtitle: 'Savings Champion', score: 1245, delta: '+12%' },
        { id: 2, rank: 2, name: 'Priya', subtitle: 'Savings Champion', score: 1180, delta: '+8%' },
        { id: 3, rank: 3, name: 'Marcus', subtitle: 'Savings Champion', score: 1095, delta: '+5%' },
        { id: 4, rank: 4, name: 'Sam', subtitle: 'Savings Champion', score: 950, delta: '-3%' },
      ]

  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>Challenges</h2>
        <p>Track savings goals and maintain spending streaks.</p>
      </div>

      <ShellCard className="challenge-overview-card">
        <div className="section-heading-row">
          <div>
            <h3>Active Challenges</h3>
            <p>Current group goals and progress rings.</p>
          </div>
        </div>
        <div className="ring-grid">
          {challengeRings.map((ring) => (
            <div key={ring.id} className="ring-card">
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(${ring.color} ${ring.value}%, #e7e9f4 ${ring.value}% 100%)`,
                }}
              >
                <div className="progress-ring-inner">
                  <span className="ring-icon">
                    <Icon name={ring.icon} size={22} />
                  </span>
                  <strong>{ring.value}%</strong>
                </div>
              </div>
              <div className="ring-title">{ring.title}</div>
              <div className="ring-detail">{ring.detail}</div>
            </div>
          ))}
        </div>
      </ShellCard>

      <div className="two-column-layout">
        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Current Streaks</h3>
              <p>Keep momentum on your best habits.</p>
            </div>
          </div>
          <div className="stacked-list">
            {streakCards.map((streak) => (
              <div key={streak.id} className="streak-card">
                <div className="balance-person">
                  <span className="feature-icon small">
                    <Icon name={streak.icon} size={18} />
                  </span>
                  <div>
                    <strong>{streak.title}</strong>
                    <span>{streak.subtitle}</span>
                  </div>
                </div>
                <div className="streak-score">
                  <strong>{streak.days}</strong>
                  <span>days</span>
                </div>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Challenge Details</h3>
              <p>Where you stand against each active goal.</p>
            </div>
          </div>
          <div className="stacked-list">
            {challengeRings.map((ring) => (
              <div key={ring.id} className="detail-progress-card">
                <div className="balance-person">
                  <span className="feature-icon small">
                    <Icon name={ring.icon} size={18} />
                  </span>
                  <div>
                    <strong>{ring.title}</strong>
                    <span>
                      {ring.title === 'Dining Out'
                        ? 'Reduce eating out expenses'
                        : `Keep ${ring.title.toLowerCase()} on track`}
                    </span>
                  </div>
                </div>
                <div className="detail-progress-copy">
                  <strong>{ring.detail.split(' / ')[0]}</strong>
                  <span>of {ring.detail.split(' / ')[1] || 'target'}</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${ring.value}%`, background: ring.color }} />
                </div>
              </div>
            ))}
          </div>
        </ShellCard>
      </div>

      <ShellCard className="leaderboard-card">
        <div className="section-heading-row">
          <div>
            <h3>Roommate Leaderboard</h3>
            <p>This month</p>
          </div>
        </div>
        <div className="stacked-list">
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`leaderboard-row ${entry.rank === 1 ? 'winner' : entry.rank === 3 ? 'highlight' : ''}`}
            >
              <div className="balance-person">
                <span className="leader-rank">{entry.rank}</span>
                <span className="member-avatar">{entry.name[0]}</span>
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.subtitle}</span>
                </div>
              </div>
              <div className="leader-score">
                <strong>{entry.score}</strong>
                <span className={entry.delta.startsWith('-') ? 'text-negative' : 'text-positive'}>
                  {entry.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  )
}
