import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'models.dart';

class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      baseUrl = baseUrl ?? _defaultBaseUrl();

  final http.Client _client;
  final String baseUrl;

  Future<UserSession> login({
    required String email,
    required String password,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return UserSession.fromJson(json);
  }

  Future<UserSession> register({
    required String name,
    required String email,
    required String password,
    String? avatarEmoji,
  }) async {
    final json = await _request(
      'POST',
      '/api/auth/register',
      body: {
        'name': name,
        'email': email,
        'password': password,
        if (avatarEmoji != null && avatarEmoji.isNotEmpty)
          'avatarEmoji': avatarEmoji,
      },
    );
    return UserSession.fromJson(json);
  }

  Future<User> getMe(String token) async {
    final json = await _request('GET', '/api/me', token: token);
    return User.fromJson(json['user'] as Map<String, dynamic>? ?? const {});
  }

  Future<User> updateMe(String token, {required String avatarEmoji}) async {
    final json = await _request(
      'PUT',
      '/api/me',
      token: token,
      body: {'avatarEmoji': avatarEmoji},
    );
    return User.fromJson(json['user'] as Map<String, dynamic>? ?? const {});
  }

  Future<DashboardData> getDashboard(String token) async {
    final json = await _request('GET', '/api/dashboard', token: token);
    return DashboardData.fromJson(json);
  }

  Future<List<Group>> getGroups(String token) async {
    final json = await _request('GET', '/api/groups', token: token);
    return _mapList(json['groups'], Group.fromJson);
  }

  Future<List<GroupInvite>> getInvites(String token) async {
    final json = await _request('GET', '/api/invites', token: token);
    return _mapList(json['invites'], GroupInvite.fromJson);
  }

  Future<List<AppNotification>> getNotifications(String token) async {
    final json = await _request('GET', '/api/notifications', token: token);
    return _mapList(json['notifications'], AppNotification.fromJson);
  }

  Future<List<Expense>> getExpenses(String token) async {
    final json = await _request('GET', '/api/expenses', token: token);
    return _mapList(json['expenses'], Expense.fromJson);
  }

  Future<List<Vote>> getVotes(String token) async {
    final json = await _request('GET', '/api/votes', token: token);
    return _mapList(json['votes'], Vote.fromJson);
  }

  Future<AnalyticsData> getAnalytics(String token) async {
    final json = await _request('GET', '/api/analytics', token: token);
    return AnalyticsData.fromJson(json);
  }

  Future<ChallengeData> getChallenges(String token) async {
    final json = await _request('GET', '/api/challenges', token: token);
    return ChallengeData.fromJson(json);
  }

  Future<SettingsData> getSettings(String token) async {
    final json = await _request('GET', '/api/settings', token: token);
    return SettingsData.fromJson(
      json['settings'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<void> createGroup(
    String token, {
    required String name,
    required String type,
    required double threshold,
    required String description,
    required List<String> inviteEmails,
  }) async {
    await _request(
      'POST',
      '/api/groups',
      token: token,
      body: {
        'name': name,
        'type': type,
        'threshold': threshold,
        'description': description,
        'inviteEmails': inviteEmails,
      },
    );
  }

  Future<void> updateGroup(
    String token, {
    required String groupId,
    required String name,
    required String type,
    required double threshold,
    required String description,
    required List<String> inviteEmails,
  }) async {
    await _request(
      'PUT',
      '/api/groups/$groupId',
      token: token,
      body: {
        'name': name,
        'type': type,
        'threshold': threshold,
        'description': description,
        'inviteEmails': inviteEmails,
      },
    );
  }

  Future<void> deleteGroup(String token, {required String groupId}) {
    return _request('DELETE', '/api/groups/$groupId', token: token);
  }

  Future<void> leaveGroup(String token, {required String groupId}) {
    return _request('DELETE', '/api/groups/$groupId/membership', token: token);
  }

  Future<void> createChallenge(
    String token, {
    required String groupId,
    required String name,
    required String description,
    required double goal,
    String endDate = '',
  }) {
    return _request(
      'POST',
      '/api/challenges',
      token: token,
      body: {
        'groupId': groupId,
        'name': name,
        'description': description,
        'goal': goal,
        if (endDate.isNotEmpty) 'endDate': endDate,
      },
    );
  }

  Future<Challenge> contributeToChallenge(
    String token, {
    required String challengeId,
    required double amount,
  }) async {
    final json = await _request(
      'POST',
      '/api/challenges/$challengeId/contribute',
      token: token,
      body: {'amount': amount},
    );
    return Challenge.fromJson(
      json['challenge'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<void> respondToInvite(
    String token, {
    required String inviteId,
    required String decision,
  }) {
    return _request(
      'POST',
      '/api/invites/$inviteId/respond',
      token: token,
      body: {'decision': decision},
    );
  }

  Future<Map<String, dynamic>> createExpense(
    String token, {
    required Map<String, dynamic> payload,
  }) {
    return _request('POST', '/api/expenses', token: token, body: payload);
  }

  Future<String> uploadReceipt(
    String token, {
    required Uint8List bytes,
    required String mimeType,
    String? fileName,
  }) async {
    final uri = Uri.parse('$baseUrl/api/receipts');
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': mimeType,
        'Authorization': 'Bearer $token',
        if (fileName != null && fileName.trim().isNotEmpty)
          'X-Receipt-File-Name': fileName.trim(),
      },
      body: bytes,
    );
    final json = _decodeResponse(response);
    final receiptUrl = (json['receiptUrl'] ?? '').toString();
    if (receiptUrl.isEmpty) {
      throw ApiException(
        message: 'Receipt upload did not return a saved image URL.',
        statusCode: response.statusCode,
      );
    }
    return receiptUrl;
  }

  Future<void> recordExpensePayment(
    String token, {
    required String expenseId,
    required String method,
    String note = '',
  }) {
    return _request(
      'POST',
      '/api/expenses/$expenseId/settlements',
      token: token,
      body: {'method': method, 'note': note},
    );
  }

  Future<void> respondToVote(
    String token, {
    required String voteId,
    required String decision,
  }) {
    return _request(
      'POST',
      '/api/votes/$voteId/respond',
      token: token,
      body: {'decision': decision},
    );
  }

  Future<void> undoVote(String token, {required String voteId}) {
    return _request('DELETE', '/api/votes/$voteId/respond', token: token);
  }

  Future<void> markNotificationRead(
    String token, {
    required String notificationId,
  }) {
    return _request(
      'POST',
      '/api/notifications/$notificationId/read',
      token: token,
    );
  }

  Future<SettingsData> updateSettings(
    String token, {
    required SettingsData settings,
  }) async {
    final json = await _request(
      'PUT',
      '/api/settings',
      token: token,
      body: settings.toJson(),
    );
    return SettingsData.fromJson(
      json['settings'] as Map<String, dynamic>? ?? const {},
    );
  }

  Future<BudgetGoal> getBudgetGoal(String token) async {
    final json = await _request('GET', '/api/budget', token: token);
    return BudgetGoal.fromJson(json['goal'] as Map<String, dynamic>);
  }

  Future<BudgetGoal> saveBudgetGoal(
    String token, {
    required double total,
    required Map<String, double> breakdown,
  }) async {
    final json = await _request(
      'POST',
      '/api/budget',
      token: token,
      body: {'total': total, 'breakdown': breakdown},
    );
    return BudgetGoal.fromJson(json['goal'] as Map<String, dynamic>);
  }

  Future<String> sendChat(String token, {required String message}) async {
    final json = await _request(
      'POST',
      '/api/ai/chat',
      token: token,
      body: {'message': message},
    );
    return (json['reply'] ?? '').toString();
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    String? token,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    late final http.Response response;
    final encoded = body == null ? null : jsonEncode(body);
    switch (method) {
      case 'GET':
        response = await _client.get(uri, headers: headers);
      case 'POST':
        response = await _client.post(uri, headers: headers, body: encoded);
      case 'PUT':
        response = await _client.put(uri, headers: headers, body: encoded);
      case 'DELETE':
        response = await _client.delete(uri, headers: headers, body: encoded);
      default:
        throw UnsupportedError('Unsupported method $method');
    }

    return _decodeResponse(response);
  }

  static String _defaultBaseUrl() {
    const overridden = String.fromEnvironment('API_BASE_URL');
    if (overridden.isNotEmpty) return overridden;
    if (kIsWeb) return 'http://localhost:3001';
    if (Platform.isAndroid) return 'http://10.0.2.2:3001';
    return 'http://127.0.0.1:3001';
  }
}

Map<String, dynamic> _decodeResponse(http.Response response) {
  final text = response.body.trim();
  Map<String, dynamic> json = {};
  if (text.isNotEmpty) {
    try {
      final decoded = jsonDecode(text);
      if (decoded is Map) {
        json = Map<String, dynamic>.from(decoded);
      } else {
        json = {'message': text};
      }
    } catch (_) {
      json = {'message': text};
    }
  }

  if (response.statusCode >= 400) {
    throw ApiException(
      message: (json['message'] ?? 'Request failed (${response.statusCode})')
          .toString(),
      statusCode: response.statusCode,
    );
  }

  return json;
}

class ApiException implements Exception {
  ApiException({required this.message, required this.statusCode});

  final String message;
  final int statusCode;

  @override
  String toString() => message;
}

List<T> _mapList<T>(dynamic raw, T Function(Map<String, dynamic> json) parser) {
  final items = raw is List ? raw : const [];
  return items
      .whereType<Map>()
      .map((item) => parser(Map<String, dynamic>.from(item)))
      .toList();
}
