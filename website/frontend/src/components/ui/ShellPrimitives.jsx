export function ShellCard({ children, className = '' }) {
  return <section className={`shell-card ${className}`.trim()}>{children}</section>
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function InlineError({ message }) {
  return (
    <div className="inline-error">
      <strong>Could not load data.</strong>
      <p>{message}</p>
    </div>
  )
}

export function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-shimmer loading-line wide" />
      <div className="loading-shimmer loading-line medium" />
      <div className="loading-grid">
        <div className="loading-shimmer loading-box" />
        <div className="loading-shimmer loading-box" />
        <div className="loading-shimmer loading-box" />
      </div>
    </div>
  )
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="section-heading-row">
          <h3>{title}</h3>
          <button className="close-icon" type="button" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
