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

  String? _token;
  User? user;
  DashboardData? dashboard;
  AnalyticsData? analytics;
  List<Group> groups = const [];
  List<GroupInvite> invites = const [];
  List<Expense> expenses = const [];
  List<Vote> votes = const [];
  SettingsData? settings;
  List<ChatMessage> chatMessages = [
    ChatMessage(
      role: 'assistant',
      text:
          'Hi! I am the SplitStack assistant. Ask me about balances, spending, votes, or challenges.',
    ),
  ];

  bool get isAuthenticated => _token != null && user != null;
  String get apiBaseUrl => apiClient.baseUrl;

  Future<void> initialize() async {
    _token = await sessionStore.readToken();
    if (_token != null) {
      try {
        await refreshAll(showLoader: false);
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
        apiClient.getExpenses(token),
        apiClient.getVotes(token),
        apiClient.getAnalytics(token),
        apiClient.getSettings(token),
      ]);

      user = results[0] as User;
      dashboard = results[1] as DashboardData;
      groups = results[2] as List<Group>;
      invites = results[3] as List<GroupInvite>;
      expenses = results[4] as List<Expense>;
      votes = results[5] as List<Vote>;
      analytics = results[6] as AnalyticsData;
      settings = results[7] as SettingsData;
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
    } finally {
      loading = false;
      notifyListeners();
    }
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
    } finally {
      savingSettings = false;
      notifyListeners();
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
    } finally {
      sendingChat = false;
      notifyListeners();
    }
  }

  Future<void> logout({bool notify = true}) async {
    await sessionStore.clear();
    _token = null;
    user = null;
    dashboard = null;
    analytics = null;
    groups = const [];
    invites = const [];
    expenses = const [];
    votes = const [];
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
    } catch (error) {
      errorMessage = error.toString();
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  String _requireToken() {
    final token = _token;
    if (token == null) throw StateError('Not authenticated');
    return token;
  }

  bool _isAuthError(String message) {
    final lower = message.toLowerCase();
    return lower.contains('session') ||
        lower.contains('authentication') ||
        lower.contains('invalid');
  }
}
