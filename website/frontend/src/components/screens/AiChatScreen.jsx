import Icon from '../ui/Icon'
import { ShellCard } from '../ui/ShellPrimitives'

export default function AiChatScreen({ messages, chatInput, onInputChange, onSend, onQuickReply }) {
  const quickReplies = [
    "What's our biggest expense?",
    'How much did I spend this month?',
    'Suggest budget improvements',
    'Show savings opportunities',
  ]

  return (
    <div className="page-stack">
      <div className="page-intro">
        <h2>AI Roommate</h2>
        <p>Get instant insights and smart recommendations for your shared finances.</p>
      </div>

      <ShellCard className="chat-page-card">
        <div className="chat-page-header">
          <div className="balance-person">
            <span className="feature-icon">
              <Icon name="ai" size={22} />
            </span>
            <div>
              <strong>AI Roommate</strong>
              <span>Your smart financial assistant</span>
            </div>
          </div>
          <span className="soft-outline-badge">AI-powered</span>
        </div>

        <div className="chat-feed">
          {messages.map((message) => (
            <div key={message.id} className={`chat-line ${message.role}`}>
              {message.role === 'assistant' ? (
                <span className="feature-icon small">
                  <Icon name="ai" size={18} />
                </span>
              ) : null}
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
        </div>

        <div className="quick-chip-row">
          {quickReplies.map((reply) => (
            <button key={reply} className="filter-chip" type="button" onClick={() => onQuickReply(reply)}>
              {reply}
            </button>
          ))}
        </div>

        <div className="chat-composer">
          <input
            value={chatInput}
            placeholder="Ask me anything about your finances..."
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          <button className="send-button" type="button" onClick={onSend}>
            {'->'}
          </button>
        </div>
      </ShellCard>
    </div>
  )
}
