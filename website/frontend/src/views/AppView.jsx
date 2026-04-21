import { useState } from 'react';
import { categoryOptions, initials, money, navMeta, workspacePages } from '../models/appModel';

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

export function AppView({ controller }) {
  const {
    session,
    page,
    setPage,
    loading,
    error,
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
    chatMessagesRef,
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
    createChallengeSubmit,
    addContribution,
    sendChat
  } = controller;

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
              {workspacePages.map((key) => (
                <button key={key} className={`nav-btn ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}>
                  <span className="n-ico"><Icon name={key} /></span>{navMeta[key][0]}
                  {key === 'settings' && unreadCount ? <span className="nav-pill">{unreadCount}</span> : null}
                  {key === 'vote' && pendingVoteCount > 0 ? <span className="nav-pill">{pendingVoteCount}</span> : null}
                  {key === 'groups' && pendingVoteCount > 0 ? <span className="nav-pill">{pendingVoteCount}</span> : null}
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
              <button className="icon-btn" onClick={() => setPage('settings')}><Icon name="bell" />{unreadCount ? <span className="n-badge" /> : null}</button>
              <button className="btn btn-secondary btn-sm" onClick={logout}>Log out</button>
            </div>
          </div>

          <div className="page-wrap">
            {loading ? <div className="card">Loading your workspace…</div> : null}
            {error ? <div className="auth-hint auth-error mb-4">{error}</div> : null}

            {page === 'home' && dashboard && (
              <HomePage
                dashboard={dashboard}
                groups={groups}
                expenses={expenses}
                groupMonthlyTotals={groupMonthlyTotals}
                balanceModal={balanceModal}
                setBalanceModal={setBalanceModal}
                setPage={setPage}
                setSelectedGroup={setSelectedGroup}
              />
            )}

            {page === 'groupDetail' && selectedGroup && (
              <GroupDetailPage
                selectedGroup={selectedGroup}
                expenses={expenses}
                votes={votes}
                setPage={setPage}
              />
            )}

            {page === 'analytics' && analytics && (
              <AnalyticsPage analytics={analytics} expenses={expenses} groups={groups} userId={session.user.id} />
            )}

            {page === 'groups' && (
              <GroupsPage
                groups={groups}
                invites={invites}
                votes={votes}
                groupForm={groupForm}
                setGroupForm={setGroupForm}
                savingGroup={savingGroup}
                showGroupModal={showGroupModal}
                setShowGroupModal={setShowGroupModal}
                inviteEntries={inviteEntries}
                inviteCountPreview={inviteCountPreview}
                resetGroupForm={resetGroupForm}
                addInviteEmail={addInviteEmail}
                removeInviteEmail={removeInviteEmail}
                saveGroup={saveGroup}
                startEditGroup={startEditGroup}
                respondInvite={respondInvite}
                handleLeaveGroup={handleLeaveGroup}
                handleDeleteGroup={handleDeleteGroup}
                setPage={setPage}
              />
            )}

            {page === 'add' && (
              <AddExpensePage
                groups={groups}
                expenseForm={expenseForm}
                setExpenseForm={setExpenseForm}
                memberShares={memberShares}
                splitInputs={splitInputs}
                percentTotal={percentTotal}
                customTotal={customTotal}
                updatePercentSplit={updatePercentSplit}
                updateCustomSplit={updateCustomSplit}
                applyEvenPercentSplit={applyEvenPercentSplit}
                applyEvenCustomSplit={applyEvenCustomSplit}
                submitExpense={submitExpense}
              />
            )}

            {page === 'vote' && (
              <VotePage votes={votes} onRespond={handleVoteResponse} />
            )}

            {page === 'chat' && (
              <ChatPage
                chatMessages={chatMessages}
                chatMessagesRef={chatMessagesRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChat={sendChat}
                userInitials={session.user.initials}
              />
            )}

            {page === 'progress' && (
              <ProgressPage
                challengesState={challengesState}
                challengeForm={challengeForm}
                setChallengeForm={setChallengeForm}
                groups={groups}
                contributionAmounts={contributionAmounts}
                setContributionAmounts={setContributionAmounts}
                createChallengeSubmit={createChallengeSubmit}
                addContribution={addContribution}
              />
            )}

            {page === 'settings' && settings && (
              <SettingsPage
                settings={settings}
                session={session}
                notifications={notifications}
                saveSettings={saveSettings}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function HomePage({ dashboard, groups, expenses, groupMonthlyTotals, balanceModal, setBalanceModal, setPage, setSelectedGroup }) {
  return (
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
                      <div className="modal-group-tags">{person.groups.map((group) => <span className="tag tag-muted" key={group.id}>{group.name}</span>)}</div>
                    </div>
                    <div className={`p-amount ${balanceModal === 'owedToYou' ? 'teal' : 'red'}`}>{money(person.amount)}</div>
                  </div>
                ))}
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
  );
}

function GroupDetailPage({ selectedGroup, expenses, votes, setPage }) {
  const groupExpenses = expenses.filter((item) => item.groupId === selectedGroup.id);
  const pendingGroupVotes = votes.filter((item) => item.status === 'pending' && item.groupId === selectedGroup.id);
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
            const yesCount = vote.decisions?.filter((decision) => decision.decision === 'yes').length ?? 0;
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
                <div className="act-type">{new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function GroupsPage({
  groups,
  invites,
  votes,
  groupForm,
  setGroupForm,
  savingGroup,
  showGroupModal,
  setShowGroupModal,
  inviteEntries,
  inviteCountPreview,
  resetGroupForm,
  addInviteEmail,
  removeInviteEmail,
  saveGroup,
  startEditGroup,
  respondInvite,
  handleLeaveGroup,
  handleDeleteGroup,
  setPage
}) {
  const pendingVotes = votes.filter((vote) => vote.status === 'pending');

  return (
    <div className="page show">
      {pendingVotes.length > 0 ? (
        <div className="card mb-4" style={{ borderLeft: '3px solid var(--accent, #6c63ff)' }}>
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Group Voting</span>
            <span className="nav-pill">{pendingVotes.length}</span>
          </div>
          <div style={{ padding: '0 20px 16px', color: 'var(--text-2)', fontSize: '14px' }}>
            {pendingVotes.length === 1 ? 'There is 1 pending group vote that needs your attention.' : `There are ${pendingVotes.length} pending group votes that need your attention.`}
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
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active groups</span>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => { resetGroupForm(); setShowGroupModal(true); }}>+ Add</button>
          </div>
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
                    {group.isOwner
                      ? <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteGroup(group)}>Delete</button>
                      : <button className="btn btn-danger btn-sm" type="button" onClick={() => handleLeaveGroup(group)}>Leave</button>}
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
                  {(group.pendingInvites ?? []).map((invite) => (
                    <div className="member-pill member-pill-pending" key={invite.id} title="Invitation pending">
                      {invite.email} <span className="pill-status">pending</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {groupForm.id ? (
          <GroupFormCard
            title="Edit group"
            submitLabel={savingGroup ? 'Saving…' : 'Save changes'}
            groupForm={groupForm}
            setGroupForm={setGroupForm}
            savingGroup={savingGroup}
            inviteEntries={inviteEntries}
            inviteCountPreview={inviteCountPreview}
            addInviteEmail={addInviteEmail}
            removeInviteEmail={removeInviteEmail}
            onSubmit={saveGroup}
            secondaryAction={{ label: 'Cancel', onClick: resetGroupForm }}
            className="card sticky-card"
          />
        ) : null}
      </div>
      <div className="drawer-overlay" style={{ display: showGroupModal ? 'block' : 'none' }} onClick={() => setShowGroupModal(false)} />
      <div className={`drawer ${showGroupModal ? 'open' : ''}`}>
        <div className="drawer-head">
          <span>Create a group</span>
          <button className="modal-close" type="button" onClick={() => setShowGroupModal(false)}>×</button>
        </div>
        <div className="drawer-body">
          <GroupFormCard
            title={null}
            submitLabel={savingGroup ? 'Saving…' : 'Create group'}
            groupForm={groupForm}
            setGroupForm={setGroupForm}
            savingGroup={savingGroup}
            inviteEntries={inviteEntries}
            inviteCountPreview={inviteCountPreview}
            addInviteEmail={addInviteEmail}
            removeInviteEmail={removeInviteEmail}
            onSubmit={async (event) => {
              await saveGroup(event);
              setShowGroupModal(false);
            }}
            secondaryAction={{ label: 'Cancel', onClick: () => setShowGroupModal(false) }}
          />
        </div>
      </div>
    </div>
  );
}

function GroupFormCard({
  title,
  submitLabel,
  groupForm,
  setGroupForm,
  savingGroup,
  inviteEntries,
  inviteCountPreview,
  addInviteEmail,
  removeInviteEmail,
  onSubmit,
  secondaryAction,
  className = 'card'
}) {
  return (
    <div className={className}>
      {title ? <div className="card-head">{title}</div> : null}
      <form onSubmit={onSubmit} className="stack-form">
        <label className="f-label">Group name</label>
        <input className="f-inp" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g. Summer Apartment" />
        <label className="f-label">Group type</label>
        <select className="f-inp" value={groupForm.type} onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}>
          <option value="roommates">Roommates</option>
          <option value="trip">Trip</option>
          <option value="household">Household</option>
          <option value="custom">Custom</option>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInviteEmail();
              }
            }}
            placeholder="friend@example.com"
          />
          <button className="btn btn-secondary" type="button" onClick={addInviteEmail}>Add</button>
        </div>
        <div className="scanner-hint">Invite people using the exact email address they will use to create or sign in to their SplitStack account.</div>
        <div className="member-helper row-b"><span>{inviteCountPreview} people after save</span><span>Owner + accepted members + pending email invites</span></div>
        <div className="member-stack member-stack-edit">
          {inviteEntries.length
            ? inviteEntries.map((entry) => <button className="member-pill removable-pill" type="button" key={entry.email} onClick={() => removeInviteEmail(entry.email)}>{entry.email} <span>×</span></button>)
            : <div className="member-placeholder">No invite emails added yet.</div>}
        </div>
        <label className="f-label">Description</label>
        <textarea className="f-inp" rows="3" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="What is this group for?" />
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={savingGroup}>{submitLabel}</button>
          <button className="btn btn-secondary" type="button" onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
        </div>
      </form>
    </div>
  );
}

function AddExpensePage({
  groups,
  expenseForm,
  setExpenseForm,
  memberShares,
  splitInputs,
  percentTotal,
  customTotal,
  updatePercentSplit,
  updateCustomSplit,
  applyEvenPercentSplit,
  applyEvenCustomSplit,
  submitExpense
}) {
  const amountNumber = Number(expenseForm.amount || 0);

  return (
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
  );
}

function VotePage({ votes, onRespond }) {
  return (
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
              {vote.decisions.filter((decision) => decision.decision === 'yes').length} / {vote.memberCount} voted yes — unanimous approval required
            </div>
            {vote.decisions.map((decision) => (
              <div className="vc-voter" key={decision.userId}><span className="vote-dot" style={{ background: decision.decision === 'yes' ? '#22C55E' : '#EF4444' }} />{decision.name} voted {decision.decision}</div>
            ))}
          </div>
          <div className="vc-actions">
            <button className="btn-vote-yes" onClick={() => onRespond(vote.id, 'yes')}>Approve</button>
            <button className="btn-vote-no" onClick={() => onRespond(vote.id, 'no')}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPage({ chatMessages, chatMessagesRef, chatInput, setChatInput, sendChat, userInitials }) {
  return (
    <div className="page show" style={{ padding: 0 }}>
      <div className="chat-wrap"><div className="chat-quick">{['Who owes the most?', 'How much did we spend on groceries?', 'Any pending votes?', 'How are our challenges doing?'].map((prompt) => <button className="cq-btn" key={prompt} onClick={() => sendChat(prompt)}>{prompt}</button>)}</div><div id="chat-msgs" ref={chatMessagesRef}>{chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`msg-wrap ${message.role === 'user' ? 'user' : ''}`}><div className={`msg-ava ${message.role}`}>{message.role === 'user' ? userInitials : 'AI'}</div><div><div className={`msg-bub ${message.role}`}>{message.text}</div></div></div>)}</div><div className="chat-input-bar"><textarea id="chat-inp" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask about balances, group spending, savings, or votes…" rows="1" /><button className="chat-send-btn" onClick={() => sendChat()}><Icon name="send" /></button></div></div>
    </div>
  );
}

function ProgressPage({
  challengesState,
  challengeForm,
  setChallengeForm,
  groups,
  contributionAmounts,
  setContributionAmounts,
  createChallengeSubmit,
  addContribution
}) {
  return (
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
  );
}

function SettingsPage({ settings, session, notifications, saveSettings }) {
  return (
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
  );
}

function CategoryDropdown({ cat, max }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bar-row">
      <div className="row-b" onClick={() => setOpen((current) => !current)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: 'var(--muted)' }}><path d="M9 18l6-6-6-6" /></svg>
          {cat.category}
        </span>
        <strong>{money(cat.total)}</strong>
      </div>
      <div className="bar-shell"><div className="bar-fill" style={{ width: `${max ? (cat.total / max) * 100 : 0}%` }} /></div>
      {open && (
        <div style={{ marginTop: 10, paddingLeft: 18, borderLeft: '2px solid var(--border)' }}>
          {cat.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.description}</div>
                <div className="card-sub">{item.groupName} · {item.expenseDate || ''}</div>
              </div>
              <strong style={{ flexShrink: 0, marginLeft: 12 }}>{money(item.myShare)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsPage({ analytics, expenses, groups, userId }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const userShare = (expense) => expense.splits?.find((split) => split.userId === userId)?.amount ?? 0;

  const monthExpenses = selectedMonth
    ? expenses.filter((expense) => (expense.expenseDate || expense.createdAt || '').slice(0, 7) === selectedMonth)
    : [];

  const monthByCategory = Object.values(
    monthExpenses.reduce((acc, expense) => {
      const share = userShare(expense);
      if (share <= 0) return acc;
      acc[expense.category] ??= { category: expense.category, total: 0, items: [] };
      acc[expense.category].total += share;
      acc[expense.category].items.push({ ...expense, myShare: share });
      return acc;
    }, {})
  )
    .sort((first, second) => second.total - first.total)
    .map((cat) => ({ ...cat, items: cat.items.sort((first, second) => second.myShare - first.myShare) }));

  const monthLabel = selectedMonth
    ? new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="page show">
      <div className="g4">
        <StatCard label="Total spend" value={money(analytics.totalSpend)} />
        <StatCard label="Avg spend / month" value={money(analytics.avgPerMonth)} />
        <StatCard label="Expenses logged" value={analytics.expenseCount} />
        <StatCard label="Accepted groups" value={groups.length} />
      </div>
      <div className="g2 mt-4">
        <div className="card">
          <div className="card-head">Monthly spend trend</div>
          <div className="card-sub" style={{ marginBottom: 8 }}>Click a month to see your breakdown</div>
          <MonthBarChart data={analytics.monthlyTrend} selected={selectedMonth} onSelect={setSelectedMonth} />
        </div>
        <div className="card">
          <div className="card-head">Spend by category</div>
          {analytics.byCategory.map((item) => <BarRow key={item.category} label={item.category} value={item.total} max={analytics.byCategory[0]?.total || 1} />)}
        </div>
      </div>
      {selectedMonth && (
        <div className="mt-4">
          <div className="card">
            <div className="card-head" style={{ justifyContent: 'space-between' }}>
              <span>{monthLabel} breakdown</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMonth(null)}>✕ Close</button>
            </div>
            {monthByCategory.length === 0 ? <div className="card-sub">No expenses for this month.</div> : monthByCategory.map((cat) => <CategoryDropdown key={cat.category} cat={cat} max={monthByCategory[0]?.total || 1} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return <div className="card stat-card"><div className="card-sub">{label}</div><div className="stat-val">{value}</div></div>;
}

function BarRow({ label, value, max }) {
  return <div className="bar-row"><div className="row-b"><span>{label}</span><strong>{money(value)}</strong></div><div className="bar-shell"><div className="bar-fill" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div></div>;
}

function MonthBarChart({ data, selected, onSelect }) {
  if (!data || data.length === 0) return <div className="card-sub">No data yet.</div>;
  const maxVal = Math.max(...data.map((item) => item.total), 1);
  const chartH = 160;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: chartH + 56, paddingTop: 24, overflowX: 'auto' }}>
      {data.map((item) => {
        const [year, mon] = item.month.split('-');
        const label = new Date(Number(year), Number(mon) - 1).toLocaleString('default', { month: 'short' });
        const barH = Math.max(Math.round((item.total / maxVal) * chartH), 4);
        const isSelected = selected === item.month;
        return (
          <div key={item.month} onClick={() => onSelect(isSelected ? null : item.month)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 40px', minWidth: 40, cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? 'var(--teal)' : 'var(--muted)', marginBottom: 4 }}>{money(item.total)}</div>
            <div style={{ width: '100%', height: barH, borderRadius: '6px 6px 0 0', background: isSelected ? 'linear-gradient(180deg, var(--teal-mid), var(--teal))' : 'var(--border)', transition: 'background 0.15s' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--teal)' : 'var(--muted)', marginTop: 6 }}>{label}</div>
            {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', marginTop: 4 }} />}
          </div>
        );
      })}
    </div>
  );
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
