import { useEffect, useMemo, useRef, useState } from 'react';

const navMeta = {
  home: ['Balances', 'Your standing across all groups'],
  analytics: ['Analytics', 'Spending trends & group insights'],
  groups: ['Groups', 'Manage your shared workspaces'],
  groupDetail: ['Group Expenses', 'All expenses under this group'],
  add: ['Add Expense', 'Log and split a shared cost'],
  scanner: ['Receipt Scanner', 'Auto-fill from a receipt photo'],
  vote: ['Group Voting', 'Democratic purchase approval'],
  chat: ['AI Assistant', 'Powered by the SplitStack assistant'],
  progress: ['Challenges', 'Track goals and earn badges'],
  settings: ['Settings', 'Account and notification preferences']
};

const categoryOptions = ['Groceries', 'Dining', 'Utilities', 'Rent', 'Travel', 'Furniture', 'Streaming', 'Electronics', 'Household', 'Other'];
const groupTypeEmoji = { roommates: '🏠', trip: '✈️', household: '🏡', custom: '👥' };

let _currentUserId = 'u1';

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', 'X-User-Id': _currentUserId, ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Request failed');
  }
  return response.json();
}

function initials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function money(value) {
  return `$${Math.abs(Number(value || 0)).toFixed(2)}`;
}

function uniqueNames(members = []) {
  const seen = new Set();
  return members
    .map((m) => m.name.trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildEvenPercentMap(members = []) {
  const count = members.length || 1;
  const base = Number((100 / count).toFixed(2));
  const map = {};
  members.forEach((member, index) => {
    map[member.id] = index === members.length - 1 ? Number((100 - base * (members.length - 1)).toFixed(2)) : base;
  });
  return map;
}

function buildEvenCustomMap(members = [], amount = 0) {
  const count = members.length || 1;
  const base = Number((amount / count).toFixed(2));
  const map = {};
  members.forEach((member, index) => {
    map[member.id] = index === members.length - 1 ? Number((amount - base * (members.length - 1)).toFixed(2)) : base;
  });
  return map;
}

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const icons = {
    home: <path d="M3 10.5 12 3l9 7.5M5 9.8V21h14V9.8" />,
    analytics: <><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" /></>,
    groups: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    add: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    scanner: <><path d="M4 7V5a1 1 0 0 1 1-1h2" /><path d="M17 4h2a1 1 0 0 1 1 1v2" /><path d="M20 17v2a1 1 0 0 1-1 1h-2" /><path d="M7 20H5a1 1 0 0 1-1-1v-2" /><path d="M7 12h10" /></>,
    vote: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
    progress: <><path d="M12 20V10" /><path d="m18 20-6-6-6 6" /><path d="M4 4h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    bell: <><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    spark: <><path d="M12 2l1.8 4.5L18 8.3l-4.2 1.8L12 14.5l-1.8-4.4L6 8.3l4.2-1.8z" /></>,
    stack: <><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12.5 12 17l9-4.5" /><path d="M3 17.5 12 22l9-4.5" /></>,
    send: <><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" /></>
  };
  return <svg {...common}>{icons[name]}</svg>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('home');
  const [dashboard, setDashboard] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [progress, setProgress] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'jordan@splitstack.app', password: 'demo123' });
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const [expenseForm, setExpenseForm] = useState({ groupId: '', description: '', amount: '', category: 'Groceries', splitMethod: 'equal', reason: '', date: todayLocal(), receiptUrl: '', receiptMode: 'link' });
  const [splitInputs, setSplitInputs] = useState({ percent: {}, custom: {} });
  const [ocrPreview, setOcrPreview] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hi! I'm the SplitStack assistant. Ask me about balances, spending, votes, or saving ideas." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [creatingGroup, setCreatingGroup] = useState({ id: null, name: '', type: 'roommates', threshold: '', members: [{ name: '', email: '' }] });
  const [balanceModal, setBalanceModal] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const chatMessagesRef = useRef(null);

  const topMeta = navMeta[page];
const isEditingGroup = Boolean(creatingGroup.id);

  async function loadAll({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [dashboardData, groupsData, expensesData, votesData, analyticsData, progressData, settingsData, notificationsData, invitationsData] = await Promise.all([
        api('/api/dashboard'),
        api('/api/groups'),
        api('/api/expenses'),
        api('/api/votes'),
        api('/api/analytics'),
        api('/api/progress'),
        api('/api/settings'),
        api('/api/notifications'),
        api('/api/invitations')
      ]);
      setDashboard(dashboardData);
      setGroups(groupsData.groups);
      setExpenses(expensesData.expenses);
      setVotes(votesData.votes);
      setAnalytics(analyticsData);
      setProgress(progressData);
      setSettings(settingsData.settings);
      setNotifications(notificationsData.notifications);
      setInvitations(invitationsData.invitations);
      if (!session) setSession({ user: dashboardData.user, token: 'demo-token-splitstack' });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (groups.length && !expenseForm.groupId) {
      setExpenseForm((current) => ({ ...current, groupId: groups[0].id }));
    }
  }, [groups, expenseForm.groupId]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const currentGroup = useMemo(() => groups.find((group) => group.id === expenseForm.groupId) || groups[0], [groups, expenseForm.groupId]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const groupMonthlyTotals = useMemo(() => groups.map((group) => ({
    ...group,
    total: Number(expenses
      .filter((e) => e.groupId === group.id && (e.expenseDate || '').slice(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0)
      .toFixed(2))
  })), [groups, expenses, currentMonth]);
  const amountNumber = Number(expenseForm.amount || 0);
  const memberCount = currentGroup?.members.length || 0;
  const equalShare = memberCount ? amountNumber / memberCount : 0;

  useEffect(() => {
    if (!currentGroup?.members?.length) return;
    setSplitInputs((current) => ({
      percent: { ...buildEvenPercentMap(currentGroup.members), ...current.percent },
      custom: { ...buildEvenCustomMap(currentGroup.members, amountNumber), ...current.custom }
    }));
  }, [currentGroup, amountNumber]);

  const percentTotal = useMemo(
    () => (currentGroup?.members || []).reduce((sum, member) => sum + Number(splitInputs.percent[member.id] || 0), 0),
    [currentGroup, splitInputs.percent]
  );

  const customTotal = useMemo(
    () => (currentGroup?.members || []).reduce((sum, member) => sum + Number(splitInputs.custom[member.id] || 0), 0),
    [currentGroup, splitInputs.custom]
  );

  const memberShares = useMemo(() => {
    if (!currentGroup?.members?.length) return [];
    if (expenseForm.splitMethod === 'percent') {
      return currentGroup.members.map((member) => {
        const percent = Number(splitInputs.percent[member.id] || 0);
        return {
          userId: member.id,
          name: member.name,
          initials: member.initials,
          avatarColor: member.avatarColor,
          percent,
          amount: Number(((amountNumber * percent) / 100).toFixed(2))
        };
      });
    }
    if (expenseForm.splitMethod === 'custom') {
      return currentGroup.members.map((member) => {
        const amount = Number(splitInputs.custom[member.id] || 0);
        return {
          userId: member.id,
          name: member.name,
          initials: member.initials,
          avatarColor: member.avatarColor,
          amount
        };
      });
    }
    return currentGroup.members.map((member, index) => ({
      userId: member.id,
      name: member.name,
      initials: member.initials,
      avatarColor: member.avatarColor,
      amount: Number((index === currentGroup.members.length - 1
        ? amountNumber - equalShare * (currentGroup.members.length - 1)
        : equalShare).toFixed(2))
    }));
  }, [amountNumber, currentGroup, equalShare, expenseForm.splitMethod, splitInputs.custom, splitInputs.percent]);



  function resetGroupForm() {
    setCreatingGroup({ id: null, name: '', type: 'roommates', threshold: '', members: [{ name: '', email: '' }] });
  }

  function startEditGroup(group) {
    setCreatingGroup({
      id: group.id,
      name: group.name,
      type: group.type,
      threshold: String(group.threshold ?? ''),
      members: group.members.length
        ? group.members.map((m) => ({ name: m.name, email: '' }))
        : [{ name: '', email: '' }]
    });
  }

  function updateMemberRow(index, field, value) {
    setCreatingGroup((prev) => {
      const next = prev.members.map((m, i) => i === index ? { ...m, [field]: value } : m);
      return { ...prev, members: next };
    });
  }

  function addMemberRow() {
    setCreatingGroup((prev) => ({ ...prev, members: [...prev.members, { name: '', email: '' }] }));
  }

  function removeMemberRow(index) {
    setCreatingGroup((prev) => {
      const next = prev.members.filter((_, i) => i !== index);
      return { ...prev, members: next.length ? next : [{ name: '', email: '' }] };
    });
  }

  async function respondInvitation(invitationId, decision) {
    try {
      await api(`/api/invitations/${invitationId}/respond`, { method: 'PUT', body: JSON.stringify({ decision }) });
      await loadAll({ silent: true });
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function applyEvenPercentSplit() {
    if (!currentGroup?.members?.length) return;
    setSplitInputs((current) => ({ ...current, percent: buildEvenPercentMap(currentGroup.members) }));
  }

  function applyEvenCustomSplit() {
    if (!currentGroup?.members?.length) return;
    setSplitInputs((current) => ({ ...current, custom: buildEvenCustomMap(currentGroup.members, amountNumber) }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { email: authForm.email.toLowerCase(), password: authForm.password }
        : { name: authForm.name, email: authForm.email.toLowerCase(), password: authForm.password };
      const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      _currentUserId = data.user.id;
      setSession(data);
      setPage('home');
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function handleDemo() {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'jordan@splitstack.app', password: 'demo123' })
      });
      _currentUserId = data.user.id;
      setSession(data);
      setPage('home');
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function logout() {
    _currentUserId = 'u1';
    setSession(null);
    setDashboard(null);
    setGroups([]);
    setExpenses([]);
    setVotes([]);
    setAnalytics(null);
    setProgress(null);
    setSettings(null);
    setNotifications([]);
    setInvitations([]);
    setPage('home');
    setChatMessages([{ role: 'ai', text: "Hi! I'm the SplitStack assistant. Ask me about balances, spending, votes, or saving ideas." }]);
  }

  async function submitExpense(event) {
    event.preventDefault();
    if (!currentGroup?.members?.length) {
      setError('Select a group before adding an expense.');
      return;
    }

    const normalizedSplits = memberShares.map((share) => {
      if (expenseForm.splitMethod === 'percent') {
        return { userId: share.userId, percent: Number(share.percent || 0) };
      }
      return { userId: share.userId, amount: Number(share.amount || 0) };
    });

    if (expenseForm.splitMethod === 'percent' && Math.abs(percentTotal - 100) > 0.01) {
      setError('Percent split must add up to 100%.');
      return;
    }

    if (expenseForm.splitMethod === 'custom' && Math.abs(customTotal - amountNumber) > 0.01) {
      setError('Custom split amounts must match the total expense amount.');
      return;
    }

    try {
      const result = await api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...expenseForm,
          expenseDate: expenseForm.date,
          amount: amountNumber,
          paidBy: _currentUserId,
          splits: normalizedSplits,
          receiptUrl: expenseForm.receiptUrl.trim() || null
        })
      });
      setExpenseForm((form) => ({ ...form, description: '', amount: '', reason: '', date: todayLocal(), receiptUrl: '', receiptMode: 'link' }));
      await loadAll();
      if (result.triggeredVote) {
        setPage('vote');
        setError('This expense exceeds the group threshold. It will appear in balances only after all members approve it.');
      } else {
        setPage('home');
      }
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function runMockOcr() {
    try {
      const data = await api('/api/ocr/mock', {
        method: 'POST',
        body: JSON.stringify({ merchant: 'Whole Foods' })
      });
      setOcrPreview(data);
      setExpenseForm((form) => ({
        ...form,
        description: `${data.merchant} Receipt`,
        amount: String(data.amount),
        category: data.category
      }));
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function respondToVote(id, decision) {
    try {
      await api(`/api/votes/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function sendChat(overrideMessage) {
    const question = (overrideMessage ?? chatInput).trim();
    if (!question) return;
    setChatMessages((messages) => [...messages, { role: 'user', text: question }]);
    setChatInput('');
    try {
      const data = await api('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: question })
      });
      setChatMessages((messages) => [...messages, { role: 'ai', text: data.reply }]);
    } catch (nextError) {
      setChatMessages((messages) => [...messages, { role: 'ai', text: 'I hit a snag reaching the assistant. Please try again.' }]);
      setError(nextError.message);
    }
  }

  async function saveSettings(nextSettings) {
    try {
      const data = await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(nextSettings)
      });
      setSettings(data.settings);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function updatePercentSplit(userId, value) {
    setSplitInputs((current) => ({
      ...current,
      percent: {
        ...current.percent,
        [userId]: value === '' ? '' : Number(value)
      }
    }));
  }

  function updateCustomSplit(userId, value) {
    setSplitInputs((current) => ({
      ...current,
      custom: {
        ...current.custom,
        [userId]: value === '' ? '' : Number(value)
      }
    }));
  }

  async function addGroup(event) {
    event.preventDefault();
    if (!creatingGroup.name.trim()) {
      setError('Please enter a group name.');
      return;
    }
    try {
      const payload = {
        name: creatingGroup.name.trim(),
        type: creatingGroup.type,
        threshold: creatingGroup.threshold === '' ? 0 : Number(creatingGroup.threshold),
        emoji: groupTypeEmoji[creatingGroup.type] || '👥'
      };
      const method = isEditingGroup ? 'PUT' : 'POST';
      const path = isEditingGroup ? `/api/groups/${creatingGroup.id}` : '/api/groups';
      const result = await api(path, { method, body: JSON.stringify(payload) });
      const groupId = result.group?.id ?? creatingGroup.id;
      const inviteEmails = creatingGroup.members.map((m) => m.email.trim()).filter(Boolean);
      const inviteErrors = [];
      for (const email of inviteEmails) {
        try {
          await api(`/api/groups/${groupId}/invite`, { method: 'POST', body: JSON.stringify({ email }) });
        } catch (err) {
          inviteErrors.push(`${email}: ${err.message}`);
        }
      }
      resetGroupForm();
      await loadAll({ silent: true });
      if (inviteErrors.length) setError(inviteErrors.join(' · '));
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  if (!session) {
    return (
      <div id="auth">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-mark"><Icon name="stack" /></div>
            <div className="auth-brand-name">SplitStack</div>
            <div className="auth-brand-tag">Split Smart. Live Better.</div>
          </div>
          <div className="auth-features">
            {[
              ['Democratic purchase voting', 'Configure thresholds so large shared purchases require group approval.'],
              ['AI roommate guidance', 'Surface spending trends, anomalies, and practical savings tips in natural language.'],
              ['Gamified accountability', 'Track streaks, progress rings, and goals that keep shared budgets on track.']
            ].map(([title, sub]) => (
              <div className="auth-feat" key={title}>
                <div className="auth-feat-dot" />
                <div>
                  <div className="auth-feat-title">{title}</div>
                  <div className="auth-feat-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-right">
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-title">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</div>
            <div className="auth-sub">A web demo of the SplitStack experience that mirrors the supplied product design.</div>
            <div className="auth-hint">Use the seeded demo account: <strong>jordan@splitstack.app</strong> / <strong>demo123</strong>.</div>
            {authMode === 'register' && (
              <div className="f-row">
                <label className="f-label">Full name</label>
                <input className="f-inp" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
              </div>
            )}
            <div className="f-row">
              <label className="f-label">Email</label>
              <input className="f-inp" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            </div>
            <div className="f-row">
              <label className="f-label">Password</label>
              <input className="f-inp" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            </div>
            <button className="btn-main" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
            <div className="auth-or">or</div>
            <button className="btn-demo" type="button" onClick={handleDemo}>Enter demo app</button>
            <div className="auth-switch">
              {authMode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
              <a onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Register' : 'Sign in'}</a>
            </div>
            {error && <div className="error-banner mt-4">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="app" style={{ display: 'block' }}>
      <div className="layout">
        <aside className="sidebar">
          <div className="sb-top">
            <div className="sb-brand">
              <div className="sb-mark"><Icon name="stack" /></div>
              <div className="sb-name">SplitStack</div>
            </div>
          </div>
          <div className="sb-nav">
            <div className="nav-group">
              <div className="nav-label">Workspace</div>
              {['home', 'analytics', 'groups', 'add', 'scanner', 'vote', 'chat', 'progress', 'settings'].map((key) => (
                <button key={key} className={`nav-btn ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}>
                  <span className="n-ico"><Icon name={key} /></span>
                  {navMeta[key][0]}
                  {key === 'vote' && votes.filter((vote) => vote.status === 'pending').length > 0 ? (
                    <span className="nav-pill">{votes.filter((vote) => vote.status === 'pending').length}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <div className="sb-profile" onClick={() => setPage('settings')}>
            <div className="sb-ava">{session.user.initials || initials(session.user.name)}</div>
            <div>
              <div className="sb-uname">{session.user.name}</div>
              <div className="sb-uemail">{session.user.email}</div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <div className="tb-title">{topMeta[0]}</div>
              <div className="tb-sub">{topMeta[1]}</div>
            </div>
            <div className="tb-r">
              <button className="icon-btn" onClick={() => setPage('chat')}><Icon name="chat" /></button>
              <button className="icon-btn" onClick={() => setPage('settings')}><Icon name="bell" />{notifications.some((notification) => notification.unread) ? <span className="n-badge" /> : null}</button>
              <button className="btn btn-secondary" onClick={logout}>Sign out</button>
            </div>
          </div>

          <div className="page-wrap">
            {error && <div className="error-banner mb-4">{error}</div>}
            {loading && <div className="loading-banner mb-4">Refreshing SplitStack data…</div>}

            {page === 'home' && dashboard && (
              <div className="page show" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="balance-card">
                  <div className="bc-inner">
                    {dashboard.balances.totalOwedToYou === 0 && dashboard.balances.totalYouOwe === 0 ? (
                      <div className="bc-settled">
                        <div className="bc-settled-icon">✓</div>
                        <div className="bc-settled-title">All settled up!</div>
                        <div className="bc-settled-sub">No one owes anyone anything. You&apos;re all even.</div>
                      </div>
                    ) : (
                      <>
                        <div className="bc-label">Net balance</div>
                        <div className={`bc-amount ${dashboard.balances.net >= 0 ? 'pos' : 'neg'}`}>{dashboard.balances.net >= 0 ? '+' : '-'}{money(Math.abs(dashboard.balances.net))}</div>
                      </>
                    )}
                    <div className="bc-row">
                      <div className="bc-stat bc-stat-btn" onClick={() => setPage('groups')}><div className="bc-stat-val">{groups.length}</div><div className="bc-stat-lbl">Groups</div></div>
                      <div className="bc-stat"><div className="bc-stat-val">{dashboard.balances.settleCount}</div><div className="bc-stat-lbl">To settle</div></div>
                    </div>
                  </div>
                </div>

                <div className="g2">
                  <div className="card settlements-card settlements-clickable" onClick={() => setBalanceModal('owedToYou')}>
                    <div className="settlements-label teal">Owed to you</div>
                    <div className="settlements-total teal">{money(dashboard.balances.totalOwedToYou)}</div>
                    <div className="settlements-count">{dashboard.balances.owedToYou.length} {dashboard.balances.owedToYou.length === 1 ? 'person' : 'people'}</div>
                  </div>
                  <div className="card settlements-card settlements-clickable" onClick={() => setBalanceModal('youOwe')}>
                    <div className="settlements-label red">You owe others</div>
                    <div className="settlements-total red">{money(dashboard.balances.totalYouOwe)}</div>
                    <div className="settlements-count">{dashboard.balances.youOwe.length} {dashboard.balances.youOwe.length === 1 ? 'person' : 'people'}</div>
                  </div>
                </div>

                {balanceModal && (
                  <div className="modal-overlay" onClick={() => setBalanceModal(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-head">
                        <span>{balanceModal === 'owedToYou' ? 'People who owe you' : 'People you owe'}</span>
                        <button className="modal-close" onClick={() => setBalanceModal(null)}>✕</button>
                      </div>
                      <div className="settlements-list">
                        {(balanceModal === 'owedToYou' ? dashboard.balances.owedToYou : dashboard.balances.youOwe).length === 0
                          ? <div className="settlements-empty" style={{ padding: '24px 20px', textAlign: 'center' }}>{balanceModal === 'owedToYou' ? 'No one owes you right now.' : "You're all settled up!"}</div>
                          : (balanceModal === 'owedToYou' ? dashboard.balances.owedToYou : dashboard.balances.youOwe).map((person) => (
                            <div className="settlement-row" key={person.id} style={{ padding: '14px 20px' }}>
                              <div className="ava-sm" style={{ background: person.avatarColor }}>{person.initials}</div>
                              <div className="modal-person-info">
                                <div className="p-name">{person.name}</div>
                                <div className="modal-group-tags">{person.groups.map((g) => <span className="tag tag-muted" key={g.id}>{g.name}</span>)}</div>
                              </div>
                              <div className={`p-amount ${balanceModal === 'owedToYou' ? 'teal' : 'red'}`}>{money(person.amount)}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-head">
                    <span>Spending by group</span>
                    <span className="card-sub" style={{ margin: 0 }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  {groupMonthlyTotals.map((group) => (
                    <div className="group-spend-row group-spend-clickable" key={group.id} onClick={() => { setSelectedGroup(group); setPage('groupDetail'); }}>
                      <div className="group-emoji">{group.emoji}</div>
                      <div className="group-spend-info">
                        <div className="p-name">{group.name}</div>
                        <div className="p-group">{group.type}</div>
                      </div>
                      <div className={`p-amount ${group.total > 0 ? 'teal' : ''}`}>{group.total > 0 ? money(group.total) : <span style={{ color: 'var(--muted2)', fontSize: '13px' }}>No activity</span>}</div>
                    </div>
                  ))}
                </div>


                <div className="card">
                  <div className="card-head">Recent activity</div>
                  <div className="activity-scroll">
                    {expenses.map((expense) => {
                      const expenseGroup = groups.find((group) => group.id === expense.groupId);
                      return (
                        <div className="activity-row" key={expense.id}>
                          <div className="act-icon">{expense.category.slice(0, 1)}</div>
                          <div>
                            <div className="act-name">{expense.description}</div>
                            <div className="act-meta">{expense.category} · Paid by {expense.paidByName}</div>
                          </div>
                          <div>
                            <div className="act-amt">{money(expense.amount)}</div>
                            <div className="act-type">{expenseGroup?.name || 'Shared group'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {page === 'groupDetail' && selectedGroup && (
              <div className="page show" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setPage('home')}>← Back</button>
                <div className="card">
                  <div className="card-head" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{selectedGroup.emoji}</span>
                      <span>{selectedGroup.name}</span>
                    </div>
                    <div className="page-desc" style={{ margin: 0 }}>{selectedGroup.type} · {expenses.filter((e) => e.groupId === selectedGroup.id).length} expenses</div>
                  </div>
                  {expenses.filter((e) => e.groupId === selectedGroup.id).length === 0
                    ? <div className="settlements-empty" style={{ padding: '24px 0' }}>No expenses in this group yet.</div>
                    : expenses.filter((e) => e.groupId === selectedGroup.id).map((expense) => (
                      <div className="activity-row" key={expense.id}>
                        <div className="act-icon">{expense.category.slice(0, 1)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="act-name">{expense.description}</div>
                          <div className="act-meta">{expense.category} · Paid by {expense.paidByName}</div>
                          {expense.receiptUrl && (
                            expense.receiptUrl.startsWith('data:image') || expense.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)
                              ? <img src={expense.receiptUrl} alt="Receipt" className="receipt-thumb" />
                              : <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="receipt-link">View receipt</a>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="act-amt">{money(expense.amount)}</div>
                          <div className="act-type">{new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</div>
                        </div>
                      </div>
                   ))
                  }
                </div>
              </div>
            )}

            {page === 'analytics' && analytics && (
              <div className="page show">
                <div className="g4">
                  <StatCard label="Total spend" value={money(analytics.monthTotal)} />
                  <StatCard label="Avg expense" value={money(analytics.avgExpense)} />
                  <StatCard label="Transactions" value={String(analytics.expenseCount)} />
                  <StatCard label="Subscription alerts" value={String(analytics.subscriptionAlerts.length)} />
                </div>
                <div className="g2 mt-4">
                  <div className="card">
                    <div className="card-head">Category mix</div>
                    {analytics.byCategory.map((item) => (
                      <BarRow key={item.category} label={item.category} value={item.total} max={analytics.byCategory[0]?.total || 1} />
                    ))}
                  </div>
                  <div className="card">
                    <div className="card-head">Subscription opportunities</div>
                    {analytics.subscriptionAlerts.map((item) => (
                      <div className="activity-row" key={item.id}>
                        <div className="act-icon">{item.emoji}</div>
                        <div>
                          <div className="act-name">{item.name}</div>
                          <div className="act-meta">{item.monthlySavingsText}</div>
                        </div>
                        <div className="act-amt">{money(item.cost)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {page === 'groups' && (
              <div className="page show">
                <div className="g2 groups-layout">
                  <div className="card">
                    <div className="card-head">Active groups</div>
                    <div className="group-list">
                      {groups.map((group) => (
                        <div className="group-card interactive" key={group.id}>
                          <div className="group-top">
                            <div className="group-emoji">{group.emoji}</div>
                            <div className="group-main">
                              <div className="group-name">{group.name}</div>
                              <div className="group-meta">{group.type} · {group.members.length} members</div>
                            </div>
                            <div className="group-actions">
                              <button className="btn btn-secondary btn-sm" type="button" onClick={() => startEditGroup(group)}>Edit</button>
                              <button className="btn btn-danger btn-sm" type="button" onClick={async () => {
                                if (!window.confirm(`Leave "${group.name}"? You will be removed from the group.`)) return;
                                try {
                                  await api(`/api/groups/${group.id}`, { method: 'DELETE' });
                                  await loadAll({ silent: true });
                                } catch (err) {
                                  setError(err.message);
                                }
                              }}>Leave</button>
                            </div>
                          </div>
                          <div className="group-rule">
                            <strong>Voting threshold:</strong> Any purchase above this amount will trigger a group vote automatically.
                            <div className="group-threshold-value">Current threshold: {money(group.threshold)}</div>
                          </div>
                          <div className="member-stack">
                            {group.members.map((member) => (
                              <div className="member-pill" key={member.id} title={member.role}>{member.name}</div>
                            ))}
                            {(group.pendingInvitations ?? []).map((inv) => (
                              <div className="member-pill member-pill-pending" key={inv.id} title="Invitation pending">
                                {inv.invitedEmail} <span className="pill-status">pending</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card sticky-card">
                    <div className="card-head">{isEditingGroup ? 'Edit group' : 'Create a group'}</div>
                    <form onSubmit={addGroup} className="stack-form">
                      <label className="f-label">Group name</label>
                      <input className="f-inp" placeholder="e.g. 301 Apartment" value={creatingGroup.name} onChange={(e) => setCreatingGroup({ ...creatingGroup, name: e.target.value })} />
                      <label className="f-label">Group type</label>
                      <select className="f-inp" value={creatingGroup.type} onChange={(e) => setCreatingGroup({ ...creatingGroup, type: e.target.value })}>
                        <option value="roommates">Roommates</option>
                        <option value="trip">Trip</option>
                        <option value="household">Household</option>
                        <option value="custom">Custom</option>
                      </select>
                      <label className="f-label">Voting threshold</label>
                      <input className="f-inp" type="number" min="0" placeholder="Enter amount" value={creatingGroup.threshold} onChange={(e) => setCreatingGroup({ ...creatingGroup, threshold: e.target.value })} />
                      <p className="f-hint">Any purchase above this amount will trigger a group vote automatically.</p>
                      <label className="f-label">Group members</label>
                      <p className="f-hint">Fill in a name and optional email for each member. An invitation will be sent to any email you provide.</p>
                      <div className="member-rows">
                        {creatingGroup.members.map((member, index) => (
                          <div className="member-row" key={index}>
                            <input
                              className="f-inp member-row-name"
                              placeholder="Name"
                              value={member.name}
                              onChange={(e) => updateMemberRow(index, 'name', e.target.value)}
                            />
                            <input
                              className="f-inp member-row-email"
                              type="email"
                              placeholder="Email (optional)"
                              value={member.email}
                              onChange={(e) => updateMemberRow(index, 'email', e.target.value)}
                            />
                            <button type="button" className="btn-icon-remove" onClick={() => removeMemberRow(index)} title="Remove">×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="btn btn-secondary btn-add-member" onClick={addMemberRow}>+ Add member</button>
                      <div className="form-actions">
                        <button className="btn btn-primary" type="submit">{isEditingGroup ? 'Save changes' : 'Create group'}</button>
                        {isEditingGroup ? <button className="btn btn-secondary" type="button" onClick={resetGroupForm}>Cancel</button> : null}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {page === 'add' && (
              <div className="page show">
                <div className="g2">
                  <div className="card">
                    <div className="card-head">New shared expense</div>
                    <form onSubmit={submitExpense} className="stack-form">
                      <label className="f-label">Group</label>
                      <select className="f-inp" value={expenseForm.groupId} onChange={(e) => setExpenseForm({ ...expenseForm, groupId: e.target.value })}>
                        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                      </select>
                      <label className="f-label">Amount</label>
                      <div className="amt-wrap"><span className="amt-sym">$</span><input className="amt-inp" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                      <label className="f-label">Date</label>
                      <input className="f-inp" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                      <label className="f-label">Description</label>
                      <input className="f-inp" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                      <label className="f-label">Category</label>
                      <div className="cat-grid">
                        {categoryOptions.map((option) => (
                          <button type="button" key={option} className={`cat-btn ${expenseForm.category === option ? 'on' : ''}`} onClick={() => setExpenseForm({ ...expenseForm, category: option })}>{option}</button>
                        ))}
                      </div>
                      <label className="f-label">Split method</label>
                      <div className="split-tabs">
                        {['equal', 'percent', 'custom'].map((method) => (
                          <button type="button" key={method} className={`split-tab ${expenseForm.splitMethod === method ? 'on' : ''}`} onClick={() => setExpenseForm({ ...expenseForm, splitMethod: method })}>{method}</button>
                        ))}
                      </div>
                      {expenseForm.splitMethod === 'equal' ? (
                        <div className="scanner-hint">Split equally divides this expense across all current group members automatically.</div>
                      ) : null}
                      {expenseForm.splitMethod === 'percent' ? (
                        <div className="split-box">
                          <div className="split-summary">
                            <span>Percent total</span>
                            <strong className={Math.abs(percentTotal - 100) < 0.01 ? 'ok-text' : 'warn-text'}>{percentTotal.toFixed(2)}%</strong>
                          </div>
                          <div className="split-note">Set each member&apos;s percentage. The app calculates each payment amount automatically.</div>
                          <div className="split-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={applyEvenPercentSplit}>Split percentages evenly</button></div>
                          {memberShares.map((member) => (
                            <div className="split-member detailed" key={member.userId}>
                              <div className="split-member-main">
                                <div className="ava-sm" style={{ background: member.avatarColor }}>{member.initials}</div>
                                <div className="sm-name">{member.name}</div>
                              </div>
                              <div className="split-input-wrap">
                                <input className="sm-inp" type="number" min="0" max="100" step="0.01" value={splitInputs.percent[member.userId] ?? ''} onChange={(e) => updatePercentSplit(member.userId, e.target.value)} />
                                <span className="sm-suffix">%</span>
                              </div>
                              <div className="sm-amt">{money(member.amount)}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {expenseForm.splitMethod === 'custom' ? (
                        <div className="split-box">
                          <div className="split-summary">
                            <span>Assigned total</span>
                            <strong className={Math.abs(customTotal - amountNumber) < 0.01 ? 'ok-text' : 'warn-text'}>{money(customTotal)}</strong>
                          </div>
                          <div className="split-note">Enter the exact amount each member should pay. The total must match the expense amount.</div>
                          <div className="split-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={applyEvenCustomSplit}>Distribute amounts evenly</button></div>
                          {memberShares.map((member) => (
                            <div className="split-member detailed" key={member.userId}>
                              <div className="split-member-main">
                                <div className="ava-sm" style={{ background: member.avatarColor }}>{member.initials}</div>
                                <div className="sm-name">{member.name}</div>
                              </div>
                              <div className="split-input-wrap money">
                                <span className="sm-prefix">$</span>
                                <input className="sm-inp" type="number" min="0" step="0.01" value={splitInputs.custom[member.userId] ?? ''} onChange={(e) => updateCustomSplit(member.userId, e.target.value)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <label className="f-label">Receipt / photo (optional)</label>
                      <div className="receipt-tabs">
                        <button type="button" className={`split-tab ${expenseForm.receiptMode === 'link' ? 'on' : ''}`} onClick={() => setExpenseForm({ ...expenseForm, receiptMode: 'link', receiptUrl: '' })}>Link</button>
                        <button type="button" className={`split-tab ${expenseForm.receiptMode === 'photo' ? 'on' : ''}`} onClick={() => setExpenseForm({ ...expenseForm, receiptMode: 'photo', receiptUrl: '' })}>Upload photo</button>
                      </div>
                      {expenseForm.receiptMode === 'link' ? (
                        <input className="f-inp" type="url" placeholder="https://..." value={expenseForm.receiptUrl} onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })} />
                      ) : (
                        <input className="f-inp" type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setExpenseForm((form) => ({ ...form, receiptUrl: ev.target.result }));
                          reader.readAsDataURL(file);
                        }} />
                      )}
                      {expenseForm.receiptUrl && expenseForm.receiptMode === 'photo' && (
                        <div className="receipt-preview">
                          <img src={expenseForm.receiptUrl} alt="Receipt preview" className="receipt-img" />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpenseForm((form) => ({ ...form, receiptUrl: '' }))}>Remove</button>
                        </div>
                      )}
                      <label className="f-label">Reason for large purchase (optional)</label>
                      <textarea className="f-inp" rows="3" value={expenseForm.reason} onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })} />
                      {currentGroup ? <div className="scanner-hint">This group requires a vote for expenses above {money(currentGroup.threshold)}.</div> : null}
                      <button className="btn btn-primary btn-lg" type="submit">Add and Split</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-head">Current group members</div>
                    {memberShares.map((member) => (
                      <div className="split-member" key={member.userId}>
                        <div className="ava-sm" style={{ background: member.avatarColor }}>{member.initials}</div>
                        <div className="sm-name">{member.name}</div>
                        <div className="sm-amt">{expenseForm.splitMethod === 'percent' ? `${Number(member.percent || 0).toFixed(2)}% · ` : ''}{money(member.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {page === 'scanner' && (
              <div className="page show">
                <div className="g2">
                  <div className="card">
                    <div className="card-head">Receipt scanner</div>
                    <div className="scan-box" onClick={runMockOcr}>
                      <div className="scan-icon-wrap"><Icon name="scanner" /></div>
                      <div className="scan-box-title">Scan a receipt</div>
                      <div className="scan-box-sub">This demo uses a mocked OCR endpoint to auto-fill merchant and amount.</div>
                    </div>
                    {ocrPreview && (
                      <div className="ocr-preview mt-4">
                        <div className="ocr-row"><span className="ocr-key">Merchant</span><span className="ocr-val">{ocrPreview.merchant}</span></div>
                        <div className="ocr-row"><span className="ocr-key">Amount</span><span className="ocr-val">{money(ocrPreview.amount)}</span></div>
                        <div className="ocr-row"><span className="ocr-key">Category</span><span className="ocr-val">{ocrPreview.category}</span></div>
                        <div className="ocr-row"><span className="ocr-key">Date</span><span className="ocr-val">{ocrPreview.date}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="card">
                    <div className="card-head">What happens next</div>
                    <div className="timeline-item">1. OCR extracts merchant and amount.</div>
                    <div className="timeline-item">2. Expense form is pre-filled for faster logging.</div>
                    <div className="timeline-item">3. If the amount crosses the group voting threshold, a democratic vote is created automatically for the group.</div>
                    <button className="btn btn-primary mt-4" onClick={() => setPage('add')}>Continue to expense form</button>
                  </div>
                </div>
              </div>
            )}

            {page === 'vote' && (
              <div className="page show">
                {votes.filter((vote) => vote.status === 'pending').map((vote) => (
                  <div className="vote-card" key={vote.id}>
                    <div className="vc-top">
                      <div className="vc-tag">Pending approval</div>
                      <div className="vc-desc">{vote.description}</div>
                      <div className="vc-amt">{money(vote.amount)}</div>
                      <div className="vc-reason">{vote.reason}</div>
                    </div>
                    <div className="vc-meta">
                      <div className="vc-meta-item"><strong>{vote.category}</strong>Category</div>
                      <div className="vc-meta-item"><strong>{vote.requestedByName}</strong>Requested by</div>
                      <div className="vc-meta-item"><strong>{new Date(vote.createdAt).toLocaleDateString()}</strong>Created</div>
                    </div>
                    <div className="vc-voters">
                      <div className="vc-tally">
                        {vote.decisions.filter((d) => d.decision === 'yes').length} / {vote.memberCount} voted yes — unanimous approval required
                      </div>
                      {vote.decisions.map((decision) => (
                        <div className="vc-voter" key={decision.userId}><span className="vote-dot" style={{ background: decision.decision === 'yes' ? '#22C55E' : '#EF4444' }} />{decision.name} voted {decision.decision}</div>
                      ))}
                    </div>
                    <div className="vc-actions">
                      <button className="btn-vote-yes" onClick={() => respondToVote(vote.id, 'yes')}>Approve</button>
                      <button className="btn-vote-no" onClick={() => respondToVote(vote.id, 'no')}>Decline</button>
                    </div>
                  </div>
                ))}
                <div className="card">
                  <div className="card-head">Vote history</div>
                  {votes.filter((vote) => vote.status !== 'pending').map((vote) => (
                    <div className="vote-history-row" key={vote.id}>
                      <span className={`tag ${vote.status === 'approved' ? 'tag-green' : 'tag-red'}`}>{vote.status}</span>
                      <div className="vh-desc">
                        {vote.description}
                        <div className="vh-meta">{vote.category} · {vote.decisions.length} decisions logged</div>
                      </div>
                      <div className="vh-amt">{money(vote.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {page === 'chat' && (
              <div className="page show" style={{ padding: 0 }}>
                <div className="chat-wrap">
                  <div className="chat-quick">
                    {['Who owes the most?', 'How much did we spend on groceries this month?', 'Any tips to reduce our shared expenses?', "What's the pending vote about?"].map((prompt) => (
                      <button className="cq-btn" key={prompt} onClick={() => { setChatInput(prompt); requestAnimationFrame(() => sendChat(prompt)); }}>{prompt}</button>
                    ))}
                  </div>
                  <div id="chat-msgs" ref={chatMessagesRef}>
                    {chatMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`msg-wrap ${message.role === 'user' ? 'user' : ''}`}>
                        <div className={`msg-ava ${message.role}`}>{message.role === 'user' ? session.user.initials : 'AI'}</div>
                        <div>
                          <div className={`msg-bub ${message.role}`}>{message.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-input-bar">
                    <textarea id="chat-inp" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask about balances, group spending, savings, or votes…" rows="1" />
                    <button className="chat-send-btn" onClick={() => sendChat()} aria-label="Send message"><Icon name="send" /></button>
                  </div>
                </div>
              </div>
            )}

            {page === 'progress' && progress && (
              <div className="page show">
                <div className="g3">
                  {progress.rings.map((ring) => <RingCard key={ring.id} ring={ring} />)}
                </div>
                <div className="g2 mt-4">
                  <div className="card">
                    <div className="card-head">Challenges</div>
                    {progress.challenges.map((challenge) => (
                      <div className="challenge-card" key={challenge.id}>
                        <div className="ch-name">{challenge.name}</div>
                        <div className="ch-desc">{challenge.description}</div>
                        <div className="ch-bar"><div className="ch-fill" style={{ width: `${Math.min((challenge.current / challenge.goal) * 100, 100)}%`, background: challenge.color }} /></div>
                        <div className="ch-nums">{challenge.unit}{challenge.current} of {challenge.unit}{challenge.goal}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="card-head">Badges</div>
                    <div className="badge-grid">
                      {progress.badges.map((badge) => <div className={`badge ${badge.earned ? 'earned' : ''}`} key={badge.id}>{badge.name}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'settings' && settings && (
              <div className="page show">
                <div className="g2">
                  <div className="card">
                    <div className="card-head">Account</div>
                    <div className="settings-user">
                      <div className="settings-ava">{session.user.initials}</div>
                      <div>
                        <div className="page-title" style={{ fontSize: 20 }}>{session.user.name}</div>
                        <div className="page-desc">{session.user.email}</div>
                      </div>
                    </div>
                    {invitations.length > 0 && (
                      <div className="mt-4">
                        <div className="card-head">Group invitations</div>
                        {invitations.map((invite) => (
                          <div className="notification-row" key={invite.id}>
                            <div style={{ flex: 1 }}>
                              <div className="p-name">{invite.groupEmoji} {invite.groupName}</div>
                              <div className="p-group">{invite.invitedByName} invited you · {invite.groupType}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => respondInvitation(invite.id, 'accepted')}>Accept</button>
                              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => respondInvitation(invite.id, 'declined')}>Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="notification-list mt-4">
                      <div className="card-head">Notifications</div>
                      {notifications.map((item) => (
                        <div className="notification-row" key={item.id}>
                          <div>
                            <div className="p-name">{item.title}</div>
                            <div className="p-group">{item.body}</div>
                          </div>
                          {item.unread ? <span className="tag tag-teal">New</span> : <span className="tag tag-muted">Seen</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-head">Preferences</div>
                    <Toggle label="Email vote requests" checked={Boolean(settings.emailVotes)} onChange={(checked) => saveSettings({ ...settings, emailVotes: checked ? 1 : 0 })} />
                    <Toggle label="Email balance updates" checked={Boolean(settings.emailBalance)} onChange={(checked) => saveSettings({ ...settings, emailBalance: checked ? 1 : 0 })} />
                    <Toggle label="Push settlement confirmations" checked={Boolean(settings.pushSettlements)} onChange={(checked) => saveSettings({ ...settings, pushSettlements: checked ? 1 : 0 })} />
                    <Toggle label="Proactive AI alerts" checked={Boolean(settings.aiProactive)} onChange={(checked) => saveSettings({ ...settings, aiProactive: checked ? 1 : 0 })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return <div className="card stat-card"><div className="card-sub">{label}</div><div className="stat-val">{value}</div></div>;
}

function BarRow({ label, value, max }) {
  return (
    <div className="bar-row">
      <div className="row-b"><span>{label}</span><strong>{money(value)}</strong></div>
      <div className="bar-shell"><div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} /></div>
    </div>
  );
}

function RingCard({ ring }) {
  const pct = Math.min(ring.value / ring.max, 1);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = pct * circumference;
  return (
    <div className="card ring-card">
      <div className="ring-visual">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={radius} stroke="#E2E8F0" strokeWidth="10" fill="none" />
          <circle cx="66" cy="66" r={radius} stroke={ring.color} strokeWidth="10" fill="none" strokeLinecap="round" transform="rotate(-90 66 66)" strokeDasharray={`${filled} ${circumference}`} />
        </svg>
        <div className="ring-pct">{Math.round(pct * 100)}%</div>
      </div>
      <div className="ring-lbl">{ring.label}</div>
      <div className="ring-sub">{ring.value} / {ring.max}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="toggle-knob" />
      </button>
    </div>
  );
}

