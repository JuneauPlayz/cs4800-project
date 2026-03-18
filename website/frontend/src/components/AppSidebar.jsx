import { navSections } from '../data/mockData'
import Icon from './ui/Icon'

export default function AppSidebar({ activeGroupName, activeScreen, onScreenChange, previewMode = false }) {
  return (
    <aside className="sidebar figma-sidebar">
      <div className="brand-block">
        <div className="brand-badge">SS</div>
        <div>
          <div className="brand-wordmark">SplitStack</div>
          <div className="brand-tagline">Split Smart. Live Better.</div>
        </div>
      </div>

      {navSections.map((section) => (
        <div key={section.title} className="sidebar-section">
          <div className="sidebar-label">{section.title}</div>
          <div className="sidebar-nav">
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activeScreen === item.id && !previewMode ? 'active' : ''} ${
                  previewMode ? 'disabled' : ''
                }`}
                type="button"
                onClick={() => {
                  if (!previewMode) onScreenChange(item.id)
                }}
                disabled={previewMode}
              >
                <span className="sidebar-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
                {item.badge && !previewMode ? <span className="sidebar-badge">{item.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="sidebar-profile">
        <div className="profile-avatar-large">{previewMode ? 'NU' : 'JL'}</div>
        <div>
          <strong>{previewMode ? 'New User' : 'Jordan Lee'}</strong>
          <span>{previewMode ? 'No active group' : activeGroupName || 'Chicago Pad'}</span>
        </div>
      </div>
    </aside>
  )
}

export function AppHeader({ previewMode = false, onTogglePreview }) {
  return (
    <header className="workspace-topbar">
      <div>
        <h1>SplitStack</h1>
        <p>{previewMode ? 'Preview a brand new account experience' : 'Manage your shared finances'}</p>
      </div>
      <div className="topbar-actions">
        <button className="button-secondary preview-toggle" type="button" onClick={onTogglePreview}>
          {previewMode ? 'View Demo Account' : 'View New Account'}
        </button>
        <button className="bell-button" type="button" aria-label="Notifications">
          <span className="bell-dot" />
          <span className="bell-icon">
            <Icon name="bell" size={22} />
          </span>
        </button>
      </div>
    </header>
  )
}
