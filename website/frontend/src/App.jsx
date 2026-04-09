import { useEffect, useMemo, useRef, useState } from 'react';

const categoryOptions = ['Groceries', 'Dining', 'Utilities', 'Rent', 'Travel', 'Furniture', 'Streaming', 'Electronics', 'Household', 'Other'];
const navMeta = {
  home: ['Balances', 'Your standing across all accepted groups'],
  analytics: ['Analytics', 'Live spending totals across your active groups'],
  groups: ['Groups', 'Create groups, manage invites, and edit existing groups'],
  add: ['Add Expense', 'Log and split a shared expense with real members'],
  vote: ['Group Voting', 'Approve purchases above the voting threshold'],
  chat: ['AI Assistant', 'Ask questions about your actual SplitStack data'],
  progress: ['Challenges', 'Create group challenges and add contributions'],
  settings: ['Settings', 'Account, notifications, and privacy preferences']
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem('splitstack-session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function api(path, options = {}, token = null) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    let payload = {};
    let fallbackText = '';
    try {
      payload = await response.json();
    } catch {
      fallbackText = await response.text().catch(() => '');
    }
    throw new Error(payload.message || fallbackText || `Request failed (${response.status})`);
  }
  return response.json();
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function parseInviteEntries(entries = []) {
  const raw = Array.isArray(entries) ? entries : String(entries).split(/\n|,/);
  const seen = new Set();
  return raw
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => entry && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    })
    .map((email) => ({ email }));
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
  const base = Number((Number(amount || 0) / count).toFixed(2));
  const map = {};
  members.forEach((member, index) => {
    map[member.id] = index === members.length - 1 ? Number((Number(amount || 0) - base * (members.length - 1)).toFixed(2)) : base;
  });
  return map;
}

function StackLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17.5 12 22l9-4.5" />
    </svg>
  );
}

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const icons = {
    home: <path d="M3 10.5 12 3l9 7.5M5 9.8V21h14V9.8" />,
    analytics: <><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" /></>,
    groups: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    add: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    vote: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    progress: <><path d="M12 20V10" /><path d="m18 20-6-6-6 6" /><path d="M4 4h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    bell: <><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    send: <><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" /></>
  };
  return <svg {...common}>{icons[name]}</svg>;
}

export default function App() {
  const [session, setSession] = useState(getStoredSession());
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'jordan@splitstack.app', password: 'demo123' });
  const [dashboard, setDashboard] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [challengesState, setChallengesState] = useState({ challenges: [], rings: [] });
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ groupId: '', description: '', amount: '', category: 'Groceries', splitMethod: 'equal', reason: '' });
  const [splitInputs, setSplitInputs] = useState({ percent: {}, custom: {} });
  const [groupForm, setGroupForm] = useState({ id: null, name: '', type: 'roommates', threshold: '', inviteEmail: '', inviteEmails: [], description: '' });
  const [challengeForm, setChallengeForm] = useState({ groupId: '', name: '', description: '', goal: '', endDate: '' });
  const [contributionAmounts, setContributionAmounts] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState({ members: [{ name: '', email: '' }] });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Hi! I’m the SplitStack assistant. Ask me about balances, spending, voting, or challenges.' }]);
  const chatMessagesRef = useRef(null);
  const savingGroupRef = useRef(false);

  const token = session?.token || null;

  async function loadAll({ silent = false } = {}) {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [meData, dashboardData, groupsData, expensesData, votesData, analyticsData, challengesData, settingsData, notificationsData, invitesData] = await Promise.all([
        api('/api/me', {}, token),
        api('/api/dashboard', {}, token),
        api('/api/groups', {}, token),
        api('/api/expenses', {}, token),
        api('/api/votes', {}, token),
        api('/api/analytics', {}, token),
        api('/api/challenges', {}, token),
        api('/api/settings', {}, token),
        api('/api/notifications', {}, token),
        api('/api/invites', {}, token)
      ]);
      const nextSession = { user: meData.user, token };
      setSession(nextSession);
      localStorage.setItem('splitstack-session', JSON.stringify(nextSession));
      setInvites(invitesData.invites || meData.invites || []);
      setDashboard(dashboardData);
      setGroups(groupsData.groups);
      setExpenses(expensesData.expenses);
      setVotes(votesData.votes);
      setAnalytics(analyticsData);
      setChallengesState(challengesData);
      setSettings(settingsData.settings);
      setNotifications(notificationsData.notifications);
      setExpenseForm((current) => ({ ...current, groupId: current.groupId || groupsData.groups[0]?.id || '' }));
      setChallengeForm((current) => ({ ...current, groupId: current.groupId || groupsData.groups[0]?.id || '' }));
    } catch (nextError) {
      setError(nextError.message);
      if (String(nextError.message).toLowerCase().includes('session')) logout();
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(() => {
      Promise.all([
        api('/api/notifications', {}, token),
        api('/api/invites', {}, token),
        api('/api/challenges', {}, token),
        api('/api/votes', {}, token)
      ]).then(([notificationData, inviteData, challengeData, votesData]) => {
        setNotifications(notificationData.notifications);
        setInvites(inviteData.invites);
        setChallengesState(challengeData);
        setVotes(votesData.votes);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
  }, [chatMessages]);

  const currentGroup = useMemo(() => groups.find((group) => group.id === expenseForm.groupId) || groups[0], [groups, expenseForm.groupId]);
  const memberSharesBase = currentGroup?.members || [];
  const amountNumber = Number(expenseForm.amount || 0);

  useEffect(() => {
    if (!memberSharesBase.length) return;
    setSplitInputs((current) => ({
      percent: { ...buildEvenPercentMap(memberSharesBase), ...current.percent },
      custom: { ...buildEvenCustomMap(memberSharesBase, amountNumber), ...current.custom }
    }));
  }, [amountNumber, currentGroup?.id]);

  const percentTotal = useMemo(() => memberSharesBase.reduce((sum, member) => sum + Number(splitInputs.percent[member.id] || 0), 0), [memberSharesBase, splitInputs.percent]);
  const customTotal = useMemo(() => memberSharesBase.reduce((sum, member) => sum + Number(splitInputs.custom[member.id] || 0), 0), [memberSharesBase, splitInputs.custom]);
  const inviteEntries = useMemo(() => parseInviteEntries(groupForm.inviteEmails), [groupForm.inviteEmails]);
  const inviteCountPreview = 1 + inviteEntries.length;
  const topMeta = navMeta[page] || ['', ''];
  const unreadCount = notifications.filter((item) => item.unread).length + invites.length;
  const [balanceModal, setBalanceModal] = useState(null);
  const groupMonthlyTotals = useMemo(() => groups.map((group) => ({
    ...group,
    total: analytics?.byGroup?.find((g) => g.id === group.id)?.total ?? 0
  })), [groups, analytics]);

  const memberShares = useMemo(() => {
    if (!memberSharesBase.length) return [];
    if (expenseForm.splitMethod === 'percent') {
      return memberSharesBase.map((member) => {
        const percent = Number(splitInputs.percent[member.id] || 0);
        return { ...member, percent, amount: Number(((amountNumber * percent) / 100).toFixed(2)) };
      });
    }
    if (expenseForm.splitMethod === 'custom') {
      return memberSharesBase.map((member) => ({ ...member, amount: Number(splitInputs.custom[member.id] || 0) }));
    }
    const equalShare = memberSharesBase.length ? Number((amountNumber / memberSharesBase.length).toFixed(2)) : 0;
    return memberSharesBase.map((member, index) => ({
      ...member,
      amount: index === memberSharesBase.length - 1 ? Number((amountNumber - equalShare * (memberSharesBase.length - 1)).toFixed(2)) : equalShare
    }));
  }, [memberSharesBase, expenseForm.splitMethod, amountNumber, splitInputs]);

  function updatePercentSplit(userId, value) {
    setSplitInputs((current) => ({ ...current, percent: { ...current.percent, [userId]: value === '' ? '' : Number(value) } }));
  }

  function updateCustomSplit(userId, value) {
    setSplitInputs((current) => ({ ...current, custom: { ...current.custom, [userId]: value === '' ? '' : Number(value) } }));
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
    setSplitInputs((current) => ({ ...current, percent: buildEvenPercentMap(memberSharesBase) }));
  }

  function applyEvenCustomSplit() {
    setSplitInputs((current) => ({ ...current, custom: buildEvenCustomMap(memberSharesBase, amountNumber) }));
  }


  function resetGroupForm() {
    setGroupForm({ id: null, name: '', type: 'roommates', threshold: '', inviteEmail: '', inviteEmails: [], description: '' });
  }

  function addInviteEmail() {
    const email = String(groupForm.inviteEmail || '').trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address for each invite.');
      return;
    }
    if (email === session?.user?.email?.toLowerCase()) {
      setError('You are already included as the group owner, so you do not need to invite yourself.');
      return;
    }
    if (groupForm.inviteEmails.includes(email)) {
      setGroupForm((current) => ({ ...current, inviteEmail: '' }));
      return;
    }
    setError('');
    setGroupForm((current) => ({ ...current, inviteEmail: '', inviteEmails: [...current.inviteEmails, email] }));
  }

  function removeInviteEmail(emailToRemove) {
    setGroupForm((current) => ({ ...current, inviteEmails: current.inviteEmails.filter((email) => email !== emailToRemove) }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm;
      const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      setSession(data);
      localStorage.setItem('splitstack-session', JSON.stringify(data));
      setChatMessages([{ role: 'ai', text: `Welcome${data.user?.name ? `, ${data.user.name}` : ''}. Ask me about balances, spending, voting, or challenges.` }]);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function logout() {
    localStorage.removeItem('splitstack-session');
    setSession(null);
    setDashboard(null);
    setGroups([]);
    setExpenses([]);
    setVotes([]);
    setAnalytics(null);
    setChallengesState({ challenges: [], rings: [] });
    setNotifications([]);
    setInvites([]);
    setExpenseForm({ groupId: '', description: '', amount: '', category: 'Groceries', splitMethod: 'equal', reason: '' });
    setChallengeForm({ groupId: '', name: '', description: '', goal: '', endDate: '' });
    setPage('home');
  }

  async function saveGroup(event) {
    event.preventDefault();
    if (savingGroupRef.current || savingGroup) return;
    if (!String(groupForm.name || '').trim()) {
      setError('Please enter a group name before saving.');
      return;
    }
    try {
      setError('');
      savingGroupRef.current = true;
      setSavingGroup(true);
      const payload = {
        id: groupForm.id,
        name: groupForm.name.trim(),
        type: groupForm.type,
        threshold: groupForm.threshold === '' ? '' : Number(groupForm.threshold),
        description: groupForm.description,
        inviteEmails: inviteEntries.map((entry) => entry.email),
        inviteEntries
      };
      if (groupForm.id) {
        await api(`/api/groups/${groupForm.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      } else {
        await api('/api/groups', { method: 'POST', body: JSON.stringify(payload) }, token);
      }
      resetGroupForm();
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      savingGroupRef.current = false;
      setSavingGroup(false);
    }
  }

  function startEditGroup(group) {
    const inviteEmails = (group.pendingInvites || []).map((invite) => invite.email);
    setGroupForm({ id: group.id, name: group.name, type: group.type, threshold: String(group.threshold ?? ''), inviteEmail: '', inviteEmails, description: group.description || '' });
    setPage('groups');
  }

  async function respondInvite(inviteId, decision) {
    try {
      await api(`/api/invites/${inviteId}/respond`, { method: 'POST', body: JSON.stringify({ decision }) }, token);
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function handleLeaveGroup(group) {
    const confirmed = window.confirm(`Leave ${group.name}? You will lose access to this group's expenses, challenges, votes, and updates until you are invited again.`);
    if (!confirmed) return;
    try {
      setError('');
      await api(`/api/groups/${group.id}/membership`, { method: 'DELETE' }, token);
      if (groupForm.id === group.id) resetGroupForm();
      if (expenseForm.groupId === group.id) {
        const nextGroup = groups.find((item) => item.id !== group.id);
        setExpenseForm((current) => ({ ...current, groupId: nextGroup?.id || '' }));
      }
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }


  async function handleDeleteGroup(group) {
    const confirmed = window.confirm(`Delete ${group.name}? This will permanently remove the group, its expenses, votes, challenges, invites, and member history.`);
    if (!confirmed) return;
    try {
      setError('');
      await api(`/api/groups/${group.id}`, { method: 'DELETE' }, token);
      if (groupForm.id === group.id) resetGroupForm();
      if (expenseForm.groupId === group.id) {
        const nextGroup = groups.find((item) => item.id !== group.id);
        setExpenseForm((current) => ({ ...current, groupId: nextGroup?.id || '' }));
      }
      if (challengeForm.groupId === group.id) {
        const nextGroup = groups.find((item) => item.id !== group.id);
        setChallengeForm((current) => ({ ...current, groupId: nextGroup?.id || '' }));
      }
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    if (!currentGroup) return;
    if (expenseForm.splitMethod === 'percent' && Math.abs(percentTotal - 100) > 0.01) {
      setError('Percent split must add up to 100%.');
      return;
    }
    if (expenseForm.splitMethod === 'custom' && Math.abs(customTotal - amountNumber) > 0.01) {
      setError('Custom split amounts must match the expense total.');
      return;
    }
    const splits = memberShares.map((member) => expenseForm.splitMethod === 'percent'
      ? { userId: member.id, percent: Number(member.percent || 0) }
      : { userId: member.id, amount: Number(member.amount || 0) });
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify({ ...expenseForm, amount: amountNumber, splits }) }, token);
      setExpenseForm((current) => ({ ...current, description: '', amount: '', reason: '' }));
      setSplitInputs((current) => ({ ...current, custom: buildEvenCustomMap(memberSharesBase, 0) }));
      await loadAll();
      setPage('home');
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function respondToVote(id, decision) {
    try {
      await api(`/api/votes/${id}/respond`, { method: 'POST', body: JSON.stringify({ decision }) }, token);
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function saveSettings(nextSettings) {
    try {
      const data = await api('/api/settings', { method: 'PUT', body: JSON.stringify(nextSettings) }, token);
      setSettings(data.settings);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function createChallengeSubmit(event) {
    event.preventDefault();
    try {
      await api('/api/challenges', { method: 'POST', body: JSON.stringify(challengeForm) }, token);
      setChallengeForm((current) => ({ ...current, name: '', description: '', goal: '', endDate: '' }));
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function addContribution(challengeId) {
    const amount = Number(contributionAmounts[challengeId] || 0);
    if (!amount) return;
    try {
      await api(`/api/challenges/${challengeId}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }, token);
      setContributionAmounts((current) => ({ ...current, [challengeId]: '' }));
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
      const data = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: question }) }, token);
      setChatMessages((messages) => [...messages, { role: 'ai', text: data.reply }]);
    } catch (nextError) {
      setError(nextError.message);
      setChatMessages((messages) => [...messages, { role: 'ai', text: 'I hit a snag reaching the assistant.' }]);
    }
  }

  if (!session) {
    return (
      <div id="auth">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-mark"><StackLogo size={22} /></div>
            <div className="auth-brand-name">SplitStack</div>
            <div className="auth-brand-tag">Split smart. Live better.</div>
          </div>
          <div className="auth-features">
            <div className="auth-feat"><div className="auth-feat-dot" /><div><div className="auth-feat-title">Create real shared groups</div><div className="auth-feat-sub">Invite members by email and let them accept inside their own account.</div></div></div>
            <div className="auth-feat"><div className="auth-feat-dot" /><div><div className="auth-feat-title">Track live balances</div><div className="auth-feat-sub">Expenses, votes, challenges, and notifications refresh from actual saved data.</div></div></div>
            <div className="auth-feat"><div className="auth-feat-dot" /><div><div className="auth-feat-title">Stay aligned as a group</div><div className="auth-feat-sub">Set a voting threshold, launch challenges, and manage preferences in one place.</div></div></div>
          </div>
        </div>
        <div className="auth-right">
          <form className="auth-form auth-form-even" onSubmit={handleAuthSubmit}>
            <div className="auth-title">Welcome back</div>
            <div className="auth-sub">Sign in to your SplitStack account</div>
            {error ? <div className="auth-hint auth-error">{error}</div> : null}
            {authMode === 'register' ? (
              <div className="f-row"><label className="f-label">Full name</label><input className="f-inp" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /></div>
            ) : null}
            <div className="f-row"><label className="f-label">Email</label><input className="f-inp" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></div>
            <div className="f-row"><label className="f-label">Password</label><input className="f-inp" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></div>
            <button className="btn-main" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
            <div className="auth-switch">{authMode === 'login' ? 'Need an account?' : 'Already have an account?'} <a onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create one' : 'Sign in'}</a></div>
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
              <div className="sb-mark"><StackLogo size={18} /></div>
              <div className="sb-name">SplitStack</div>
            </div>
          </div>
          <div className="sb-nav">
            <div className="nav-group">
              <div className="nav-label">Workspace</div>
              {['home', 'analytics', 'groups', 'add', 'vote', 'chat', 'progress', 'settings'].map((key) => {
                const pendingVoteCount = votes.filter((v) => v.status === 'pending').length;
                return (
                  <button key={key} className={`nav-btn ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}>
                    <span className="n-ico"><Icon name={key} /></span>{navMeta[key][0]}
                    {key === 'settings' && unreadCount ? <span className="nav-pill">{unreadCount}</span> : null}
                    {key === 'vote' && pendingVoteCount > 0 ? <span className="nav-pill">{pendingVoteCount}</span> : null}
                    {key === 'groups' && pendingVoteCount > 0 ? <span className="nav-pill">{pendingVoteCount}</span> : null}
                  </button>
                );
              })}
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
              <button className="icon-btn" onClick={() => setPage('settings')}><Icon name="bell" />{unreadCount ? <span className="n-badge" /> : null}</button>
              <button className="btn btn-secondary btn-sm" onClick={logout}>Log out</button>
            </div>
          </div>

          <div className="page-wrap">
            {loading ? <div className="card">Loading your workspace…</div> : null}
            {error && session ? <div className="auth-hint auth-error mb-4">{error}</div> : null}

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

            {page === 'groupDetail' && selectedGroup && (() => {
              const groupExpenses = expenses.filter((e) => e.groupId === selectedGroup.id);
              const pendingGroupVotes = votes.filter((v) => v.status === 'pending' && v.groupId === selectedGroup.id);
              const memberCount = selectedGroup.members?.length || 1;
              return (
              <div className="page show" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setPage('home')}>← Back</button>

                {pendingGroupVotes.length > 0 && (
                  <div className="card">
                    <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Pending approval</span>
                      <span className="nav-pill">{pendingGroupVotes.length}</span>
                    </div>
                    <div style={{ padding: '0 20px 4px', fontSize: '13px', color: 'var(--text-2)' }}>
                      These expenses are waiting for unanimous group approval and are not included in totals yet.
                    </div>
                    {pendingGroupVotes.map((vote) => {
                      const yesCount = vote.decisions?.filter((d) => d.decision === 'yes').length ?? 0;
                      return (
                        <div className="activity-row" key={vote.id} style={{ opacity: 0.75 }}>
                          <div className="act-icon" style={{ background: 'var(--warning, #F59E0B)', color: '#fff' }}>{vote.category.slice(0, 1)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="act-name">{vote.description}</div>
                            <div className="act-meta">{vote.category} · Requested by {vote.requestedByName}</div>
                            <div className="act-meta" style={{ color: 'var(--warning, #F59E0B)', marginTop: '2px' }}>
                              {yesCount}/{memberCount} approved · awaiting unanimous vote
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="act-amt" style={{ color: 'var(--text-2)' }}>{money(vote.amount)}</div>
                            <button className="btn btn-secondary btn-sm" style={{ marginTop: '4px' }} onClick={() => setPage('vote')}>Vote</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="card">
                  <div className="card-head" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{selectedGroup.emoji}</span>
                      <span>{selectedGroup.name}</span>
                    </div>
                    <div className="page-desc" style={{ margin: 0 }}>{selectedGroup.type} · {groupExpenses.length} expenses</div>
                  </div>
                  {groupExpenses.length === 0
                    ? <div className="settlements-empty" style={{ padding: '24px 0' }}>No approved expenses in this group yet.</div>
                    : groupExpenses.map((expense) => (
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
              );
            })()}

            {page === 'analytics' && analytics && (
              <div className="page show">
                <div className="g4">
                  <StatCard label="Total spend" value={money(analytics.monthTotal)} />
                  <StatCard label="Average expense" value={money(analytics.avgExpense)} />
                  <StatCard label="Expenses logged" value={analytics.expenseCount} />
                  <StatCard label="Accepted groups" value={groups.length} />
                </div>
                <div className="g2 mt-4">
                  <div className="card">
                    <div className="card-head">Spend by category</div>
                    {analytics.byCategory.map((item) => <BarRow key={item.category} label={item.category} value={item.total} max={analytics.byCategory[0]?.total || 1} />)}
                  </div>
                  <div className="card">
                    <div className="card-head">Spend by group</div>
                    {analytics.byGroup.map((item) => <BarRow key={item.id} label={item.name} value={item.total} max={analytics.byGroup[0]?.total || 1} />)}
                  </div>
                </div>
              </div>
            )}

            {page === 'groups' && (() => {
              const pendingVotes = votes.filter((v) => v.status === 'pending');
              return (
              <div className="page show">
                {pendingVotes.length > 0 ? (
                  <div className="card mb-4" style={{ borderLeft: '3px solid var(--accent, #6c63ff)' }}>
                    <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Group Voting</span>
                      <span className="nav-pill">{pendingVotes.length}</span>
                    </div>
                    <div style={{ padding: '0 20px 16px', color: 'var(--text-2)', fontSize: '14px' }}>
                      {pendingVotes.length === 1
                        ? 'There is 1 pending group vote that needs your attention.'
                        : `There are ${pendingVotes.length} pending group votes that need your attention.`}
                      <button className="btn btn-primary btn-sm" style={{ marginLeft: '12px' }} onClick={() => setPage('vote')}>Review votes</button>
                    </div>
                  </div>
                ) : null}
                {invites.length ? (
                  <div className="card mb-4">
                    <div className="card-head">Pending invites</div>
                    {invites.map((invite) => (
                      <div className="notification-row" key={invite.id}>
                        <div><div className="p-name">{invite.groupName}</div><div className="p-group">Invited by {invite.invitedByName} · {invite.email}</div></div>
                        <div className="row gap-2"><button className="btn btn-primary btn-sm" onClick={() => respondInvite(invite.id, 'accepted')}>Accept</button><button className="btn btn-secondary btn-sm" onClick={() => respondInvite(invite.id, 'declined')}>Decline</button></div>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                    <div className="card-head">{groupForm.id ? 'Edit group' : 'Create a group'}</div>
                    <form onSubmit={saveGroup} className="stack-form">
                      <label className="f-label">Group name</label>
                      <input className="f-inp" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g. Summer Apartment" />
                      <label className="f-label">Group type</label>
                      <select className="f-inp" value={groupForm.type} onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}>
                        <option value="roommates">Roommates</option><option value="trip">Trip</option><option value="household">Household</option><option value="custom">Custom</option>
                      </select>
                      <label className="f-label">Voting threshold</label>
                      <input className="f-inp" type="number" min="0" placeholder="Enter amount" value={groupForm.threshold} onChange={(e) => setGroupForm({ ...groupForm, threshold: e.target.value })} />
                      <div className="scanner-hint">Any purchase above this amount will trigger a group vote automatically.</div>
                      <label className="f-label">Invite members by email</label>
                      <div className="invite-row">
                        <input
                          className="f-inp"
                          type="email"
                          value={groupForm.inviteEmail}
                          onChange={(e) => setGroupForm({ ...groupForm, inviteEmail: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInviteEmail(); } }}
                          placeholder="friend@example.com"
                        />
                        <button className="btn btn-secondary" type="button" onClick={addInviteEmail}>Add</button>
                      </div>
                      <div className="scanner-hint">Invite people using the exact email address they will use to create or sign in to their SplitStack account.</div>
                      <div className="member-helper row-b"><span>{inviteCountPreview} people after save</span><span>Owner + accepted members + pending email invites</span></div>
                      <div className="member-stack member-stack-edit">{inviteEntries.length ? inviteEntries.map((entry) => <button className="member-pill removable-pill" type="button" key={entry.email} onClick={() => removeInviteEmail(entry.email)}>{entry.email} <span>×</span></button>) : <div className="member-placeholder">No invite emails added yet.</div>}</div>
                      <label className="f-label">Description</label>
                      <textarea className="f-inp" rows="3" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="What is this group for?" />
                      <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={savingGroup}>{savingGroup ? 'Saving…' : (groupForm.id ? 'Save changes' : 'Create group')}</button>{groupForm.id ? <button className="btn btn-secondary" type="button" onClick={() => resetGroupForm()}>Cancel</button> : null}</div>
                    </form>
                  </div>
                </div>
              </div>
              );
            })()}

            {page === 'add' && (
              <div className="page show">
                <div className="g2">
                  <div className="card">
                    <div className="card-head">Add an expense</div>
                    <form onSubmit={submitExpense} className="stack-form">
                      <label className="f-label">Group</label>
                      <select className="f-inp" value={expenseForm.groupId} onChange={(e) => setExpenseForm({ ...expenseForm, groupId: e.target.value })}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                      <label className="f-label">Description</label>
                      <input className="f-inp" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                      <label className="f-label">Amount</label>
                      <div className="amt-wrap"><span className="amt-sym">$</span><input className="amt-inp" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                      <label className="f-label">Category</label>
                      <div className="cat-grid">{categoryOptions.map((option) => <button className={`cat-btn ${expenseForm.category === option ? 'on' : ''}`} type="button" key={option} onClick={() => setExpenseForm({ ...expenseForm, category: option })}>{option}</button>)}</div>
                      <label className="f-label">Split method</label>
                      <div className="split-tabs">{['equal', 'percent', 'custom'].map((method) => <button className={`split-tab ${expenseForm.splitMethod === method ? 'on' : ''}`} type="button" key={method} onClick={() => setExpenseForm({ ...expenseForm, splitMethod: method })}>{method}</button>)}</div>
                      {expenseForm.splitMethod === 'equal' ? <div className="scanner-hint">Each current member pays {money(memberShares[0]?.amount || 0)} automatically.</div> : null}
                      {expenseForm.splitMethod === 'percent' ? (
                        <div className="split-box"><div className="split-summary"><span>Percent total</span><strong className={Math.abs(percentTotal - 100) < 0.01 ? 'ok-text' : 'warn-text'}>{percentTotal.toFixed(2)}%</strong></div><div className="split-note">Set each member&apos;s percentage. Amounts update automatically.</div><div className="split-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={applyEvenPercentSplit}>Split percentages evenly</button></div>{memberShares.map((member) => <div className="split-member detailed" key={member.id}><div className="split-member-main"><div className="ava-sm" style={{ background: member.avatarColor }}>{member.initials}</div><div className="sm-name">{member.name}</div></div><div className="split-input-wrap"><input className="sm-inp" type="number" step="0.01" min="0" max="100" value={splitInputs.percent[member.id] ?? ''} onChange={(e) => updatePercentSplit(member.id, e.target.value)} /><span className="sm-suffix">%</span></div><div className="sm-amt">{money(member.amount)}</div></div>)}</div>
                      ) : null}
                      {expenseForm.splitMethod === 'custom' ? (
                        <div className="split-box"><div className="split-summary"><span>Assigned total</span><strong className={Math.abs(customTotal - amountNumber) < 0.01 ? 'ok-text' : 'warn-text'}>{money(customTotal)}</strong></div><div className="split-note">Enter the exact amount each person should pay.</div><div className="split-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={applyEvenCustomSplit}>Distribute amounts evenly</button></div>{memberShares.map((member) => <div className="split-member detailed" key={member.id}><div className="split-member-main"><div className="ava-sm" style={{ background: member.avatarColor }}>{member.initials}</div><div className="sm-name">{member.name}</div></div><div className="split-input-wrap money"><span className="sm-prefix">$</span><input className="sm-inp" type="number" step="0.01" min="0" value={splitInputs.custom[member.id] ?? ''} onChange={(e) => updateCustomSplit(member.id, e.target.value)} /></div></div>)}</div>
                      ) : null}
                      <label className="f-label">Reason for vote (optional)</label>
                      <textarea className="f-inp" rows="3" value={expenseForm.reason} onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })} placeholder="Used only if this purchase exceeds the voting threshold." />
                      <button className="btn btn-primary" type="submit">Save expense</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-head">Receipt scanning</div>
                    <div className="scan-box"><div className="scan-icon-wrap"><StackLogo size={20} /></div><div className="scan-box-title">Coming with the mobile app</div><div className="scan-box-sub">Receipt scanning is intentionally deferred for the mobile build. The rest of the web app saves real data now.</div></div>
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
              </div>
            )}

            {page === 'chat' && (
              <div className="page show" style={{ padding: 0 }}>
                <div className="chat-wrap"><div className="chat-quick">{['Who owes the most?', 'How much did we spend on groceries?', 'Any pending votes?', 'How are our challenges doing?'].map((prompt) => <button className="cq-btn" key={prompt} onClick={() => sendChat(prompt)}>{prompt}</button>)}</div><div id="chat-msgs" ref={chatMessagesRef}>{chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`msg-wrap ${message.role === 'user' ? 'user' : ''}`}><div className={`msg-ava ${message.role}`}>{message.role === 'user' ? session.user.initials : 'AI'}</div><div><div className={`msg-bub ${message.role}`}>{message.text}</div></div></div>)}</div><div className="chat-input-bar"><textarea id="chat-inp" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask about balances, group spending, savings, or votes…" rows="1" /><button className="chat-send-btn" onClick={() => sendChat()}><Icon name="send" /></button></div></div>
              </div>
            )}

            {page === 'progress' && (
              <div className="page show">
                <div className="g3">{challengesState.rings.map((ring) => <RingCard key={ring.id} ring={ring} />)}</div>
                <div className="g2 mt-4">
                  <div className="card">
                    <div className="card-head">Create challenge</div>
                    <form onSubmit={createChallengeSubmit} className="stack-form">
                      <label className="f-label">Group</label>
                      <select className="f-inp" value={challengeForm.groupId} onChange={(e) => setChallengeForm({ ...challengeForm, groupId: e.target.value })}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                      <label className="f-label">Challenge name</label>
                      <input className="f-inp" value={challengeForm.name} onChange={(e) => setChallengeForm({ ...challengeForm, name: e.target.value })} />
                      <label className="f-label">Description</label>
                      <textarea className="f-inp" rows="3" value={challengeForm.description} onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} />
                      <label className="f-label">Goal amount</label>
                      <input className="f-inp" type="number" min="1" value={challengeForm.goal} onChange={(e) => setChallengeForm({ ...challengeForm, goal: e.target.value })} />
                      <label className="f-label">End date</label>
                      <input className="f-inp" type="date" value={challengeForm.endDate} onChange={(e) => setChallengeForm({ ...challengeForm, endDate: e.target.value })} />
                      <button className="btn btn-primary" type="submit">Create challenge</button>
                    </form>
                  </div>
                  <div className="card">
                    <div className="card-head">Active challenges</div>
                    {challengesState.challenges.map((challenge) => (
                      <div className="challenge-card" key={challenge.id}><div className="row-b"><div><div className="ch-name">{challenge.name}</div><div className="ch-desc">{challenge.groupName} · {challenge.description}</div></div><span className="tag tag-teal">{money(challenge.current)} / {money(challenge.goal)}</span></div><div className="ch-bar"><div className="ch-fill" style={{ width: `${Math.min((challenge.current / challenge.goal) * 100, 100)}%`, background: challenge.color }} /></div><div className="row-b"><span className="ch-nums">Created by {challenge.createdByName}</span><span className="ch-nums">Ends {challenge.endDate || 'Any time'}</span></div><div className="split-member detailed mt-3"><div className="split-member-main"><div className="sm-name">Add progress</div></div><div className="split-input-wrap money"><span className="sm-prefix">$</span><input className="sm-inp" type="number" min="0" step="0.01" value={contributionAmounts[challenge.id] ?? ''} onChange={(e) => setContributionAmounts((current) => ({ ...current, [challenge.id]: e.target.value }))} /></div><button className="btn btn-primary btn-sm" type="button" onClick={() => addContribution(challenge.id)}>Add</button></div>{challenge.contributions.slice(0, 3).map((item) => <div className="notification-row compact-row" key={item.id}><div className="row gap-2"><div className="ava-sm" style={{ background: item.avatarColor }}>{item.initials}</div><div><div className="p-name">{item.name}</div><div className="p-group">Added progress</div></div></div><strong>{money(item.amount)}</strong></div>)}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {page === 'settings' && settings && (
              <div className="page show">
                <div className="g2">
                  <div className="card">
                    <div className="card-head">Account</div>
                    <div className="settings-user"><div className="settings-ava">{session.user.initials}</div><div><div className="page-title" style={{ fontSize: 20 }}>{session.user.name}</div><div className="page-desc">{session.user.email}</div></div></div>
                    <div className="card-sub mt-4">Notifications</div>
                    <div className="notification-list">{notifications.map((item) => <div className="notification-row" key={item.id}><div><div className="p-name">{item.title}</div><div className="p-group">{item.body}</div></div>{item.unread ? <span className="tag tag-teal">New</span> : <span className="tag tag-muted">Seen</span>}</div>)}</div>
                  </div>
                  <div className="card">
                    <div className="card-head">Preferences</div>
                    <Toggle label="Email vote requests" checked={Boolean(settings.emailVotes)} onChange={(checked) => saveSettings({ ...settings, emailVotes: checked ? 1 : 0 })} />
                    <Toggle label="Email balance updates" checked={Boolean(settings.emailBalance)} onChange={(checked) => saveSettings({ ...settings, emailBalance: checked ? 1 : 0 })} />
                    <Toggle label="Push settlement confirmations" checked={Boolean(settings.pushSettlements)} onChange={(checked) => saveSettings({ ...settings, pushSettlements: checked ? 1 : 0 })} />
                    <Toggle label="Proactive AI alerts" checked={Boolean(settings.aiProactive)} onChange={(checked) => saveSettings({ ...settings, aiProactive: checked ? 1 : 0 })} />
                    <label className="f-label mt-4">Profile visibility</label>
                    <select className="f-inp" value={settings.profileVisibility} onChange={(e) => saveSettings({ ...settings, profileVisibility: e.target.value })}><option value="group_members">Visible to group members</option><option value="private">Private</option></select>
                    <label className="f-label mt-4">Activity visibility</label>
                    <select className="f-inp" value={settings.activityVisibility} onChange={(e) => saveSettings({ ...settings, activityVisibility: e.target.value })}><option value="group_members">Visible to group members</option><option value="private">Private</option></select>
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
  return <div className="bar-row"><div className="row-b"><span>{label}</span><strong>{money(value)}</strong></div><div className="bar-shell"><div className="bar-fill" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div></div>;
}

function RingCard({ ring }) {
  const pct = Math.min((ring.value || 0) / Math.max(ring.max || 1, 1), 1);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = pct * circumference;
  return (
    <div className="card ring-card"><div className="ring-visual"><svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r={radius} stroke="#E2E8F0" strokeWidth="10" fill="none" /><circle cx="66" cy="66" r={radius} stroke={ring.color} strokeWidth="10" fill="none" strokeLinecap="round" transform="rotate(-90 66 66)" strokeDasharray={`${filled} ${circumference}`} /></svg><div className="ring-pct">{Math.round(pct * 100)}%</div></div><div className="ring-lbl">{ring.label}</div><div className="ring-sub">{money(ring.value)} of {money(ring.max)}</div></div>
  );
}

function Toggle({ label, checked, onChange }) {
  return <div className="row toggle-row mt-3"><span>{label}</span><button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} type="button"><span className="toggle-knob" /></button></div>;
}
