import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildEvenCustomMap,
  buildEvenPercentMap,
  initialAuthForm,
  initialChallengeForm,
  initialChallengesState,
  initialChatMessages,
  initialExpenseForm,
  initialGroupForm,
  navMeta,
  parseInviteEntries
} from '../models/appModel';
import { splitStackApi } from '../services/api';
import { clearStoredSession, getStoredSession, setStoredSession } from '../services/sessionStorage';

export function useAppController() {
  const [session, setSession] = useState(getStoredSession());
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [dashboard, setDashboard] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [votes, setVotes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [challengesState, setChallengesState] = useState(initialChallengesState);
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [splitInputs, setSplitInputs] = useState({ percent: {}, custom: {} });
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [challengeForm, setChallengeForm] = useState(initialChallengeForm);
  const [contributionAmounts, setContributionAmounts] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatSending, setChatSending] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState(null);
  const [aiActionSaving, setAiActionSaving] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null);
  const [budgetGoal, setBudgetGoal] = useState(null);

  const chatMessagesRef = useRef(null);
  const savingGroupRef = useRef(false);
  const token = session?.token || null;

  function resetGroupForm() {
    setGroupForm(initialGroupForm);
  }

  function resetWorkspaceState() {
    setDashboard(null);
    setGroups([]);
    setExpenses([]);
    setVotes([]);
    setAnalytics(null);
    setChallengesState(initialChallengesState);
    setSettings(null);
    setNotifications([]);
    setInvites([]);
    setExpenseForm(initialExpenseForm);
    setChallengeForm(initialChallengeForm);
    setSplitInputs({ percent: {}, custom: {} });
    setContributionAmounts({});
    setSelectedGroup(null);
    setBalanceModal(null);
    setShowGroupModal(false);
    setPendingAiAction(null);
    setAiActionSaving(false);
    setBudgetGoal(null);
  }

  function logout() {
    clearStoredSession();
    setSession(null);
    resetWorkspaceState();
    resetGroupForm();
    setChatMessages(initialChatMessages);
    setPendingAiAction(null);
    setPage('home');
  }

  async function loadAll({ silent = false } = {}) {
    if (!token) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [
        meData,
        dashboardData,
        groupsData,
        expensesData,
        votesData,
        analyticsData,
        challengesData,
        settingsData,
        notificationsData,
        invitesData,
        budgetData
      ] = await splitStackApi.loadWorkspace(token);

      const nextSession = { user: meData.user, token };
      setSession(nextSession);
      setStoredSession(nextSession);
      setInvites(invitesData.invites || meData.invites || []);
      setDashboard(dashboardData);
      setGroups(groupsData.groups);
      setExpenses(expensesData.expenses);
      setVotes(votesData.votes);
      setAnalytics(analyticsData);
      setChallengesState(challengesData);
      setSettings(settingsData.settings);
      setNotifications(notificationsData.notifications);
      setBudgetGoal(budgetData?.goal ?? null);
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
      splitStackApi.pollWorkspace(token)
        .then(([notificationData, inviteData, challengeData, votesData]) => {
          setNotifications(notificationData.notifications);
          setInvites(inviteData.invites);
          setChallengesState(challengeData);
          setVotes(votesData.votes);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const currentGroup = useMemo(() => groups.find((group) => group.id === expenseForm.groupId) || groups[0], [groups, expenseForm.groupId]);
  const memberSharesBase = useMemo(() => currentGroup?.members || [], [currentGroup]);
  const amountNumber = Number(expenseForm.amount || 0);

  useEffect(() => {
    if (!memberSharesBase.length) return;
    setSplitInputs((current) => ({
      percent: { ...buildEvenPercentMap(memberSharesBase), ...current.percent },
      custom: { ...buildEvenCustomMap(memberSharesBase, amountNumber), ...current.custom }
    }));
  }, [amountNumber, currentGroup?.id, memberSharesBase]);

  const percentTotal = useMemo(
    () => memberSharesBase.reduce((sum, member) => sum + Number(splitInputs.percent[member.id] || 0), 0),
    [memberSharesBase, splitInputs.percent]
  );

  const customTotal = useMemo(
    () => memberSharesBase.reduce((sum, member) => sum + Number(splitInputs.custom[member.id] || 0), 0),
    [memberSharesBase, splitInputs.custom]
  );

  const inviteEntries = useMemo(() => parseInviteEntries(groupForm.inviteEmails), [groupForm.inviteEmails]);
  const inviteCountPreview = 1 + inviteEntries.length;
  const topMeta = navMeta[page] || ['', ''];
  const unreadCount = notifications.filter((item) => item.unread).length + invites.length;
  const pendingVoteCount = votes.filter((vote) => vote.status === 'pending').length;

  const groupMonthlyTotals = useMemo(
    () => groups.map((group) => ({
      ...group,
      total: analytics?.byGroup?.find((item) => item.id === group.id)?.total ?? 0
    })),
    [groups, analytics]
  );

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

  function applyEvenPercentSplit() {
    setSplitInputs((current) => ({ ...current, percent: buildEvenPercentMap(memberSharesBase) }));
  }

  function applyEvenCustomSplit() {
    setSplitInputs((current) => ({ ...current, custom: buildEvenCustomMap(memberSharesBase, amountNumber) }));
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
      const data = authMode === 'login'
        ? await splitStackApi.login({ email: authForm.email, password: authForm.password })
        : await splitStackApi.register(authForm);
      setSession(data);
      setStoredSession(data);
      setChatMessages([{ role: 'ai', text: `Welcome${data.user?.name ? `, ${data.user.name}` : ''}. Ask me about balances, spending, voting, or challenges.` }]);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function saveGroup(event) {
    event.preventDefault();
    if (savingGroupRef.current || savingGroup) return false;
    if (!String(groupForm.name || '').trim()) {
      setError('Please enter a group name before saving.');
      return false;
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
        await splitStackApi.updateGroup(groupForm.id, payload, token);
      } else {
        await splitStackApi.createGroup(payload, token);
      }

      resetGroupForm();
      await loadAll();
      return true;
    } catch (nextError) {
      setError(nextError.message);
      return false;
    } finally {
      savingGroupRef.current = false;
      setSavingGroup(false);
    }
  }

  function startEditGroup(group) {
    const inviteEmails = (group.pendingInvites || []).map((invite) => invite.email);
    setGroupForm({
      id: group.id,
      name: group.name,
      type: group.type,
      threshold: String(group.threshold ?? ''),
      inviteEmail: '',
      inviteEmails,
      description: group.description || ''
    });
    setPage('groups');
  }

  async function respondInvite(inviteId, decision) {
    try {
      await splitStackApi.respondToInvite(inviteId, decision, token);
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
      await splitStackApi.leaveGroup(group.id, token);
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
      await splitStackApi.deleteGroup(group.id, token);
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
    const isSelf = expenseForm.groupId === 'self';
    if (!isSelf && !currentGroup) return;
    if (!isSelf && expenseForm.splitMethod === 'percent' && Math.abs(percentTotal - 100) > 0.01) {
      setError('Percent split must add up to 100%.');
      return;
    }
    if (!isSelf && expenseForm.splitMethod === 'custom' && Math.abs(customTotal - amountNumber) > 0.01) {
      setError('Custom split amounts must match the expense total.');
      return;
    }
    const splits = isSelf ? [] : memberShares.map((member) => expenseForm.splitMethod === 'percent'
      ? { userId: member.id, percent: Number(member.percent || 0) }
      : { userId: member.id, amount: Number(member.amount || 0) });
    try {
      await splitStackApi.createExpense({ ...expenseForm, amount: amountNumber, splits }, token);
      setExpenseForm((current) => ({ ...current, description: '', amount: '', reason: '' }));
      setSplitInputs((current) => ({ ...current, custom: buildEvenCustomMap(memberSharesBase, 0) }));
      await loadAll();
      setPage('home');
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function handleVoteResponse(voteId, decision) {
    try {
      await splitStackApi.respondToVote(voteId, decision, token);
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function saveSettings(nextSettings) {
    try {
      const data = await splitStackApi.updateSettings(nextSettings, token);
      setSettings(data.settings);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function markNotificationRead(notificationId) {
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, unread: false } : item)));
    try {
      await splitStackApi.markNotificationRead(notificationId, token);
    } catch (nextError) {
      setError(nextError.message);
      setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, unread: true } : item)));
    }
  }

  async function createChallengeSubmit(event) {
    event.preventDefault();
    try {
      await splitStackApi.createChallenge(challengeForm, token);
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
      await splitStackApi.contributeToChallenge(challengeId, amount, token);
      setContributionAmounts((current) => ({ ...current, [challengeId]: '' }));
      await loadAll();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function saveBudget(total, breakdown) {
    try {
      const data = await splitStackApi.saveBudgetGoal({ total, breakdown }, token);
      setBudgetGoal(data.goal);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function sendChat(overrideMessage) {
    const question = (overrideMessage ?? chatInput).trim();
    if (!question || chatSending) return;
    const history = chatMessages.slice(-8);
    setPendingAiAction(null);
    setChatMessages((messages) => [...messages, { role: 'user', text: question }]);
    setChatInput('');
    setChatSending(true);
    try {
      const data = await splitStackApi.sendChat(question, token, history);
      setChatMessages((messages) => [...messages, { role: 'ai', text: data.reply }]);
      setPendingAiAction(data.proposedAction ?? null);
    } catch (nextError) {
      setError(nextError.message);
      setChatMessages((messages) => [...messages, { role: 'ai', text: nextError.message || 'I hit a snag reaching the assistant.' }]);
    } finally {
      setChatSending(false);
    }
  }

  async function confirmAiAction() {
    if (!pendingAiAction || aiActionSaving) return;
    setAiActionSaving(true);
    setError('');
    try {
      const result = await splitStackApi.confirmAssistantAction(pendingAiAction, token);
      setPendingAiAction(null);
      setChatMessages((messages) => [...messages, { role: 'ai', text: result.message || 'Saved that account change.' }]);
      await loadAll({ silent: true });
    } catch (nextError) {
      setError(nextError.message);
      setChatMessages((messages) => [...messages, { role: 'ai', text: nextError.message || 'I could not save that account change.' }]);
    } finally {
      setAiActionSaving(false);
    }
  }

  function cancelAiAction() {
    setPendingAiAction(null);
    setChatMessages((messages) => [...messages, { role: 'ai', text: 'No problem, I did not change your account data.' }]);
  }

  return {
    session,
    page,
    setPage,
    loading,
    error,
    setError,
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    dashboard,
    groups,
    expenses,
    votes,
    analytics,
    challengesState,
    settings,
    notifications,
    invites,
    expenseForm,
    setExpenseForm,
    splitInputs,
    groupForm,
    setGroupForm,
    showGroupModal,
    setShowGroupModal,
    challengeForm,
    setChallengeForm,
    contributionAmounts,
    setContributionAmounts,
    chatInput,
    setChatInput,
    savingGroup,
    selectedGroup,
    setSelectedGroup,
    chatMessages,
    chatSending,
    pendingAiAction,
    aiActionSaving,
    chatMessagesRef,
    currentGroup,
    memberShares,
    percentTotal,
    customTotal,
    inviteEntries,
    inviteCountPreview,
    topMeta,
    unreadCount,
    pendingVoteCount,
    groupMonthlyTotals,
    balanceModal,
    setBalanceModal,
    budgetGoal,
    saveBudget,
    loadAll,
    handleAuthSubmit,
    logout,
    saveGroup,
    startEditGroup,
    resetGroupForm,
    addInviteEmail,
    removeInviteEmail,
    respondInvite,
    handleLeaveGroup,
    handleDeleteGroup,
    submitExpense,
    updatePercentSplit,
    updateCustomSplit,
    applyEvenPercentSplit,
    applyEvenCustomSplit,
    handleVoteResponse,
    saveSettings,
    markNotificationRead,
    createChallengeSubmit,
    addContribution,
    sendChat,
    confirmAiAction,
    cancelAiAction
  };
}
