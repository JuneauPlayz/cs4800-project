import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/api_client.dart';
import '../data/models.dart';
import '../data/session_store.dart';

class AppController extends ChangeNotifier {
  AppController({required this.apiClient, required this.sessionStore});

  final ApiClient apiClient;
  final SessionStore sessionStore;

  bool initializing = true;
  bool loading = false;
  bool sendingChat = false;
  bool savingSettings = false;
  String? errorMessage;

  Timer? _pollTimer;
  bool _polling = false;
  String? _token;
  User? user;
  DashboardData? dashboard;
  AnalyticsData? analytics;
  List<Group> groups = const [];
  List<GroupInvite> invites = const [];
  List<AppNotification> notifications = const [];
  List<Expense> expenses = const [];
  List<Vote> votes = const [];
  ChallengeData? challengeData;
  SettingsData? settings;
  BudgetGoal? budgetGoal;
  List<ChatMessage> chatMessages = [
    ChatMessage(
      role: 'assistant',
      text:
          'Hi! I am the SplitStack assistant. Ask me about balances, spending, votes, or challenges.',
    ),
  ];

  bool get isAuthenticated => _token != null && user != null;
  String get apiBaseUrl => apiClient.baseUrl;
  int get unreadCount =>
      notifications.where((notification) => notification.unread).length +
      invites.length;

  Future<void> initialize() async {
    _token = await sessionStore.readToken();
    if (_token != null) {
      try {
        await refreshAll(showLoader: false);
        _startPolling();
      } catch (_) {
        await logout(notify: false);
      }
    }
    initializing = false;
    notifyListeners();
  }

  Future<void> login({required String email, required String password}) async {
    await _authenticate(
      action: () => apiClient.login(email: email, password: password),
    );
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? avatarEmoji,
  }) async {
    await _authenticate(
      action: () => apiClient.register(
        name: name,
        email: email,
        password: password,
        avatarEmoji: avatarEmoji,
      ),
    );
  }

  Future<void> refreshAll({bool showLoader = true}) async {
    final token = _token;
    if (token == null) return;

    if (showLoader) {
      loading = true;
      errorMessage = null;
      notifyListeners();
    }

    try {
      final results = await Future.wait([
        apiClient.getMe(token),
        apiClient.getDashboard(token),
        apiClient.getGroups(token),
        apiClient.getInvites(token),
        apiClient.getNotifications(token),
        apiClient.getExpenses(token),
        apiClient.getVotes(token),
        apiClient.getAnalytics(token),
        apiClient.getSettings(token),
        apiClient.getChallenges(token),
        apiClient.getBudgetGoal(token),
      ]);

      user = results[0] as User;
      dashboard = results[1] as DashboardData;
      groups = results[2] as List<Group>;
      invites = results[3] as List<GroupInvite>;
      notifications = results[4] as List<AppNotification>;
      expenses = results[5] as List<Expense>;
      votes = results[6] as List<Vote>;
      analytics = results[7] as AnalyticsData;
      settings = results[8] as SettingsData;
      challengeData = results[9] as ChallengeData;
      budgetGoal = results[10] as BudgetGoal;
      errorMessage = null;
    } catch (error) {
      final message = error.toString();
      errorMessage = message;
      if (_isAuthError(message)) {
        await logout(notify: false);
      }
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> createGroup({
    required String name,
    required String type,
    required double threshold,
    required String description,
    required List<String> inviteEmails,
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.createGroup(
        token,
        name: name,
        type: type,
        threshold: threshold,
        description: description,
        inviteEmails: inviteEmails,
      );
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> updateGroup({
    required String groupId,
    required String name,
    required String type,
    required double threshold,
    required String description,
    required List<String> inviteEmails,
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.updateGroup(
        token,
        groupId: groupId,
        name: name,
        type: type,
        threshold: threshold,
        description: description,
        inviteEmails: inviteEmails,
      );
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> deleteGroup(String groupId) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.deleteGroup(token, groupId: groupId);
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> leaveGroup(String groupId) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.leaveGroup(token, groupId: groupId);
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String?> createExpense(Map<String, dynamic> payload) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      final json = await apiClient.createExpense(token, payload: payload);
      await refreshAll(showLoader: false);
      final triggeredVote = json['triggeredVote'];
      return triggeredVote?.toString();
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> recordExpensePayment({
    required String expenseId,
    required String method,
    String note = '',
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.recordExpensePayment(
        token,
        expenseId: expenseId,
        method: method,
        note: note,
      );
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> createChallenge({
    required String groupId,
    required String name,
    required String description,
    required double goal,
    String endDate = '',
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.createChallenge(
        token,
        groupId: groupId,
        name: name,
        description: description,
        goal: goal,
        endDate: endDate,
      );
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> contributeToChallenge({
    required String challengeId,
    required double amount,
  }) async {
    final token = _requireToken();
    final previousChallengeData = challengeData;
    errorMessage = null;
    _addLocalContribution(challengeId: challengeId, amount: amount);
    notifyListeners();
    try {
      final updatedChallenge = await apiClient.contributeToChallenge(
        token,
        challengeId: challengeId,
        amount: amount,
      );
      _replaceChallenge(updatedChallenge);
      notifyListeners();
    } catch (error) {
      challengeData = previousChallengeData;
      _setError(error);
      notifyListeners();
      rethrow;
    }
  }

  void _addLocalContribution({
    required String challengeId,
    required double amount,
  }) {
    final data = challengeData;
    final currentUser = user;
    if (data == null || currentUser == null) return;

    final now = DateTime.now().toIso8601String();
    final nextChallenges = data.challenges.map((challenge) {
      if (challenge.id != challengeId) return challenge;

      return Challenge(
        id: challenge.id,
        groupId: challenge.groupId,
        groupName: challenge.groupName,
        name: challenge.name,
        description: challenge.description,
        goal: challenge.goal,
        current: challenge.current + amount,
        unit: challenge.unit,
        color: challenge.color,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        createdByName: challenge.createdByName,
        contributions: [
          ChallengeContribution(
            id: 'local-$now',
            userId: currentUser.id,
            amount: amount,
            createdAt: now,
            name: currentUser.name,
            initials: currentUser.initials,
            avatarColor: currentUser.avatarColor,
            avatarEmoji: currentUser.avatarEmoji,
          ),
          ...challenge.contributions,
        ],
      );
    }).toList();

    _setChallenges(nextChallenges);
  }

  Future<void> respondToInvite({
    required String inviteId,
    required bool accept,
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.respondToInvite(
        token,
        inviteId: inviteId,
        decision: accept ? 'accepted' : 'declined',
      );
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> respondToVote({
    required String voteId,
    required String decision,
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.respondToVote(token, voteId: voteId, decision: decision);
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> undoVote({required String voteId}) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await apiClient.undoVote(token, voteId: voteId);
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> saveBudget({
    required double total,
    required Map<String, double> breakdown,
  }) async {
    final token = _requireToken();
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      budgetGoal = await apiClient.saveBudgetGoal(
        token,
        total: total,
        breakdown: breakdown,
      );
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> saveSettings(SettingsData next) async {
    final token = _requireToken();
    savingSettings = true;
    errorMessage = null;
    notifyListeners();
    try {
      settings = await apiClient.updateSettings(token, settings: next);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      savingSettings = false;
      notifyListeners();
    }
  }

  Future<void> markNotificationRead(String notificationId) async {
    final token = _requireToken();
    final previous = notifications;
    notifications = notifications
        .map(
          (notification) => notification.id == notificationId
              ? AppNotification(
                  id: notification.id,
                  type: notification.type,
                  title: notification.title,
                  body: notification.body,
                  unread: false,
                  createdAt: notification.createdAt,
                )
              : notification,
        )
        .toList();
    notifyListeners();
    try {
      await apiClient.markNotificationRead(
        token,
        notificationId: notificationId,
      );
    } catch (error) {
      notifications = previous;
      _setError(error);
      notifyListeners();
      rethrow;
    }
  }

  Future<void> saveAvatar(String avatarEmoji) async {
    final token = _requireToken();
    savingSettings = true;
    errorMessage = null;
    notifyListeners();
    try {
      user = await apiClient.updateMe(token, avatarEmoji: avatarEmoji);
      await refreshAll(showLoader: false);
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      savingSettings = false;
      notifyListeners();
    }
  }

  Future<void> sendChatMessage(String message) async {
    final token = _requireToken();
    final trimmed = message.trim();
    if (trimmed.isEmpty) return;
    chatMessages = [...chatMessages, ChatMessage(role: 'user', text: trimmed)];
    sendingChat = true;
    errorMessage = null;
    notifyListeners();

    try {
      final reply = await apiClient.sendChat(token, message: trimmed);
      chatMessages = [
        ...chatMessages,
        ChatMessage(role: 'assistant', text: reply),
      ];
    } catch (error) {
      _setError(error);
      rethrow;
    } finally {
      sendingChat = false;
      notifyListeners();
    }
  }

  Future<void> logout({bool notify = true}) async {
    _stopPolling();
    await sessionStore.clear();
    _token = null;
    user = null;
    dashboard = null;
    analytics = null;
    groups = const [];
    invites = const [];
    notifications = const [];
    expenses = const [];
    votes = const [];
    challengeData = null;
    settings = null;
    chatMessages = [
      ChatMessage(
        role: 'assistant',
        text:
            'Hi! I am the SplitStack assistant. Ask me about balances, spending, votes, or challenges.',
      ),
    ];
    errorMessage = null;
    if (notify) notifyListeners();
  }

  Future<void> _authenticate({
    required Future<UserSession> Function() action,
  }) async {
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      final session = await action();
      _token = session.token;
      user = session.user;
      await sessionStore.writeToken(session.token);
      await refreshAll(showLoader: false);
      _startPolling();
    } catch (error) {
      errorMessage = error.toString();
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refreshRealtime() async {
    final token = _token;
    if (token == null || _polling) return;
    _polling = true;
    try {
      final results = await Future.wait([
        apiClient.getNotifications(token),
        apiClient.getInvites(token),
        apiClient.getChallenges(token),
        apiClient.getVotes(token),
      ]);
      notifications = results[0] as List<AppNotification>;
      invites = results[1] as List<GroupInvite>;
      challengeData = results[2] as ChallengeData;
      votes = results[3] as List<Vote>;
      notifyListeners();
    } catch (_) {
      // Realtime refresh is opportunistic; manual refresh surfaces errors.
    } finally {
      _polling = false;
    }
  }

  void _startPolling() {
    _stopPolling();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 4),
      (_) => unawaited(refreshRealtime()),
    );
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _polling = false;
  }

  @override
  void dispose() {
    _stopPolling();
    super.dispose();
  }

  void _replaceChallenge(Challenge updatedChallenge) {
    final data = challengeData;
    if (data == null) return;

    final nextChallenges = data.challenges
        .map(
          (challenge) => challenge.id == updatedChallenge.id
              ? updatedChallenge
              : challenge,
        )
        .toList();

    _setChallenges(nextChallenges);
  }

  void _setChallenges(List<Challenge> nextChallenges) {
    challengeData = ChallengeData(
      challenges: nextChallenges,
      rings: nextChallenges
          .take(3)
          .map(
            (challenge) => ChallengeRing(
              id: challenge.id,
              label: challenge.name,
              value: challenge.current,
              max: challenge.goal,
              color: challenge.color,
            ),
          )
          .toList(),
    );
  }

  String _requireToken() {
    final token = _token;
    if (token == null) throw StateError('Not authenticated');
    return token;
  }

  void _setError(Object error) {
    errorMessage = error.toString();
  }

  bool _isAuthError(String message) {
    final lower = message.toLowerCase();
    return lower.contains('session') ||
        lower.contains('authentication') ||
        lower.contains('invalid');
  }
}
