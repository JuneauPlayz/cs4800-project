import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

void main() {
  runApp(const SplitStackMobileApp());
}

const _configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');

String get defaultApiBaseUrl {
  if (_configuredApiBaseUrl.isNotEmpty) return _configuredApiBaseUrl;
  if (Platform.isAndroid) return 'http://10.0.2.2:3001/api';
  return 'http://127.0.0.1:3001/api';
}

class SplitStackMobileApp extends StatelessWidget {
  const SplitStackMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    const teal = Color(0xFF0D9488);
    const ink = Color(0xFF111827);

    return MaterialApp(
      title: 'SplitStack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: teal),
        scaffoldBackgroundColor: const Color(0xFFF4F7F6),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: ink,
          elevation: 0,
          centerTitle: false,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: teal,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ),
      home: const ChatShell(),
    );
  }
}

class SplitStackSession {
  const SplitStackSession({required this.token, required this.userName});

  final String token;
  final String userName;
}

class ChatMessage {
  const ChatMessage({required this.role, required this.text});

  final String role;
  final String text;

  Map<String, String> toJson() => {'role': role, 'text': text};
}

class AssistantChatResponse {
  const AssistantChatResponse({required this.reply, this.proposedAction});

  final String reply;
  final Map<String, dynamic>? proposedAction;
}

class SplitStackApi {
  SplitStackApi(String baseUrl)
    : baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');

  final String baseUrl;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 12);

  Future<SplitStackSession> login({
    required String email,
    required String password,
  }) async {
    final data = await _request(
      'POST',
      '/auth/login',
      body: {'email': email, 'password': password},
    );
    final user = Map<String, dynamic>.from(data['user'] as Map? ?? {});
    return SplitStackSession(
      token: '${data['token'] ?? ''}',
      userName: '${user['name'] ?? 'SplitStack user'}',
    );
  }

  Future<AssistantChatResponse> sendChat({
    required String token,
    required String message,
    required List<ChatMessage> history,
  }) async {
    final data = await _request(
      'POST',
      '/ai/chat',
      token: token,
      body: {
        'message': message,
        'history': history.map((message) => message.toJson()).toList(),
      },
    );
    final action = data['proposedAction'] is Map
        ? Map<String, dynamic>.from(data['proposedAction'] as Map)
        : null;
    return AssistantChatResponse(
      reply: '${data['reply'] ?? 'I could not read the assistant response.'}',
      proposedAction: action,
    );
  }

  Future<String> confirmAssistantAction({
    required String token,
    required Map<String, dynamic> action,
  }) async {
    final data = await _request(
      'POST',
      '/ai/actions/confirm',
      token: token,
      body: {'action': action},
    );
    return '${data['message'] ?? 'Saved that account change.'}';
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    String? token,
    Map<String, dynamic>? body,
  }) async {
    final request = await _client.openUrl(method, Uri.parse('$baseUrl$path'));
    request.headers.contentType = ContentType.json;
    if (token != null) {
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
    }
    if (body != null) request.write(jsonEncode(body));

    final response = await request.close().timeout(const Duration(seconds: 18));
    final text = await response.transform(utf8.decoder).join();
    final decoded = text.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(text) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        decoded['message'] ?? 'Request failed (${response.statusCode}).',
      );
    }
    return decoded;
  }

  void close() {
    _client.close(force: true);
  }
}

class ChatShell extends StatefulWidget {
  const ChatShell({super.key});

  @override
  State<ChatShell> createState() => _ChatShellState();
}

class _ChatShellState extends State<ChatShell> {
  final _emailController = TextEditingController(text: 'jordan@splitstack.app');
  final _passwordController = TextEditingController(text: 'demo123');
  final _baseUrlController = TextEditingController(text: defaultApiBaseUrl);
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  SplitStackSession? _session;
  SplitStackApi? _api;
  var _loading = false;
  var _sending = false;
  var _actionSaving = false;
  var _error = '';
  Map<String, dynamic>? _pendingAction;
  final List<ChatMessage> _messages = [
    const ChatMessage(
      role: 'ai',
      text: 'Hi! Ask me about balances, spending, votes, or challenges.',
    ),
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _baseUrlController.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    _api?.close();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      _api?.close();
      final api = SplitStackApi(_baseUrlController.text.trim());
      final session = await api.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      setState(() {
        _api = api;
        _session = session;
        _pendingAction = null;
        _messages
          ..clear()
          ..add(
            ChatMessage(
              role: 'ai',
              text:
                  'Welcome, ${session.userName}. What should we look at first?',
            ),
          );
      });
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send([String? prompt]) async {
    final api = _api;
    final session = _session;
    final question = (prompt ?? _messageController.text).trim();
    if (api == null || session == null || question.isEmpty || _sending) return;

    final history = _messages.length <= 8
        ? List<ChatMessage>.from(_messages)
        : _messages.sublist(_messages.length - 8);
    setState(() {
      _messages.add(ChatMessage(role: 'user', text: question));
      _messageController.clear();
      _sending = true;
      _pendingAction = null;
      _error = '';
    });
    _scrollToBottom();

    try {
      final response = await api.sendChat(
        token: session.token,
        message: question,
        history: history,
      );
      setState(() {
        _messages.add(ChatMessage(role: 'ai', text: response.reply));
        _pendingAction = response.proposedAction;
      });
      if (response.proposedAction != null) {
        unawaited(_showActionDialog(response.proposedAction!));
      }
    } catch (error) {
      final message = error.toString().replaceFirst('Exception: ', '');
      setState(() {
        _error = message;
        _messages.add(ChatMessage(role: 'ai', text: message));
      });
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToBottom();
    }
  }

  void _logout() {
    setState(() {
      _session = null;
      _pendingAction = null;
      _error = '';
      _messages
        ..clear()
        ..add(
          const ChatMessage(
            role: 'ai',
            text: 'Hi! Ask me about balances, spending, votes, or challenges.',
          ),
        );
    });
  }

  Future<void> _showActionDialog(Map<String, dynamic> action) async {
    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _AssistantActionDialog(action: action),
    );

    if (confirmed == true) {
      await _confirmAssistantAction(action);
      return;
    }

    if (!mounted) return;
    if (_pendingAction == action) {
      setState(() {
        _pendingAction = null;
        _messages.add(
          const ChatMessage(
            role: 'ai',
            text: 'No problem, I did not change your account data.',
          ),
        );
      });
      _scrollToBottom();
    }
  }

  Future<void> _confirmAssistantAction(Map<String, dynamic> action) async {
    final api = _api;
    final session = _session;
    if (api == null || session == null || _actionSaving) return;

    setState(() {
      _actionSaving = true;
      _error = '';
    });

    try {
      final message = await api.confirmAssistantAction(
        token: session.token,
        action: action,
      );
      setState(() {
        if (_pendingAction == action) _pendingAction = null;
        _messages.add(ChatMessage(role: 'ai', text: message));
      });
    } catch (error) {
      final message = error.toString().replaceFirst('Exception: ', '');
      setState(() {
        _error = message;
        _messages.add(ChatMessage(role: 'ai', text: message));
      });
    } finally {
      if (mounted) setState(() => _actionSaving = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SplitStack AI'),
        actions: [
          if (session != null)
            IconButton(
              tooltip: 'Log out',
              onPressed: _logout,
              icon: const Icon(Icons.logout_rounded),
            ),
        ],
      ),
      body: SafeArea(
        child: session == null
            ? _LoginPanel(
                onLogin: _login,
                loading: _loading,
                error: _error,
                emailController: _emailController,
                passwordController: _passwordController,
                baseUrlController: _baseUrlController,
              )
            : _ChatPanel(
                messages: _messages,
                sending: _sending,
                error: _error,
                messageController: _messageController,
                scrollController: _scrollController,
                onSend: _send,
              ),
      ),
    );
  }
}

class _LoginPanel extends StatelessWidget {
  const _LoginPanel({
    required this.onLogin,
    required this.loading,
    required this.error,
    required this.emailController,
    required this.passwordController,
    required this.baseUrlController,
  });

  final VoidCallback onLogin;
  final bool loading;
  final String error;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController baseUrlController;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 20),
        const Text(
          'Ask about your real shared spending.',
          style: TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.w800,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Sign in with a SplitStack account and chat through the same Gemini-backed API used by the website.',
          style: TextStyle(color: Colors.grey.shade700, height: 1.4),
        ),
        const SizedBox(height: 28),
        TextField(
          controller: baseUrlController,
          decoration: const InputDecoration(labelText: 'Backend API URL'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: passwordController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password'),
        ),
        if (error.isNotEmpty) ...[
          const SizedBox(height: 12),
          _ErrorBanner(error),
        ],
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: loading ? null : onLogin,
          icon: loading
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.login_rounded),
          label: Text(loading ? 'Signing in...' : 'Sign in'),
        ),
      ],
    );
  }
}

class _ChatPanel extends StatelessWidget {
  const _ChatPanel({
    required this.messages,
    required this.sending,
    required this.error,
    required this.messageController,
    required this.scrollController,
    required this.onSend,
  });

  final List<ChatMessage> messages;
  final bool sending;
  final String error;
  final TextEditingController messageController;
  final ScrollController scrollController;
  final void Function([String? prompt]) onSend;

  @override
  Widget build(BuildContext context) {
    final prompts = [
      'Where am I overspending?',
      'What should I improve this week?',
      'How can our group reduce costs?',
      'What is my biggest money risk?',
    ];

    return Column(
      children: [
        SizedBox(
          height: 54,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            scrollDirection: Axis.horizontal,
            itemCount: prompts.length,
            separatorBuilder: (context, index) => const SizedBox(width: 8),
            itemBuilder: (context, index) => ActionChip(
              label: Text(prompts[index]),
              avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
              onPressed: sending ? null : () => onSend(prompts[index]),
            ),
          ),
        ),
        if (error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: _ErrorBanner(error),
          ),
        Expanded(
          child: ListView.builder(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: messages.length + (sending ? 1 : 0),
            itemBuilder: (context, index) {
              if (index >= messages.length) {
                return const _MessageBubble(
                  message: ChatMessage(role: 'ai', text: 'Thinking...'),
                );
              }
              final message = messages[index];
              final replyOptions =
                  !sending &&
                      message.role == 'ai' &&
                      index == messages.length - 1
                  ? _getQuickReplyOptions(message.text)
                  : <String>[];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _MessageBubble(message: message),
                  if (replyOptions.isNotEmpty)
                    _QuickReplies(options: replyOptions, onSend: onSend),
                ],
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: messageController,
                  enabled: !sending,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => onSend(),
                  decoration: const InputDecoration(
                    hintText: 'Ask about balances, spending, votes...',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Send',
                onPressed: sending ? null : () => onSend(),
                icon: const Icon(Icons.send_rounded),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

List<String> _getQuickReplyOptions(String text) {
  final lines = text
      .trim()
      .split(RegExp(r'\n+'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .toList();
  if (lines.isEmpty) return const [];

  final lastLine = lines.last;
  if (!lastLine.endsWith('?')) return const [];

  final opener = RegExp(
    r'^(question:\s*)?(do|does|did|should|would|could|can|are|is|am|have|has|will)\b',
    caseSensitive: false,
  );
  if (opener.hasMatch(lastLine)) {
    final topic = _getQuestionTopic(lastLine);
    return topic.isEmpty
        ? const ['Yes', 'No']
        : ['Yes, $topic.', 'No, not $topic.'];
  }

  var cleaned = lastLine
      .replaceFirst(RegExp(r'^question:\s*', caseSensitive: false), '')
      .replaceFirst(RegExp(r'\?\s*$'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  if (cleaned.contains(':')) {
    cleaned = cleaned.split(':').last.trim();
  }
  final optionText = cleaned
      .replaceFirst(
        RegExp(
          r'^(do you want|would you like|should i|should we|shall we|do we|which would you prefer|which should we review|what should we focus on)\s+',
          caseSensitive: false,
        ),
        '',
      )
      .trim();

  final seen = <String>{};
  final options = optionText
      .split(RegExp(r'\s*,\s*|\s+or\s+', caseSensitive: false))
      .map(
        (part) => part
            .replaceFirst(RegExp(r'^(the|a|an)\s+', caseSensitive: false), '')
            .trim(),
      )
      .where(
        (part) =>
            part.isNotEmpty &&
            part.length <= 38 &&
            part.split(RegExp(r'\s+')).length <= 5,
      )
      .where((part) => seen.add(part.toLowerCase()))
      .toList();

  if (options.length < 2 || options.length > 4) return const [];
  return options.map((option) => "Let's focus on $option.").toList();
}

String _getQuestionTopic(String question) {
  final cleaned = question
      .replaceFirst(RegExp(r'^question:\s*', caseSensitive: false), '')
      .replaceFirst(RegExp(r'\?\s*$'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  final match = RegExp(
    r'^(do you want|would you like|should i|should we|shall we|do we|can i|can we|could i|could we)\s+(.+)$',
    caseSensitive: false,
  ).firstMatch(cleaned);
  if (match == null) return '';
  return match
      .group(2)!
      .replaceFirstMapped(
        RegExp(r'^help\s+([a-z]+ing)\b', caseSensitive: false),
        (match) => 'help ${match.group(1)} with',
      )
      .replaceAllMapped(
        RegExp(r'\b(your|you)\b', caseSensitive: false),
        (match) => match.group(0)!.toLowerCase() == 'your' ? 'my' : 'me',
      );
}

class _AssistantActionDialog extends StatelessWidget {
  const _AssistantActionDialog({required this.action});

  final Map<String, dynamic> action;

  @override
  Widget build(BuildContext context) {
    final details = (action['details'] as List? ?? const [])
        .whereType<Map>()
        .map((detail) => Map<String, dynamic>.from(detail))
        .toList();

    return AlertDialog(
      title: const Text('Confirm AI action'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${action['summary'] ?? 'This will change your account data.'}',
              style: const TextStyle(fontWeight: FontWeight.w700, height: 1.35),
            ),
            if (details.isNotEmpty) ...[
              const SizedBox(height: 14),
              ...details.map(
                (detail) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          '${detail['label'] ?? ''}',
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          '${detail['value'] ?? ''}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Confirm change'),
        ),
      ],
    );
  }
}

class _QuickReplies extends StatelessWidget {
  const _QuickReplies({required this.options, required this.onSend});

  final List<String> options;
  final void Function([String? prompt]) onSend;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, top: 2, bottom: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: options
            .map(
              (option) => OutlinedButton(
                onPressed: () => onSend(option),
                child: Text(_quickReplyLabel(option)),
              ),
            )
            .toList(),
      ),
    );
  }
}

String _quickReplyLabel(String value) {
  if (value.startsWith('Yes,')) return 'yes';
  if (value.startsWith('No,')) return 'no';
  return value
      .replaceFirst(RegExp(r"^Let's focus on\s+", caseSensitive: false), '')
      .replaceFirst(RegExp(r'\.$'), '');
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    final color = isUser ? const Color(0xFF0D9488) : Colors.white;
    final textColor = isUser ? Colors.white : const Color(0xFF111827);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 18),
          ),
          border: isUser ? null : Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Text(
          message.text,
          style: TextStyle(color: textColor, height: 1.4),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFF991B1B))),
    );
  }
}
