import { useState } from 'react'
import Icon from '../ui/Icon'
import { EmptyState, Field, ShellCard } from '../ui/ShellPrimitives'

export default function NewAccountPreviewScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="page-stack">
      <section className="hero-banner onboarding-hero">
        <div>
          <div className="hero-kicker">First-time user preview</div>
          <h2>Start your SplitStack account</h2>
          <p>Create your profile, invite roommates, and build your first shared group.</p>
        </div>
        <div className="soft-outline-badge">No groups yet</div>
      </section>

      <div className="two-column-layout onboarding-layout">
        <ShellCard className="panel-column">
          <div className="section-heading-row">
            <div>
              <h3>Create Account</h3>
              <p>This is the first screen a brand new user would land on.</p>
            </div>
          </div>

          <div className="form-grid two-up">
            <Field label="Full name">
              <input
                placeholder="e.g. Alex Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" className="full-span">
              <input
                placeholder="Create a secure password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>

          <div className="button-row">
            <button className="button-primary" type="button">
              Create account
            </button>
            <button className="button-secondary" type="button">
              Sign in instead
            </button>
          </div>
        </ShellCard>

        <ShellCard className="panel-column onboarding-checklist-card">
          <div className="section-heading-row">
            <div>
              <h3>What happens next</h3>
              <p>After signup, the product guides the user through the first setup steps.</p>
            </div>
          </div>

          <div className="stacked-list">
            <div className="stacked-item onboarding-step">
              <div className="activity-copy">
                <span className="activity-avatar">
                  <Icon name="groups" size={20} />
                </span>
                <div>
                  <strong>Create your first group</strong>
                  <span>Name the household and add a location.</span>
                </div>
              </div>
              <strong>1</strong>
            </div>

            <div className="stacked-item onboarding-step">
              <div className="activity-copy">
                <span className="activity-avatar">
                  <Icon name="groups" size={20} />
                </span>
                <div>
                  <strong>Invite roommates</strong>
                  <span>Add members before creating any shared expenses.</span>
                </div>
              </div>
              <strong>2</strong>
            </div>

            <div className="stacked-item onboarding-step">
              <div className="activity-copy">
                <span className="activity-avatar">
                  <Icon name="addExpense" size={20} />
                </span>
                <div>
                  <strong>Log the first expense</strong>
                  <span>Use manual entry or the receipt scanner to get started.</span>
                </div>
              </div>
              <strong>3</strong>
            </div>
          </div>
        </ShellCard>
      </div>

      <section className="feature-grid onboarding-empty-grid">
        <ShellCard className="feature-card onboarding-empty-card">
          <div className="feature-card-head">
            <div className="feature-icon">
              <Icon name="groups" size={22} />
            </div>
            <div>
              <h3>No groups yet</h3>
              <p>Start by creating your first shared household.</p>
            </div>
          </div>
          <EmptyState
            title="No active workspace"
            text="A new user will see an empty group state until they create one."
          />
        </ShellCard>

        <ShellCard className="feature-card onboarding-empty-card">
          <div className="feature-card-head">
            <div className="feature-icon">
              <Icon name="scanner" size={22} />
            </div>
            <div>
              <h3>No receipts scanned</h3>
              <p>The scanner stays empty until the first upload.</p>
            </div>
          </div>
          <EmptyState
            title="Nothing to split yet"
            text="Receipt import, split calculations, and payment breakdowns appear after setup."
          />
        </ShellCard>

        <ShellCard className="feature-card onboarding-empty-card">
          <div className="feature-card-head">
            <div className="feature-icon">
              <Icon name="settle" size={22} />
            </div>
            <div>
              <h3>No balances yet</h3>
              <p>There is nothing owed until expenses exist.</p>
            </div>
          </div>
          <EmptyState
            title="Settlement starts later"
            text="Balances, settlements, and trends stay blank for a first-time account."
          />
        </ShellCard>
      </section>
    </div>
  )
}
