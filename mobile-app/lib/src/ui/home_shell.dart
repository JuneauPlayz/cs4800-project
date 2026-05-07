import 'dart:math' as math;

import 'package:flutter/foundation.dart'
    show compute, kIsWeb, visibleForTesting;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';

import '../core/app_theme.dart';
import '../data/models.dart';
import '../data/receipt_ocr_stub.dart'
    if (dart.library.html) '../data/receipt_ocr_web.dart';
import '../state/app_controller.dart';

const _categoryOptions = [
  'Groceries',
  'Dining',
  'Utilities',
  'Rent',
  'Travel',
  'Furniture',
  'Streaming',
  'Electronics',
  'Household',
  'Other',
];

const _payoutMethods = [
  'Venmo',
  'Zelle',
  'Cash',
  'Apple Cash',
  'PayPal',
  'Other',
];

const _assistantSuggestions = [
  'Who do I owe right now?',
  'What is my top spending category?',
  'Which group spent the most?',
  'Do I have pending votes?',
  'How many receipts are attached?',
  'How are my challenges doing?',
];

class _AssistantQuickReply {
  const _AssistantQuickReply({required this.label, required this.value});

  final String label;
  final String value;
}

const _receiptPickerImageQuality = 70;
const _receiptPickerMaxWidth = 1400.0;
const _receiptPickerMaxHeight = 2200.0;
const _receiptUploadMaxBytes = 4 * 1024 * 1024;
const _receiptUploadMaxWidth = 1400;
const _receiptUploadMaxHeight = 2200;
const _receiptUploadJpegQualities = [70, 62, 54, 46];

const _avatarSeeds = [
  '',
  'Jasper',
  'Luna',
  'Felix',
  'River',
  'Sage',
  'Quinn',
  'Milo',
  'Ivy',
  'Oscar',
  'Willow',
  'Leo',
  'Aurora',
];

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.controller});

  final AppController controller;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;
  int _unseenGroups = 0;
  int _unseenVotes = 0;
  int _lastKnownGroupCount = 0;
  int _lastKnownPendingVoteCount = 0;
  bool _baselineSet = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    final newGroupCount = widget.controller.groups.length;
    final newPendingVotes = widget.controller.votes
        .where((v) => v.status == 'pending')
        .length;

    if (!_baselineSet) {
      _lastKnownGroupCount = newGroupCount;
      _lastKnownPendingVoteCount = newPendingVotes;
      _baselineSet = true;
      return;
    }

    var changed = false;

    if (_currentIndex != 1 && newGroupCount > _lastKnownGroupCount) {
      _unseenGroups += newGroupCount - _lastKnownGroupCount;
      _lastKnownGroupCount = newGroupCount;
      changed = true;
    } else if (_currentIndex == 1) {
      _lastKnownGroupCount = newGroupCount;
    }

    if (_currentIndex != 3 && newPendingVotes > _lastKnownPendingVoteCount) {
      _unseenVotes += newPendingVotes - _lastKnownPendingVoteCount;
      _lastKnownPendingVoteCount = newPendingVotes;
      changed = true;
    } else if (_currentIndex == 3) {
      _lastKnownPendingVoteCount = newPendingVotes;
    }

    if (changed) setState(() {});
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
      if (index == 1) {
        _unseenGroups = 0;
        _lastKnownGroupCount = widget.controller.groups.length;
      }
      if (index == 3) {
        _unseenVotes = 0;
        _lastKnownPendingVoteCount = widget.controller.votes
            .where((v) => v.status == 'pending')
            .length;
      }
    });
  }

  static const _titles = [
    'Overview',
    'Groups',
    'Add Expense',
    'Voting',
    'Challenges',
    'Settings',
  ];

  @override
  Widget build(BuildContext context) {
    final body = [
      _DashboardTab(controller: widget.controller),
      _GroupsTab(controller: widget.controller),
      _AddExpenseTab(controller: widget.controller),
      _VotesTab(controller: widget.controller),
      _ChallengesTab(controller: widget.controller),
      _SettingsTab(controller: widget.controller),
    ];

    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final unreadCount = widget.controller.unreadCount;
        final settingsIcon = unreadCount == 0
            ? const Icon(Icons.settings_outlined)
            : Badge.count(
                count: unreadCount,
                child: const Icon(Icons.settings_outlined),
              );
        final selectedSettingsIcon = unreadCount == 0
            ? const Icon(Icons.settings_rounded)
            : Badge.count(
                count: unreadCount,
                child: const Icon(Icons.settings_rounded),
              );
        return Scaffold(
          appBar: AppBar(
            title: Text(_titles[_currentIndex]),
            actions: [
              IconButton(
                tooltip: 'Notifications',
                onPressed: () => setState(() => _currentIndex = 5),
                icon: unreadCount == 0
                    ? const Icon(Icons.notifications_none_rounded)
                    : Badge.count(
                        count: unreadCount,
                        child: const Icon(Icons.notifications_rounded),
                      ),
              ),
              IconButton(
                tooltip: 'Assistant',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        AssistantScreen(controller: widget.controller),
                  ),
                ),
                icon: const Icon(Icons.auto_awesome_rounded),
              ),
              IconButton(
                tooltip: 'Refresh',
                onPressed: widget.controller.loading
                    ? null
                    : () => widget.controller.refreshAll(),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
            bottom: widget.controller.loading
                ? const PreferredSize(
                    preferredSize: Size.fromHeight(3),
                    child: LinearProgressIndicator(minHeight: 3),
                  )
                : null,
          ),
          body: SafeArea(
            child: IndexedStack(index: _currentIndex, children: body),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: _onTabTapped,
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              NavigationDestination(
                icon: _unseenGroups > 0
                    ? Badge.count(
                        count: _unseenGroups,
                        child: const Icon(Icons.groups_outlined),
                      )
                    : const Icon(Icons.groups_outlined),
                selectedIcon: _unseenGroups > 0
                    ? Badge.count(
                        count: _unseenGroups,
                        child: const Icon(Icons.groups_rounded),
                      )
                    : const Icon(Icons.groups_rounded),
                label: 'Groups',
              ),
              const NavigationDestination(
                icon: Icon(Icons.add_circle_outline_rounded),
                selectedIcon: Icon(Icons.add_circle_rounded),
                label: 'Add',
              ),
              NavigationDestination(
                icon: _unseenVotes > 0
                    ? Badge.count(
                        count: _unseenVotes,
                        child: const Icon(Icons.how_to_vote_outlined),
                      )
                    : const Icon(Icons.how_to_vote_outlined),
                selectedIcon: _unseenVotes > 0
                    ? Badge.count(
                        count: _unseenVotes,
                        child: const Icon(Icons.how_to_vote_rounded),
                      )
                    : const Icon(Icons.how_to_vote_rounded),
                label: 'Votes',
              ),
              const NavigationDestination(
                icon: Icon(Icons.emoji_events_outlined),
                selectedIcon: Icon(Icons.emoji_events_rounded),
                label: 'Goals',
              ),
              NavigationDestination(
                icon: settingsIcon,
                selectedIcon: selectedSettingsIcon,
                label: 'Settings',
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Dashboard tab ──────────────────────────────────────────────────────────

class _DashboardTab extends StatefulWidget {
  const _DashboardTab({required this.controller});

  final AppController controller;

  @override
  State<_DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<_DashboardTab> {
  bool _showBudgetForm = false;

  @override
  Widget build(BuildContext context) {
    final dashboard = widget.controller.dashboard;
    final analytics = widget.controller.analytics;

    if (dashboard == null ||
        analytics == null ||
        widget.controller.user == null) {
      return const _CenteredState(
        icon: Icons.hourglass_bottom_rounded,
        title: 'Loading your dashboard',

        subtitle: 'Pulling balances, expenses, and groups from the API.',
      );
    }

    final userId = widget.controller.user!.id;
    final now = DateTime.now();

    double myAvgMonthlySpend = 0;
    if (widget.controller.expenses.isNotEmpty) {
      final allExpenses = widget.controller.expenses;
      final activeMonths = allExpenses
          .where((e) => e.expenseDate.length >= 7)
          .map((e) => e.expenseDate.substring(0, 7))
          .toSet();
      final totalShare = allExpenses.fold(0.0, (sum, e) {
        if (e.groupId == 'self') return sum + e.amount;
        final split = e.splits.firstWhere(
          (s) => s.userId == userId,
          orElse: () => ExpenseSplit(userId: '', amount: 0),
        );
        return sum + split.amount;
      });
      myAvgMonthlySpend = activeMonths.isEmpty
          ? 0
          : totalShare / activeMonths.length;
    }

    final currentYear = '${now.year}';
    final myYtdSpend = widget.controller.expenses
        .where(
          (e) =>
              e.expenseDate.length >= 4 &&
              e.expenseDate.startsWith(currentYear),
        )
        .fold(0.0, (sum, e) {
          if (e.groupId == 'self') return sum + e.amount;
          final split = e.splits.firstWhere(
            (s) => s.userId == userId,
            orElse: () => ExpenseSplit(userId: '', amount: 0),
          );
          return sum + split.amount;
        });

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () => widget.controller.refreshAll(showLoader: false),
          child: ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _BalanceHero(
                  user: widget.controller.user!,
                  dashboard: dashboard,
                  analytics: analytics,
                  avgMonthlySpend: myAvgMonthlySpend,
                  ytdSpend: myYtdSpend,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Owed to you',
                        value: money(dashboard.balance.totalOwedToYou),
                        tone: AppTheme.teal,
                        onTap: () => _showBalanceSheet(
                          context,
                          title: 'People who owe you',
                          emptyText: 'No one owes you right now.',
                          balances: dashboard.balance.owedToYou,
                          tone: AppTheme.teal,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'You owe',
                        value: money(dashboard.balance.totalYouOwe),
                        tone: AppTheme.red,
                        onTap: () => _showBalanceSheet(
                          context,
                          title: 'People you owe',
                          emptyText: 'You are settled up right now.',
                          balances: dashboard.balance.youOwe,
                          tone: AppTheme.red,
                          showName: false,
                          onArrow: (sheetCtx, balance) {
                            Navigator.of(sheetCtx).pop();
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => _OwedToPersonPage(
                                  balance: balance,
                                  controller: widget.controller,
                                  onPaymentSheet: _showPaymentSheet,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Avg/month',
                        value: money(myAvgMonthlySpend),
                        tone: AppTheme.muted,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Pending votes',
                        value: '${dashboard.pendingVotes}',
                        tone: AppTheme.amber,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: _BudgetCard(
                  controller: widget.controller,
                  analytics: analytics,
                  onEdit: () => setState(() => _showBudgetForm = true),
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _SectionCard(
                  title: 'Top categories',
                  subtitle: 'Live totals from your approved expenses',
                  child: Column(
                    children: analytics.byCategory.take(4).map((item) {
                      final ratio = analytics.monthTotal == 0
                          ? 0.0
                          : (item.total / analytics.monthTotal).clamp(0.0, 1.0);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Text(
                                  item.category,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const Spacer(),
                                Text(money(item.total)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                minHeight: 8,
                                value: ratio,
                                backgroundColor: const Color(0xFFE2E8F0),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _GroupSpendingSection(controller: widget.controller),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _RecentExpensesCard(
                  controller: widget.controller,
                  userId: userId,
                  onPaymentSheet: _showPaymentSheet,
                ),
              ),
            ],
          ),
        ),
        if (_showBudgetForm)
          _BudgetFormOverlay(
            controller: widget.controller,
            onClose: () => setState(() => _showBudgetForm = false),
          ),
      ],
    );
  }

  Future<void> _showBalanceSheet(
    BuildContext context, {
    required String title,
    required String emptyText,
    required List<CounterpartyBalance> balances,
    required Color tone,
    void Function(BuildContext, CounterpartyBalance)? onArrow,
    bool showName = true,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (sheetContext) {
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(title, style: Theme.of(sheetContext).textTheme.titleLarge),
            const SizedBox(height: 14),
            if (balances.isEmpty)
              _EmptyCard(text: emptyText)
            else
              ...balances.map(
                (balance) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      child: Row(
                        children: [
                          _ProfileAvatar(
                            initials: balance.initials,
                            avatarColor: balance.avatarColor,
                            avatarEmoji: balance.avatarEmoji,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (showName)
                                  Text(
                                    balance.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 15,
                                    ),
                                  ),
                                if (balance.groups.isNotEmpty) ...[
                                  if (showName) const SizedBox(height: 4),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: balance.groups
                                        .map(
                                          (g) => Chip(
                                            label: Text(g.name),
                                            visualDensity:
                                                VisualDensity.compact,
                                          ),
                                        )
                                        .toList(),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            money(balance.amount),
                            style: TextStyle(
                              color: tone,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          if (onArrow != null) ...[
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(
                                Icons.arrow_forward_ios_rounded,
                                size: 16,
                              ),
                              onPressed: () => onArrow(sheetContext, balance),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Future<void> _showPaymentSheet(BuildContext context, Expense expense) async {
    final remaining = expense.userOwes - expense.userPaid;
    if (remaining <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This expense is already settled.')),
      );
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    String method = _payoutMethods.first;
    String note = '';
    Map<String, String>? payment;

    payment = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pay expense',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text('${expense.description} • ${money(remaining)}'),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: method,
                    decoration: const InputDecoration(
                      labelText: 'Payout method',
                    ),
                    items: _payoutMethods
                        .map(
                          (item) =>
                              DropdownMenuItem(value: item, child: Text(item)),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) setSheetState(() => method = value);
                    },
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Note or confirmation optional',
                    ),
                    onChanged: (value) => note = value.trim(),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () => Navigator.of(
                        sheetContext,
                      ).pop({'method': method, 'note': note}),
                      icon: const Icon(Icons.payments_rounded),
                      label: const Text('Pay'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (payment == null || !context.mounted) return;
    try {
      await widget.controller.recordExpensePayment(
        expenseId: expense.id,
        method: payment['method'] ?? _payoutMethods.first,
        note: payment['note'] ?? '',
      );
    } catch (_) {
      if (!context.mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ?? 'Unable to record payment.',
          ),
        ),
      );
      return;
    }
    if (context.mounted) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Expense marked paid.')),
      );
    }
  }
}

class _GroupsTab extends StatelessWidget {
  const _GroupsTab({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => controller.refreshAll(showLoader: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Create a new group',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Start a roommate stack, trip pot, or custom household circle.',
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      builder: (_) => _NewGroupSheet(controller: controller),
                    ),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('New group'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (controller.invites.isNotEmpty) ...[
            _SectionTitle(
              title: 'Pending invites',
              subtitle: 'Join groups that teammates have invited you to.',
            ),
            const SizedBox(height: 10),
            ...controller.invites.map(
              (invite) => _InviteCard(invite: invite, controller: controller),
            ),
            const SizedBox(height: 6),
          ],
          if (controller.groups.isEmpty)
            const _CenteredState(
              icon: Icons.groups_rounded,
              title: 'No groups yet',
              subtitle: 'Create one to start splitting expenses on mobile.',
            )
          else
            ...controller.groups.map((group) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      builder: (_) => _GroupDetailsSheet(
                        group: group,
                        controller: controller,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                group.emoji,
                                style: const TextStyle(fontSize: 28),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      group.name,
                                      style: const TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${group.type} • ${group.members.length} members',
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              if (group.isOwner)
                                const Chip(label: Text('Owner')),
                            ],
                          ),
                          if (group.description.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Text(group.description),
                          ],
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Chip(
                                label: Text(
                                  'Vote threshold ${money(group.threshold)}',
                                ),
                              ),
                              if (group.pendingInvites.isNotEmpty)
                                Chip(
                                  label: Text(
                                    '${group.pendingInvites.length} pending invite${group.pendingInvites.length == 1 ? '' : 's'}',
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _AddExpenseTab extends StatefulWidget {
  const _AddExpenseTab({required this.controller});

  final AppController controller;

  @override
  State<_AddExpenseTab> createState() => _AddExpenseTabState();
}

class _AddExpenseTabState extends State<_AddExpenseTab> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  DateTime _expenseDate = DateTime.now();
  String? _groupId;
  String _category = _categoryOptions.first;
  String _splitMethod = 'equal';
  Uint8List? _receiptImageBytes;
  String? _receiptFileName;
  String? _receiptMimeType;
  String? _receiptSourceLabel;
  bool _pickingReceipt = false;
  bool _scanningReceipt = false;
  final Map<String, TextEditingController> _splitControllers = {};

  @override
  void initState() {
    super.initState();
    _groupId = 'self';
  }

  @override
  void didUpdateWidget(covariant _AddExpenseTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    final groups = widget.controller.groups;
    final missingGroup =
        _groupId != null &&
        _groupId != 'self' &&
        !groups.any((group) => group.id == _groupId);
    if (missingGroup) {
      _groupId = groups.isEmpty ? 'self' : groups.first.id;
    }
    if (_groupId != 'self') _syncSplitControllers();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _reasonController.dispose();
    for (final controller in _splitControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  bool get _isSelfExpense => _groupId == 'self';

  Group? get _selectedGroup {
    if (_isSelfExpense || widget.controller.groups.isEmpty) return null;
    return widget.controller.groups.firstWhere(
      (group) => group.id == _groupId,
      orElse: () => widget.controller.groups.first,
    );
  }

  @override
  Widget build(BuildContext context) {
    final group = _selectedGroup;
    final groups = widget.controller.groups;
    final missingGroup =
        _groupId != null &&
        _groupId != 'self' &&
        !groups.any((g) => g.id == _groupId);
    if (missingGroup) {
      _groupId = groups.isEmpty ? 'self' : groups.first.id;
      if (!_isSelfExpense) _syncSplitControllers();
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Add expense',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isSelfExpense
                        ? 'Personal expenses are tracked in your monthly budget.'
                        : 'Split expenses equally, by percent, or with custom member amounts.',
                  ),
                  const SizedBox(height: 18),
                  DropdownButtonFormField<String>(
                    initialValue: _groupId,
                    decoration: const InputDecoration(labelText: 'For'),
                    items: [
                      const DropdownMenuItem(
                        value: 'self',
                        child: Text('👤 Personal (Self)'),
                      ),
                      ...groups.map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text('${item.emoji} ${item.name}'),
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _groupId = value;
                        if (!_isSelfExpense) _syncSplitControllers();
                      });
                    },
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    validator: (value) => (value ?? '').trim().isEmpty
                        ? 'Enter a description'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Amount'),
                    validator: (value) {
                      final amount = double.tryParse((value ?? '').trim());
                      if (amount == null || amount <= 0) {
                        return 'Enter a valid amount';
                      }
                      return null;
                    },
                    onChanged: (_) => setState(_syncSplitControllers),
                  ),
                  const SizedBox(height: 14),
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _pickExpenseDate,
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Expense date',
                        suffixIcon: IconButton(
                          tooltip: 'Change expense date',
                          onPressed: _pickExpenseDate,
                          icon: const Icon(Icons.edit_calendar_rounded),
                        ),
                      ),
                      child: Text(formatDate(_datePayload(_expenseDate))),
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: _categoryOptions
                        .map(
                          (item) =>
                              DropdownMenuItem(value: item, child: Text(item)),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() => _category = value ?? _category);
                    },
                  ),
                  const SizedBox(height: 14),
                  _ReceiptScannerPanel(
                    imageBytes: _receiptImageBytes,
                    fileName: _receiptFileName,
                    sourceLabel: _receiptSourceLabel,
                    picking: _pickingReceipt,
                    scanning: _scanningReceipt,
                    onUpload: () => _pickReceipt(ImageSource.gallery),
                    onCamera: () => _pickReceipt(ImageSource.camera),
                    onRemove: _clearReceipt,
                  ),
                  if (!_isSelfExpense) ...[
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _splitMethod,
                      decoration: const InputDecoration(
                        labelText: 'Split method',
                      ),
                      items: const [
                        DropdownMenuItem(value: 'equal', child: Text('Equal')),
                        DropdownMenuItem(
                          value: 'percent',
                          child: Text('Percent'),
                        ),
                        DropdownMenuItem(
                          value: 'custom',
                          child: Text('Custom'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _splitMethod = value ?? 'equal';
                          _syncSplitControllers();
                        });
                      },
                    ),
                    if (group != null && _splitMethod != 'equal') ...[
                      const SizedBox(height: 16),
                      Text(
                        _splitMethod == 'percent'
                            ? 'Per-member percentages'
                            : 'Per-member dollar amounts',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      ...group.members.map((member) {
                        final field = _splitControllers[member.id]!;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: TextFormField(
                            controller: field,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: InputDecoration(
                              labelText: member.name,
                              suffixText: _splitMethod == 'percent'
                                  ? '%'
                                  : '\$',
                            ),
                            validator: (_) => _validateSplitRow(member.id),
                          ),
                        );
                      }),
                      _SplitSummary(
                        splitMethod: _splitMethod,
                        total: _currentSplitTotal(),
                        amount:
                            double.tryParse(_amountController.text.trim()) ?? 0,
                      ),
                    ],
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _reasonController,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Reason for vote if threshold is exceeded',
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: widget.controller.loading ? null : _submit,
                    child: const Text('Submit expense'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  String? _validateSplitRow(String memberId) {
    if (_splitMethod == 'equal') return null;
    final value = double.tryParse(
      _splitControllers[memberId]?.text.trim() ?? '',
    );
    if (value == null || value < 0) return 'Use a valid value';
    final total = _currentSplitTotal();
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (_splitMethod == 'percent' && total > 100.01) {
      return 'Percent total exceeds 100';
    }
    if (_splitMethod == 'custom' && total > amount + 0.01) {
      return 'Custom total exceeds amount';
    }
    return null;
  }

  double _currentSplitTotal() {
    final activeMemberIds = _selectedGroup?.members
        .map((member) => member.id)
        .toSet();
    final activeControllers = activeMemberIds == null
        ? _splitControllers.values
        : activeMemberIds
              .map((id) => _splitControllers[id])
              .whereType<TextEditingController>();
    return activeControllers.fold<double>(0, (sum, controller) {
      return sum + (double.tryParse(controller.text.trim()) ?? 0);
    });
  }

  void _syncSplitControllers() {
    final group = _selectedGroup;
    if (group == null) return;
    final activeMemberIds = group.members.map((member) => member.id).toSet();
    final staleMemberIds = _splitControllers.keys
        .where((memberId) => !activeMemberIds.contains(memberId))
        .toList();
    for (final memberId in staleMemberIds) {
      _splitControllers.remove(memberId)?.dispose();
    }

    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    final count = group.members.isEmpty ? 1 : group.members.length;
    final defaultCustom = amount / count;
    final defaultPercent = 100 / count;
    for (final member in group.members) {
      _splitControllers.putIfAbsent(member.id, TextEditingController.new);
      final controller = _splitControllers[member.id]!;
      if (controller.text.trim().isEmpty) {
        controller.text = _splitMethod == 'percent'
            ? defaultPercent.toStringAsFixed(2)
            : defaultCustom.toStringAsFixed(2);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.parse(_amountController.text.trim());

    if (_isSelfExpense) {
      try {
        final receiptUrl = await _uploadAttachedReceipt();
        final payload = {
          'groupId': 'self',
          'description': _descriptionController.text.trim(),
          'amount': amount,
          'category': _category,
          'expenseDate': _datePayload(_expenseDate),
        };
        if (receiptUrl != null) payload['receiptUrl'] = receiptUrl;
        await widget.controller.createExpense(payload);
        if (!mounted) return;
        _descriptionController.clear();
        _amountController.clear();
        _clearReceipt(showUpdate: false);
        _showMessage('Personal expense added and tracked in your budget.');
      } catch (_) {
        if (mounted) {
          _showMessage(
            widget.controller.errorMessage ?? 'Unable to save expense.',
          );
        }
      }
      return;
    }

    if (_splitMethod == 'percent') {
      final total = _currentSplitTotal();
      if ((total - 100).abs() > 0.25) {
        _showMessage('Percent splits must total 100%.');
        return;
      }
    }
    if (_splitMethod == 'custom') {
      final total = _currentSplitTotal();
      if ((total - amount).abs() > 0.25) {
        _showMessage('Custom splits must total the expense amount.');
        return;
      }
    }

    final group = _selectedGroup;
    if (group == null) return;
    final splits = group.members.map((member) {
      final raw =
          double.tryParse(_splitControllers[member.id]!.text.trim()) ?? 0;
      return _splitMethod == 'percent'
          ? {'userId': member.id, 'percent': raw}
          : {'userId': member.id, 'amount': raw};
    }).toList();

    try {
      final receiptUrl = await _uploadAttachedReceipt();
      final payload = {
        'groupId': group.id,
        'description': _descriptionController.text.trim(),
        'amount': amount,
        'category': _category,
        'expenseDate': _datePayload(_expenseDate),
        'splitMethod': _splitMethod,
        'reason': _reasonController.text.trim(),
      };
      if (receiptUrl != null) payload['receiptUrl'] = receiptUrl;
      if (_splitMethod != 'equal') payload['splits'] = splits;
      final triggeredVote = await widget.controller.createExpense(payload);
      if (!mounted) return;
      _descriptionController.clear();
      _amountController.clear();
      _reasonController.clear();
      _clearReceipt(showUpdate: false);
      for (final field in _splitControllers.values) {
        field.clear();
      }
      setState(_syncSplitControllers);
      _showMessage(
        triggeredVote == null
            ? 'Expense added.'
            : 'Expense submitted and sent to group voting.',
      );
    } catch (_) {
      _showMessage(widget.controller.errorMessage ?? 'Unable to save expense.');
    }
  }

  Future<String?> _uploadAttachedReceipt() {
    final imageBytes = _receiptImageBytes;
    if (imageBytes == null) return Future.value(null);
    return widget.controller.uploadReceipt(
      bytes: imageBytes,
      mimeType: _receiptMimeType ?? 'image/jpeg',
      fileName: _receiptFileName ?? 'receipt.jpg',
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickReceipt(ImageSource source) async {
    setState(() => _pickingReceipt = true);
    var imagePath = '';
    Uint8List? imageBytes;
    var mimeType = 'image/jpeg';
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        imageQuality: _receiptPickerImageQuality,
        maxWidth: _receiptPickerMaxWidth,
        maxHeight: _receiptPickerMaxHeight,
      );
      if (picked == null) return;
      imagePath = picked.path;
      final bytes = await picked.readAsBytes();
      final compressedBytes = await compute(
        _compressReceiptImageForUpload,
        bytes,
      );
      imageBytes = compressedBytes ?? bytes;
      if (imageBytes.length > _receiptUploadMaxBytes) {
        if (mounted) {
          _showMessage(
            'Receipt image is too large. Crop it or choose a smaller photo.',
          );
        }
        return;
      }
      final wasCompressed = compressedBytes != null;
      mimeType = wasCompressed ? 'image/jpeg' : picked.mimeType ?? 'image/jpeg';
      if (!mounted) return;
      setState(() {
        _receiptImageBytes = imageBytes;
        _receiptFileName = wasCompressed
            ? _receiptJpegFileName(picked.name)
            : picked.name;
        _receiptMimeType = mimeType;
        _receiptSourceLabel = source == ImageSource.camera
            ? 'Camera capture'
            : 'Uploaded image';
      });
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to attach receipt image.');
      }
      return;
    } finally {
      if (mounted) {
        setState(() => _pickingReceipt = false);
      }
    }

    await _scanReceipt(
      imagePath: imagePath,
      imageBytes: imageBytes,
      mimeType: mimeType,
    );
  }

  Future<void> _scanReceipt({
    required String imagePath,
    required Uint8List? imageBytes,
    required String mimeType,
  }) async {
    if (!kIsWeb && imagePath.isEmpty) {
      _showMessage('Receipt attached. Enter the date and amount to continue.');
      return;
    }
    setState(() => _scanningReceipt = true);
    try {
      final rawText = kIsWeb
          ? await _scanReceiptTextOnWeb(
              imageBytes: imageBytes,
              mimeType: mimeType,
            )
          : await _scanReceiptTextOnDevice(imagePath: imagePath);
      final details = _parseReceiptText(rawText ?? '');
      if (!mounted) return;
      final filled = details.amount != null || details.date != null;
      setState(() {
        if (details.amount != null) {
          _amountController.text = details.amount!.toStringAsFixed(2);
        }
        if (details.date != null) {
          _expenseDate = details.date!;
        }
        _syncSplitControllers();
      });
      final found = [
        if (details.amount != null) 'amount',
        if (details.date != null) 'date',
      ];
      if (!filled) {
        _showMessage('Unable to read receipt. Enter the amount manually.');
      } else {
        _showMessage(
          'Receipt scan filled ${found.join(' and ')}. Enter description and category.',
        );
      }
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to read receipt. Enter the amount manually.');
      }
    } finally {
      if (mounted) {
        setState(() => _scanningReceipt = false);
      }
    }
  }

  Future<String?> _scanReceiptTextOnWeb({
    required Uint8List? imageBytes,
    required String mimeType,
  }) {
    if (imageBytes == null) return Future.value(null);
    return recognizeReceiptTextFromBytes(bytes: imageBytes, mimeType: mimeType);
  }

  Future<String?> _scanReceiptTextOnDevice({required String imagePath}) async =>
      recognizeReceiptTextFromPath(imagePath: imagePath);

  void _clearReceipt({bool showUpdate = true}) {
    if (showUpdate) {
      setState(() {
        _receiptImageBytes = null;
        _receiptFileName = null;
        _receiptMimeType = null;
        _receiptSourceLabel = null;
        _scanningReceipt = false;
      });
      return;
    }
    _receiptImageBytes = null;
    _receiptFileName = null;
    _receiptMimeType = null;
    _receiptSourceLabel = null;
    _scanningReceipt = false;
  }

  Future<void> _pickExpenseDate() async {
    final firstDate = DateTime(2000);
    final lastDate = DateTime.now().add(const Duration(days: 365));
    final picked = await showDatePicker(
      context: context,
      initialDate: _clampedPickerDate(
        _expenseDate,
        firstDate: firstDate,
        lastDate: lastDate,
      ),
      firstDate: firstDate,
      lastDate: lastDate,
    );
    if (picked == null || !mounted) return;
    setState(() => _expenseDate = picked);
  }
}

DateTime _clampedPickerDate(
  DateTime date, {
  required DateTime firstDate,
  required DateTime lastDate,
}) {
  final normalizedDate = DateTime(date.year, date.month, date.day);
  final normalizedFirst = DateTime(
    firstDate.year,
    firstDate.month,
    firstDate.day,
  );
  final normalizedLast = DateTime(lastDate.year, lastDate.month, lastDate.day);
  if (normalizedDate.isBefore(normalizedFirst)) return normalizedFirst;
  if (normalizedDate.isAfter(normalizedLast)) return normalizedLast;
  return normalizedDate;
}

Uint8List? _compressReceiptImageForUpload(Uint8List bytes) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) return null;

  var prepared = decoded;
  final scale = math.max(
    decoded.width / _receiptUploadMaxWidth,
    decoded.height / _receiptUploadMaxHeight,
  );
  if (scale > 1) {
    prepared = img.copyResize(
      decoded,
      width: math.max(1, (decoded.width / scale).round()),
      height: math.max(1, (decoded.height / scale).round()),
      interpolation: img.Interpolation.average,
    );
  }

  Uint8List? smallest;
  for (final quality in _receiptUploadJpegQualities) {
    final encoded = Uint8List.fromList(
      img.encodeJpg(prepared, quality: quality),
    );
    smallest = encoded;
    if (encoded.length <= _receiptUploadMaxBytes) return encoded;
  }
  return smallest;
}

String _receiptJpegFileName(String fileName) {
  final normalizedName = fileName.trim().split(RegExp(r'[\\/]')).last;
  final dotIndex = normalizedName.lastIndexOf('.');
  final stem = dotIndex <= 0
      ? normalizedName
      : normalizedName.substring(0, dotIndex);
  final safeStem = stem.trim().isEmpty ? 'receipt' : stem.trim();
  return '$safeStem.jpg';
}

class _ReceiptScannerPanel extends StatelessWidget {
  const _ReceiptScannerPanel({
    required this.imageBytes,
    required this.fileName,
    required this.sourceLabel,
    required this.picking,
    required this.scanning,
    required this.onUpload,
    required this.onCamera,
    required this.onRemove,
  });

  final Uint8List? imageBytes;
  final String? fileName;
  final String? sourceLabel;
  final bool picking;
  final bool scanning;
  final VoidCallback onUpload;
  final VoidCallback onCamera;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.teal.withValues(alpha: 0.06),
        border: Border.all(color: AppTheme.border),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.document_scanner_rounded),
                const SizedBox(width: 10),
                Text('Receipt scanner', style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                OutlinedButton.icon(
                  onPressed: picking ? null : onUpload,
                  icon: const Icon(Icons.upload_file_rounded),
                  label: const Text('Upload receipt'),
                ),
                OutlinedButton.icon(
                  onPressed: picking ? null : onCamera,
                  icon: const Icon(Icons.photo_camera_rounded),
                  label: const Text('Take picture'),
                ),
              ],
            ),
            if (picking || scanning) ...[
              const SizedBox(height: 12),
              const LinearProgressIndicator(minHeight: 3),
              const SizedBox(height: 8),
              Text(
                scanning
                    ? 'Scanning receipt date and amount...'
                    : 'Opening picker...',
              ),
            ],
            if (imageBytes != null) ...[
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.memory(imageBytes!, fit: BoxFit.cover),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${sourceLabel ?? 'Receipt'} attached: ${fileName ?? 'receipt image'}',
                      style: theme.textTheme.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: picking ? null : onRemove,
                    icon: const Icon(Icons.close_rounded),
                    label: const Text('Remove'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReceiptDetails {
  const _ReceiptDetails({this.amount, this.date});

  final double? amount;
  final DateTime? date;
}

_ReceiptDetails _parseReceiptText(String rawText) {
  final lines = rawText
      .split(RegExp(r'\r?\n'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .toList();
  return _ReceiptDetails(
    amount: _receiptAmount(lines),
    date: _receiptDate(rawText),
  );
}

double? _receiptAmount(List<String> lines) {
  final moneyPattern = RegExp(
    r'(?<!\d)\$?\s*(\d{1,5}(?:,\d{3})*(?:[.,]\d{1,2}|\s+\d{2}))(?!\d)',
  );
  final normalizedLines = lines.map(_normalizeReceiptAmountLine).toList();

  for (var i = normalizedLines.length - 1; i >= 0; i--) {
    final line = normalizedLines[i];
    if (!_looksLikeTotalLine(line) ||
        _shouldIgnoreAmountLine(line, isTotalLine: true)) {
      continue;
    }

    final afterTotal = _textAfterTotalLabel(line);
    final afterTotalValue = _lastMoneyValue(afterTotal, moneyPattern);
    if (afterTotalValue != null) return afterTotalValue;

    final sameLineValue = _lastMoneyValue(line, moneyPattern);
    if (sameLineValue != null) return sameLineValue;

    for (
      var offset = 1;
      offset <= 4 && i + offset < normalizedLines.length;
      offset++
    ) {
      final nextLine = normalizedLines[i + offset];
      if (_shouldIgnoreAmountLine(nextLine, isTotalLine: false)) continue;
      final nextLineValue = _lastMoneyValue(nextLine, moneyPattern);
      if (nextLineValue != null) return nextLineValue;
    }
  }

  final mathBackedTotal = _receiptAmountFromSummaryMath(
    normalizedLines,
    moneyPattern,
  );
  if (mathBackedTotal != null) return mathBackedTotal;

  final unlabeledTotal = _receiptAmountFromBottomSummary(
    normalizedLines,
    moneyPattern,
  );
  if (unlabeledTotal != null) return unlabeledTotal;

  return null;
}

double? _lastMoneyValue(String text, RegExp moneyPattern) {
  final matches = moneyPattern.allMatches(text).toList();
  for (final match in matches.reversed) {
    final value = _moneyValue(match.group(1));
    if (value != null && value > 0) return value;
  }
  return null;
}

class _ReceiptAmountCandidate {
  const _ReceiptAmountCandidate({
    required this.amount,
    required this.line,
    required this.lineIndex,
  });

  final double amount;
  final String line;
  final int lineIndex;
}

double? _receiptAmountFromSummaryMath(List<String> lines, RegExp moneyPattern) {
  double? subtotal;
  var tax = 0.0;
  var tip = 0.0;
  final candidates = <_ReceiptAmountCandidate>[];

  for (var i = 0; i < lines.length; i++) {
    final line = lines[i];
    final value = _lastMoneyValue(line, moneyPattern);
    if (value == null) continue;

    final lower = line.toLowerCase();
    if (RegExp(r'sub\s*[-:]?\s*total').hasMatch(lower)) {
      subtotal = value;
      continue;
    }
    if (RegExp(r'\b(tax|vat|mwst|gst|hst|pst)\b').hasMatch(lower)) {
      tax += value;
      continue;
    }
    if (RegExp(r'\b(tip|gratuity|service\s+charge)\b').hasMatch(lower)) {
      tip += value;
      continue;
    }

    if (!_shouldIgnoreAmountLine(line, isTotalLine: false) &&
        !_looksLikeItemAmountLine(line)) {
      candidates.add(
        _ReceiptAmountCandidate(amount: value, line: line, lineIndex: i),
      );
    }
  }

  if (subtotal == null || subtotal <= 0) return null;
  final expected = _roundMoney(subtotal + tax + tip);
  if (expected <= 0) return null;

  candidates.sort((first, second) {
    final firstDelta = (first.amount - expected).abs();
    final secondDelta = (second.amount - expected).abs();
    final delta = firstDelta.compareTo(secondDelta);
    if (delta != 0) return delta;
    return second.lineIndex.compareTo(first.lineIndex);
  });

  if (candidates.isEmpty) return null;
  final best = candidates.first;
  return (best.amount - expected).abs() <= 0.05 ? best.amount : null;
}

double? _receiptAmountFromBottomSummary(
  List<String> lines,
  RegExp moneyPattern,
) {
  final hasSummarySignal = lines.any(
    (line) => RegExp(
      r'(sub\s*[-:]?\s*total|tax|vat|mwst|gst|hst|pst|change|cash|tender|card|visa|mastercard|amex|discover|debit|credit|payment|paid)',
      caseSensitive: false,
    ).hasMatch(line),
  );
  if (!hasSummarySignal) return null;

  final firstSummaryLine = lines.indexWhere(
    (line) => RegExp(
      r'(sub\s*[-:]?\s*total|tax|vat|mwst|gst|hst|pst)',
      caseSensitive: false,
    ).hasMatch(line),
  );
  final floor = firstSummaryLine == -1
      ? (lines.length * 0.45).floor()
      : firstSummaryLine;

  for (var i = lines.length - 1; i >= floor; i--) {
    final line = lines[i];
    if (_shouldIgnoreAmountLine(line, isTotalLine: false)) continue;
    if (_looksLikeItemAmountLine(line)) continue;
    final value = _lastMoneyValue(line, moneyPattern);
    if (value != null) return value;
  }
  return null;
}

double _roundMoney(double value) => (value * 100).round() / 100;

@visibleForTesting
double? debugReceiptAmountFromText(String rawText) {
  final lines = rawText
      .split(RegExp(r'\r?\n'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .toList();
  return _receiptAmount(lines);
}

String _normalizeReceiptAmountLine(String line) {
  final normalizedLine = line.replaceAllMapped(
    RegExp(r'(\d{1,5}(?:,\d{3})?)\s+(\d{2})(?!\d)'),
    (match) => '${match.group(1)}.${match.group(2)}',
  );
  final chars = normalizedLine.split('');
  for (var i = 0; i < chars.length; i++) {
    final char = chars[i];
    final previous = i == 0 ? '' : chars[i - 1];
    final next = i + 1 < chars.length ? chars[i + 1] : '';
    final nextNonSpace = chars
        .skip(i + 1)
        .firstWhere((item) => item.trim().isNotEmpty, orElse: () => '');

    if ((char == 's' || char == 'S') &&
        (i == 0 || previous.trim().isEmpty) &&
        _isDigit(nextNonSpace)) {
      chars[i] = r'$';
    } else if ((char == 'o' || char == 'O') &&
        _isDigit(previous) &&
        _isDigit(next)) {
      chars[i] = '0';
    } else if ((char == 'l' || char == 'I') &&
        _isDigit(previous) &&
        _isDigit(next)) {
      chars[i] = '1';
    }
  }
  return chars.join();
}

bool _looksLikeTotalLine(String line) {
  final lower = line.toLowerCase();
  if (RegExp(r'sub\s*[-:]?\s*total').hasMatch(lower)) return false;
  if (lower.contains('amount due') ||
      lower.contains('balance due') ||
      lower.contains('total due') ||
      lower.contains('total amount') ||
      lower.contains('total paid') ||
      lower.contains('amount paid') ||
      lower.contains('grand total') ||
      lower.contains('order total') ||
      lower.contains('sale total') ||
      lower.contains('card total') ||
      RegExp(r'\bbalance\b').hasMatch(lower)) {
    return true;
  }

  return _containsFuzzyTotal(lower);
}

bool _shouldIgnoreAmountLine(String line, {required bool isTotalLine}) {
  final lower = line.toLowerCase();
  final hardIgnores = RegExp(
    r'(sub\s*[-:]?\s*total|tax|tip|gratuity|change|refund|saved|savings|discount|coupon|cash\s*back|auth|approval|account|acct|points|reward|rounding|gift\s*card|card\s+balance|remaining\s+balance|previous\s+balance|available\s+balance|balance\s+forward)',
    caseSensitive: false,
  );
  if (hardIgnores.hasMatch(lower)) return true;

  final paymentOnlyIgnores = RegExp(
    r'(cash|tender|card|visa|mastercard|amex|discover|debit|credit|payment|paid)',
    caseSensitive: false,
  );
  return !isTotalLine && paymentOnlyIgnores.hasMatch(lower);
}

bool _looksLikeItemAmountLine(String line) {
  final lower = line.toLowerCase();
  if (_looksLikeTotalLine(line)) return false;
  if (RegExp(r'^\s*\d+\s*(x|@)\b').hasMatch(lower)) return true;
  if (RegExp(r'\b(qty|item|sku|unit)\b').hasMatch(lower)) return true;
  return RegExp(r'[a-z]{2,}.*\$?\s*\d{1,4}[.,]\d{2}\s*$').hasMatch(lower);
}

String _textAfterTotalLabel(String line) {
  final lower = line.toLowerCase();
  final direct = RegExp(
    r'(amount\s+due|balance\s+due|total\s+due|total\s+amount|total\s+paid|amount\s+paid|grand\s+total|order\s+total|sale\s+total|card\s+total|balance)',
    caseSensitive: false,
  ).firstMatch(line);
  if (direct != null) return line.substring(direct.end);

  final token = RegExp(r'[a-z0-9@!|]+', caseSensitive: false).allMatches(lower);
  for (final match in token) {
    if (_editDistance(_normalizeTotalToken(match.group(0)!), 'total') <= 1) {
      return line.substring(match.end);
    }
  }
  return line;
}

bool _containsFuzzyTotal(String text) {
  final compact = _compactReceiptLabel(text);
  if (compact.contains('subtotal')) return false;
  if (compact.contains('total')) return true;
  for (var start = 0; start < compact.length; start++) {
    for (final width in const [4, 5, 6]) {
      if (start + width > compact.length) continue;
      if (_editDistance(compact.substring(start, start + width), 'total') <=
          1) {
        return true;
      }
    }
  }
  return false;
}

String _compactReceiptLabel(String text) {
  return text
      .toLowerCase()
      .replaceAll('0', 'o')
      .replaceAll('@', 'a')
      .replaceAll('4', 'a')
      .replaceAll('1', 'l')
      .replaceAll('i', 'l')
      .replaceAll('!', 'l')
      .replaceAll('|', 'l')
      .replaceAll(RegExp(r'[^a-z]'), '');
}

String _normalizeTotalToken(String token) {
  return token
      .replaceAll('0', 'o')
      .replaceAll('@', 'a')
      .replaceAll('4', 'a')
      .replaceAll('1', 'l')
      .replaceAll('i', 'l')
      .replaceAll('!', 'l')
      .replaceAll('|', 'l');
}

int _editDistance(String left, String right) {
  if ((left.length - right.length).abs() > 1) return 2;
  final previous = List<int>.generate(right.length + 1, (index) => index);
  for (var i = 0; i < left.length; i++) {
    var lastDiagonal = previous[0];
    previous[0] = i + 1;
    for (var j = 0; j < right.length; j++) {
      final oldDiagonal = previous[j + 1];
      previous[j + 1] = [
        previous[j + 1] + 1,
        previous[j] + 1,
        lastDiagonal + (left[i] == right[j] ? 0 : 1),
      ].reduce((a, b) => a < b ? a : b);
      lastDiagonal = oldDiagonal;
    }
  }
  return previous.last;
}

bool _isDigit(String value) {
  if (value.length != 1) return false;
  final code = value.codeUnitAt(0);
  return code >= 48 && code <= 57;
}

double? _moneyValue(String? raw) {
  if (raw == null) return null;
  final trimmed = raw.trim();
  if (!RegExp(r'[.,]\d{1,2}$').hasMatch(trimmed)) return null;
  final decimalNormalized = RegExp(r'^\d{1,4},\d{2}$').hasMatch(trimmed)
      ? trimmed.replaceAll(',', '.')
      : trimmed.replaceAll(',', '');
  return double.tryParse(decimalNormalized);
}

@visibleForTesting
DateTime? debugReceiptDateFromText(String rawText) => _receiptDate(rawText);

class _ReceiptDateCandidate {
  const _ReceiptDateCandidate({
    required this.date,
    required this.score,
    required this.lineIndex,
    required this.matchStart,
  });

  final DateTime date;
  final int score;
  final int lineIndex;
  final int matchStart;
}

DateTime? _receiptDate(String rawText) {
  final lines = rawText
      .split(RegExp(r'\r?\n'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .toList();
  final candidates = <_ReceiptDateCandidate>[];
  for (var i = 0; i < lines.length; i++) {
    candidates.addAll(_receiptDateCandidatesFromLine(lines[i], i));
  }
  if (candidates.isEmpty) return null;

  candidates.sort((first, second) {
    final score = second.score.compareTo(first.score);
    if (score != 0) return score;
    final line = first.lineIndex.compareTo(second.lineIndex);
    if (line != 0) return line;
    return first.matchStart.compareTo(second.matchStart);
  });
  return candidates.first.date;
}

List<_ReceiptDateCandidate> _receiptDateCandidatesFromLine(
  String rawLine,
  int lineIndex,
) {
  final line = _normalizeReceiptDateLine(rawLine);
  final candidates = <_ReceiptDateCandidate>[];
  final isoPattern = RegExp(
    r'\b(\d{4})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})\b',
  );
  final numericPattern = RegExp(
    r'\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{2,4})\b',
  );
  final spacedNumericPattern = RegExp(r'\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b');
  final monthFirstPattern = RegExp(
    r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})\b',
    caseSensitive: false,
  );
  final dayFirstPattern = RegExp(
    r'\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+(\d{2,4})\b',
    caseSensitive: false,
  );

  for (final match in isoPattern.allMatches(line)) {
    final year = int.tryParse(match.group(1)!);
    final month = int.tryParse(match.group(2)!);
    final day = int.tryParse(match.group(3)!);
    final candidate = _buildReceiptDateCandidate(
      year: year,
      month: month,
      day: day,
      line: line,
      lineIndex: lineIndex,
      matchStart: match.start,
      baseScore: 80,
    );
    if (candidate != null) candidates.add(candidate);
  }

  for (final match in numericPattern.allMatches(line)) {
    final first = int.tryParse(match.group(1)!);
    final second = int.tryParse(match.group(2)!);
    final year = _normalizeReceiptYear(int.tryParse(match.group(3)!));
    if (first == null || second == null) continue;
    final month = first > 12 ? second : first;
    final day = first > 12 ? first : second;
    final candidate = _buildReceiptDateCandidate(
      year: year,
      month: month,
      day: day,
      line: line,
      lineIndex: lineIndex,
      matchStart: match.start,
      baseScore: 75,
    );
    if (candidate != null) candidates.add(candidate);
  }

  if (_hasReceiptDateContext(line)) {
    for (final match in spacedNumericPattern.allMatches(line)) {
      final first = int.tryParse(match.group(1)!);
      final second = int.tryParse(match.group(2)!);
      final year = _normalizeReceiptYear(int.tryParse(match.group(3)!));
      if (first == null || second == null) continue;
      final month = first > 12 ? second : first;
      final day = first > 12 ? first : second;
      final candidate = _buildReceiptDateCandidate(
        year: year,
        month: month,
        day: day,
        line: line,
        lineIndex: lineIndex,
        matchStart: match.start,
        baseScore: 65,
      );
      if (candidate != null) candidates.add(candidate);
    }
  }

  for (final match in monthFirstPattern.allMatches(line)) {
    final month = _receiptMonthValue(match.group(1)!);
    final day = int.tryParse(match.group(2)!);
    final year = _normalizeReceiptYear(int.tryParse(match.group(3)!));
    final candidate = _buildReceiptDateCandidate(
      year: year,
      month: month,
      day: day,
      line: line,
      lineIndex: lineIndex,
      matchStart: match.start,
      baseScore: 78,
    );
    if (candidate != null) candidates.add(candidate);
  }

  for (final match in dayFirstPattern.allMatches(line)) {
    final day = int.tryParse(match.group(1)!);
    final month = _receiptMonthValue(match.group(2)!);
    final year = _normalizeReceiptYear(int.tryParse(match.group(3)!));
    final candidate = _buildReceiptDateCandidate(
      year: year,
      month: month,
      day: day,
      line: line,
      lineIndex: lineIndex,
      matchStart: match.start,
      baseScore: 78,
    );
    if (candidate != null) candidates.add(candidate);
  }

  if (candidates.isEmpty && _hasReceiptDateContext(line)) {
    final yearlessPattern = RegExp(
      r'\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?!\s*[\/.-]\s*\d)\b',
    );
    for (final match in yearlessPattern.allMatches(line)) {
      final first = int.tryParse(match.group(1)!);
      final second = int.tryParse(match.group(2)!);
      if (first == null || second == null) continue;
      final now = DateTime.now();
      final month = first > 12 ? second : first;
      final day = first > 12 ? first : second;
      var year = now.year;
      var date = _validReceiptDate(year, month, day);
      if (date != null && date.isAfter(now.add(const Duration(days: 1)))) {
        year -= 1;
        date = _validReceiptDate(year, month, day);
      }
      final candidate = _buildReceiptDateCandidate(
        year: year,
        month: month,
        day: day,
        line: line,
        lineIndex: lineIndex,
        matchStart: match.start,
        baseScore: 55,
        inferredYear: true,
      );
      if (candidate != null) candidates.add(candidate);
    }
  }

  return candidates;
}

_ReceiptDateCandidate? _buildReceiptDateCandidate({
  required int? year,
  required int? month,
  required int? day,
  required String line,
  required int lineIndex,
  required int matchStart,
  required int baseScore,
  bool inferredYear = false,
}) {
  if (year == null || month == null || day == null) return null;
  final date = _validReceiptDate(year, month, day);
  if (date == null) return null;

  final now = DateTime.now();
  if (date.isAfter(now.add(const Duration(days: 1)))) return null;
  if (_hasBadReceiptDateContext(line)) return null;

  var score = baseScore;
  if (_hasReceiptDateContext(line)) score += 25;
  if (inferredYear) score -= 10;
  return _ReceiptDateCandidate(
    date: date,
    score: score,
    lineIndex: lineIndex,
    matchStart: matchStart,
  );
}

DateTime? _validReceiptDate(int year, int month, int day) {
  final now = DateTime.now();
  if (year < 2000 || year > now.year + 1) return null;
  if (month < 1 || month > 12 || day < 1) return null;
  final maxDay = DateTime(year, month + 1, 0).day;
  if (day > maxDay) return null;
  return DateTime(year, month, day);
}

int? _normalizeReceiptYear(int? year) {
  if (year == null) return null;
  if (year < 100) return year + 2000;
  return year;
}

int? _receiptMonthValue(String raw) {
  const months = {
    'jan': 1,
    'feb': 2,
    'mar': 3,
    'apr': 4,
    'may': 5,
    'jun': 6,
    'jul': 7,
    'aug': 8,
    'sep': 9,
    'sept': 9,
    'oct': 10,
    'nov': 11,
    'dec': 12,
  };
  return months[raw.toLowerCase()];
}

String _normalizeReceiptDateLine(String line) {
  final chars = line.split('');
  for (var i = 0; i < chars.length; i++) {
    final char = chars[i];
    final previous = i == 0 ? '' : chars[i - 1];
    final next = i + 1 < chars.length ? chars[i + 1] : '';
    if ((char == 'o' || char == 'O') &&
        (_isDateTokenNeighbor(previous) || _isDateTokenNeighbor(next))) {
      chars[i] = '0';
    } else if ((char == 'l' || char == 'I' || char == '|') &&
        (_isDateTokenNeighbor(previous) || _isDateTokenNeighbor(next))) {
      chars[i] = '1';
    }
  }
  return chars.join();
}

bool _isDateTokenNeighbor(String value) {
  return _isDigit(value) || value == '/' || value == '.' || value == '-';
}

bool _hasReceiptDateContext(String line) {
  return RegExp(
    r'\b(date|dated|order|ordered|purchase|purchased|sale|sold|trans|transaction|invoice|check|opened|closed|posted|created)\b',
    caseSensitive: false,
  ).hasMatch(line);
}

bool _hasBadReceiptDateContext(String line) {
  return RegExp(
    r'\b(exp|expires|expiration|valid|coupon|reward|points|return|exchange|auth|approval|card|visa|mastercard|amex|discover|debit|credit|due)\b',
    caseSensitive: false,
  ).hasMatch(line);
}

class _VotesTab extends StatelessWidget {
  const _VotesTab({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final pending = controller.votes
        .where((vote) => vote.status == 'pending')
        .toList();
    final closed = controller.votes
        .where((vote) => vote.status != 'pending')
        .toList();

    return RefreshIndicator(
      onRefresh: () => controller.refreshAll(showLoader: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (pending.isEmpty && closed.isEmpty)
            const _CenteredState(
              icon: Icons.how_to_vote_rounded,
              title: 'No votes yet',
              subtitle: 'Expenses above a group threshold will appear here.',
            )
          else ...[
            _SectionTitle(
              title: 'Pending votes',
              subtitle: 'Respond before large expenses affect balances.',
            ),
            const SizedBox(height: 10),
            if (pending.isEmpty)
              const _EmptyCard(
                text: 'Nothing is waiting on approval right now.',
              )
            else
              ...pending.map(
                (vote) => _VoteCard(vote: vote, controller: controller),
              ),
            const SizedBox(height: 18),
            _SectionTitle(
              title: 'History',
              subtitle: 'Approved and declined vote outcomes.',
            ),
            const SizedBox(height: 10),
            if (closed.isEmpty)
              const _EmptyCard(text: 'No completed votes yet.')
            else
              ...closed.map(
                (vote) => _VoteCard(vote: vote, controller: controller),
              ),
          ],
        ],
      ),
    );
  }
}

class _ChallengesTab extends StatelessWidget {
  const _ChallengesTab({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final data = controller.challengeData;
    if (data == null) {
      return const _CenteredState(
        icon: Icons.emoji_events_rounded,
        title: 'Loading challenges',
        subtitle: 'Pulling group goals and progress from the API.',
      );
    }

    return RefreshIndicator(
      onRefresh: () => controller.refreshAll(showLoader: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Group challenges',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Create shared savings or spending goals, then track contributions from the group.',
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: controller.groups.isEmpty || controller.loading
                        ? null
                        : () => showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            useSafeArea: true,
                            builder: (_) =>
                                _NewChallengeSheet(controller: controller),
                          ),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('New challenge'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (data.rings.isNotEmpty) ...[
            _SectionTitle(
              title: 'Progress snapshot',
              subtitle: 'Top active challenge progress.',
            ),
            const SizedBox(height: 10),
            ...data.rings.map((ring) => _ChallengeRingTile(ring: ring)),
            const SizedBox(height: 16),
          ],
          _SectionTitle(
            title: 'Active challenges',
            subtitle: 'Contribute when your group makes progress.',
          ),
          const SizedBox(height: 10),
          if (data.challenges.isEmpty)
            const _CenteredState(
              icon: Icons.flag_rounded,
              title: 'No challenges yet',
              subtitle: 'Create a challenge for a group goal or budget target.',
            )
          else
            ...data.challenges.map(
              (challenge) => _ChallengeCard(
                key: ValueKey(challenge.id),
                challenge: challenge,
                controller: controller,
              ),
            ),
        ],
      ),
    );
  }
}

class _ChallengeRingTile extends StatelessWidget {
  const _ChallengeRingTile({required this.ring});

  final ChallengeRing ring;

  @override
  Widget build(BuildContext context) {
    final ratio = ring.max <= 0 ? 0.0 : (ring.value / ring.max).clamp(0.0, 1.0);
    final color = colorFromHex(ring.color);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 54,
              height: 54,
              child: CircularProgressIndicator(
                value: ratio,
                strokeWidth: 7,
                backgroundColor: const Color(0xFFE2E8F0),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ring.label,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text('${money(ring.value)} of ${money(ring.max)}'),
                ],
              ),
            ),
            Text('${(ratio * 100).round()}%'),
          ],
        ),
      ),
    );
  }
}

class _ChallengeCard extends StatefulWidget {
  const _ChallengeCard({
    super.key,
    required this.challenge,
    required this.controller,
  });

  final Challenge challenge;
  final AppController controller;

  @override
  State<_ChallengeCard> createState() => _ChallengeCardState();
}

class _ChallengeCardState extends State<_ChallengeCard> {
  final _amountController = TextEditingController();
  String? _errorText;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final challenge = widget.challenge;
    final ratio = challenge.goal <= 0
        ? 0.0
        : (challenge.current / challenge.goal).clamp(0.0, 1.0);
    final remaining = (challenge.goal - challenge.current).clamp(
      0.0,
      double.infinity,
    );
    final color = colorFromHex(challenge.color);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: color.withValues(alpha: 0.14),
                    foregroundColor: color,
                    child: const Icon(Icons.emoji_events_rounded),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          challenge.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          '${challenge.groupName} • by ${challenge.createdByName}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (challenge.description.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(challenge.description),
              ],
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  minHeight: 10,
                  value: ratio,
                  backgroundColor: const Color(0xFFE2E8F0),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    '${money(challenge.current)} / ${money(challenge.goal)}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  Text('${money(remaining)} left'),
                ],
              ),
              if (challenge.endDate.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Ends ${formatDate(challenge.endDate)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              if (challenge.contributions.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  'Recent contributions',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 6),
                ...challenge.contributions.take(3).map((contribution) {
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: _ProfileAvatar(
                      initials: contribution.initials,
                      avatarColor: contribution.avatarColor,
                      avatarEmoji: contribution.avatarEmoji,
                      radius: 16,
                    ),
                    title: Text(contribution.name),
                    trailing: Text(money(contribution.amount)),
                  );
                }),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Contribution amount',
                        prefixText: '\$',
                        errorText: _errorText,
                      ),
                      onChanged: (_) {
                        if (_errorText != null) {
                          setState(() => _errorText = null);
                        }
                      },
                      onSubmitted: (_) => _submitContribution(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 96,
                    height: 54,
                    child: FilledButton.icon(
                      onPressed: _submitContribution,
                      style: FilledButton.styleFrom(
                        minimumSize: Size.zero,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('Add'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitContribution() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _errorText = 'Enter a positive amount');
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();
    _amountController.clear();
    setState(() => _errorText = null);

    try {
      await widget.controller.contributeToChallenge(
        challengeId: widget.challenge.id,
        amount: amount,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Contribution added.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ?? 'Unable to save contribution.',
          ),
        ),
      );
    }
  }
}

class _NewChallengeSheet extends StatefulWidget {
  const _NewChallengeSheet({required this.controller});

  final AppController controller;

  @override
  State<_NewChallengeSheet> createState() => _NewChallengeSheetState();
}

class _NewChallengeSheetState extends State<_NewChallengeSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _goalController = TextEditingController();
  String? _groupId;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    if (widget.controller.groups.isNotEmpty) {
      _groupId = widget.controller.groups.first.id;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _goalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final groups = widget.controller.groups;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: ListView(
          shrinkWrap: true,
          children: [
            const Text(
              'New challenge',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _groupId,
              decoration: const InputDecoration(labelText: 'Group'),
              items: groups
                  .map(
                    (group) => DropdownMenuItem(
                      value: group.id,
                      child: Text('${group.emoji} ${group.name}'),
                    ),
                  )
                  .toList(),
              validator: (value) => value == null ? 'Choose a group' : null,
              onChanged: (value) => setState(() => _groupId = value),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Challenge name'),
              validator: (value) =>
                  (value ?? '').trim().isEmpty ? 'Enter a name' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _descriptionController,
              minLines: 2,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
              validator: (value) =>
                  (value ?? '').trim().isEmpty ? 'Enter a description' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _goalController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(labelText: 'Goal amount'),
              validator: (value) {
                final goal = double.tryParse((value ?? '').trim());
                if (goal == null || goal <= 0) return 'Enter a valid goal';
                return null;
              },
            ),
            const SizedBox(height: 14),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _pickEndDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'End date optional',
                  suffixIcon: Icon(Icons.calendar_today_rounded),
                ),
                child: Text(
                  _endDate == null
                      ? 'No end date'
                      : formatDate(_datePayload(_endDate!)),
                ),
              ),
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: widget.controller.loading ? null : _submit,
              child: const Text('Create challenge'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked == null || !mounted) return;
    setState(() => _endDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      await widget.controller.createChallenge(
        groupId: _groupId!,
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim(),
        goal: double.parse(_goalController.text.trim()),
        endDate: _endDate == null ? '' : _datePayload(_endDate!),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Challenge created.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ?? 'Unable to create challenge.',
          ),
        ),
      );
    }
  }
}

class _SettingsTab extends StatefulWidget {
  const _SettingsTab({required this.controller});

  final AppController controller;

  @override
  State<_SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<_SettingsTab> {
  SettingsData? _draft;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _draft ??= widget.controller.settings;
  }

  @override
  void didUpdateWidget(covariant _SettingsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    _draft = widget.controller.settings;
  }

  @override
  Widget build(BuildContext context) {
    final settings = _draft;
    final user = widget.controller.user;
    if (settings == null || user == null) {
      return const _CenteredState(
        icon: Icons.settings_rounded,
        title: 'Loading settings',
        subtitle: 'Syncing your current preferences.',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _ProfileAvatar(
                      initials: user.initials,
                      avatarColor: user.avatarColor,
                      avatarEmoji: user.avatarEmoji,
                      radius: 28,
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(user.email),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _SettingsAvatarPicker(
                  initials: user.initials,
                  selectedSeed: user.avatarEmoji,
                  saving: widget.controller.savingSettings,
                  onSelected: (seed) async {
                    try {
                      await widget.controller.saveAvatar(seed);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Avatar updated.')),
                      );
                    } catch (_) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            widget.controller.errorMessage ??
                                'Unable to update avatar.',
                          ),
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Notifications',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const Spacer(),
                    if (widget.controller.unreadCount > 0)
                      Badge.count(count: widget.controller.unreadCount),
                  ],
                ),
                const SizedBox(height: 12),
                Builder(
                  builder: (context) {
                    final unread = widget.controller.notifications
                        .where((n) => n.unread)
                        .toList();
                    if (unread.isEmpty) {
                      return const Text('No new notifications.');
                    }
                    return Column(
                      children: unread
                          .take(12)
                          .map(
                            (n) => _NotificationTile(
                              notification: n,
                              controller: widget.controller,
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Builder(
          builder: (context) {
            final readNotifications = widget.controller.notifications
                .where((n) => !n.unread)
                .toList();
            return Card(
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        _ReadNotificationsPage(controller: widget.controller),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppTheme.border,
                        foregroundColor: AppTheme.muted,
                        child: const Icon(Icons.done_all_rounded),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Read notifications',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              readNotifications.isEmpty
                                  ? 'No read notifications yet'
                                  : '${readNotifications.length} notification${readNotifications.length == 1 ? '' : 's'} marked as read',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: AppTheme.muted,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        Card(
          child: SwitchListTile(
            value: widget.controller.themeMode == ThemeMode.dark,
            onChanged: (value) => widget.controller.setDarkMode(value),
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark mode'),
            subtitle: const Text('Switch between light and dark theme'),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                value: settings.emailVotes,
                onChanged: (value) => setState(
                  () => _draft = settings.copyWith(emailVotes: value),
                ),
                title: const Text('Email vote alerts'),
              ),
              SwitchListTile(
                value: settings.emailBalance,
                onChanged: (value) => setState(
                  () => _draft = settings.copyWith(emailBalance: value),
                ),
                title: const Text('Email balance updates'),
              ),
              SwitchListTile(
                value: settings.pushSettlements,
                onChanged: (value) => setState(
                  () => _draft = settings.copyWith(pushSettlements: value),
                ),
                title: const Text('Push settlement nudges'),
              ),
              SwitchListTile(
                value: settings.aiProactive,
                onChanged: (value) => setState(
                  () => _draft = settings.copyWith(aiProactive: value),
                ),
                title: const Text('Proactive AI tips'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  initialValue: settings.profileVisibility,
                  decoration: const InputDecoration(
                    labelText: 'Profile visibility',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'group_members',
                      child: Text('Group members'),
                    ),
                    DropdownMenuItem(value: 'private', child: Text('Private')),
                  ],
                  onChanged: (value) => setState(
                    () => _draft = settings.copyWith(
                      profileVisibility: value ?? settings.profileVisibility,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: settings.activityVisibility,
                  decoration: const InputDecoration(
                    labelText: 'Activity visibility',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'group_members',
                      child: Text('Group members'),
                    ),
                    DropdownMenuItem(value: 'private', child: Text('Private')),
                  ],
                  onChanged: (value) => setState(
                    () => _draft = settings.copyWith(
                      activityVisibility: value ?? settings.activityVisibility,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: widget.controller.savingSettings ? null : _save,
                  child: Text(
                    widget.controller.savingSettings
                        ? 'Saving...'
                        : 'Save settings',
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () async {
                    await widget.controller.logout();
                  },
                  child: const Text('Log out'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    final draft = _draft;
    if (draft == null) return;
    try {
      await widget.controller.saveSettings(draft);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Settings saved.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ?? 'Unable to save settings.',
          ),
        ),
      );
    }
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.controller,
  });

  final AppNotification notification;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: notification.unread
            ? AppTheme.teal.withValues(alpha: 0.14)
            : AppTheme.border,
        foregroundColor: notification.unread
            ? AppTheme.tealDark
            : AppTheme.muted,
        child: Icon(_notificationIcon(notification.type)),
      ),
      title: Text(notification.title),
      subtitle: Text(notification.body),
      trailing: notification.unread
          ? TextButton(
              onPressed: () async {
                try {
                  await controller.markNotificationRead(notification.id);
                } catch (_) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        controller.errorMessage ??
                            'Unable to update notification.',
                      ),
                    ),
                  );
                }
              },
              child: const Text('Mark read'),
            )
          : const Chip(label: Text('Seen')),
    );
  }
}

IconData _notificationIcon(String type) {
  return switch (type) {
    'invite' => Icons.mail_outline_rounded,
    'vote' => Icons.how_to_vote_rounded,
    'settlement' => Icons.payments_rounded,
    'challenge' => Icons.emoji_events_rounded,
    'group' => Icons.groups_rounded,
    _ => Icons.notifications_none_rounded,
  };
}

class _ReadNotificationsPage extends StatelessWidget {
  const _ReadNotificationsPage({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final read = controller.notifications.where((n) => !n.unread).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Read notifications'),
        backgroundColor: AppTheme.slate,
        foregroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.white),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      body: read.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.done_all_rounded,
                      size: 48,
                      color: AppTheme.muted,
                    ),
                    SizedBox(height: 12),
                    Text(
                      'No read notifications yet',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Notifications you mark as read will appear here.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: read.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) => _NotificationTile(
                notification: read[index],
                controller: controller,
              ),
            ),
    );
  }
}

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key, required this.controller});

  final AppController controller;

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final _inputController = TextEditingController();

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final messages = widget.controller.chatMessages;
        final latestMessage = messages.isEmpty ? null : messages.last;
        final replyOptions =
            !widget.controller.sendingChat && latestMessage?.role == 'assistant'
            ? _getAssistantQuickReplyOptions(latestMessage!.text)
            : const <_AssistantQuickReply>[];
        final chips = replyOptions.isNotEmpty
            ? replyOptions
            : _assistantSuggestions
                  .map(
                    (suggestion) => _AssistantQuickReply(
                      label: suggestion,
                      value: suggestion,
                    ),
                  )
                  .toList(growable: false);
        return Scaffold(
          appBar: AppBar(title: const Text('AI Assistant')),
          body: Column(
            children: [
              Expanded(
                child: ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.all(16),
                  itemCount: widget.controller.chatMessages.length,
                  itemBuilder: (context, index) {
                    final message =
                        widget.controller.chatMessages[widget
                                .controller
                                .chatMessages
                                .length -
                            1 -
                            index];
                    final isUser = message.role == 'user';
                    return Align(
                      alignment: isUser
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 320),
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isUser ? AppTheme.teal : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: isUser
                              ? null
                              : Border.all(color: AppTheme.border),
                        ),
                        child: Text(
                          message.text,
                          style: TextStyle(
                            color: isUser ? Colors.white : AppTheme.slate,
                            height: 1.45,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        height: 42,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: chips.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final quickReply = chips[index];
                            return ActionChip(
                              label: Text(
                                quickReply.label,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              onPressed: widget.controller.sendingChat
                                  ? null
                                  : () => _send(quickReply.value),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _inputController,
                              decoration: const InputDecoration(
                                hintText: 'Ask anything about your SplitStack',
                              ),
                              onSubmitted: (_) => _send(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          FilledButton(
                            onPressed: widget.controller.sendingChat
                                ? null
                                : () => _send(),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(54, 54),
                              padding: EdgeInsets.zero,
                            ),
                            child: widget.controller.sendingChat
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : const Icon(Icons.send_rounded),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _send([String? override]) async {
    final text = (override ?? _inputController.text).trim();
    if (text.isEmpty) return;
    if (override == null) {
      _inputController.clear();
    }
    try {
      await widget.controller.sendChatMessage(text);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.controller.errorMessage ?? 'Message failed'),
        ),
      );
    }
  }
}

List<_AssistantQuickReply> _getAssistantQuickReplyOptions(String text) {
  final lines = text
      .trim()
      .split(RegExp(r'\n+'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .toList(growable: false);
  if (lines.isEmpty) return const [];

  final lastLine = lines.last;
  if (!RegExp(r'\?\s*$').hasMatch(lastLine)) return const [];

  final cleaned = lastLine
      .replaceFirst(RegExp(r'^question:\s*', caseSensitive: false), '')
      .replaceFirst(RegExp(r'\?\s*$'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  final afterColon = cleaned.contains(':')
      ? cleaned.split(':').last.trim()
      : cleaned;

  final budgetOptions = _getBudgetQuickReplyOptions(afterColon);
  if (budgetOptions.length >= 2) {
    return budgetOptions.take(4).toList(growable: false);
  }

  final optionText = afterColon
      .replaceFirst(
        RegExp(
          r'^(?:do you want|would you like|should i|should we|shall we|do we|which would you prefer|which should we review|what should we focus on)\s+',
          caseSensitive: false,
        ),
        '',
      )
      .replaceFirst(
        RegExp(
          r'^(?:to\s+)?(?:budget\s+for|set|create|make)\s+(?:a\s+)?(?:budget\s+for\s+)?',
          caseSensitive: false,
        ),
        '',
      );
  final uniqueParts = <String, String>{};
  for (final part in optionText.split(
    RegExp(r'\s*,\s*|\s+or\s+', caseSensitive: false),
  )) {
    final cleanedPart = part
        .replaceFirst(
          RegExp(r'^(?:or|and|the|a|an)\s+', caseSensitive: false),
          '',
        )
        .trim();
    if (cleanedPart.isEmpty ||
        cleanedPart.length > 38 ||
        cleanedPart.split(RegExp(r'\s+')).length > 5) {
      continue;
    }
    uniqueParts.putIfAbsent(cleanedPart.toLowerCase(), () => cleanedPart);
  }
  if (uniqueParts.length >= 2 && uniqueParts.length <= 4) {
    return uniqueParts.values
        .map(
          (option) => _AssistantQuickReply(
            label: option,
            value: "Let's focus on $option.",
          ),
        )
        .toList(growable: false);
  }

  if (RegExp(
    r'^(question:\s*)?(do|does|did|should|would|could|can|are|is|am|have|has|will)\b',
    caseSensitive: false,
  ).hasMatch(lastLine)) {
    final topic = _getQuestionTopic(lastLine);
    return [
      _AssistantQuickReply(
        label: 'yes',
        value: topic.isNotEmpty ? 'Yes, $topic.' : 'Yes',
      ),
      _AssistantQuickReply(
        label: 'no',
        value: topic.isNotEmpty ? 'No, not $topic.' : 'No',
      ),
    ];
  }

  return const [];
}

List<_AssistantQuickReply> _getBudgetQuickReplyOptions(String question) {
  if (!RegExp(r'\bbudget', caseSensitive: false).hasMatch(question) ||
      !RegExp(r'\bcategor', caseSensitive: false).hasMatch(question)) {
    return const [];
  }

  final options = <_AssistantQuickReply>[];
  if (RegExp(
    r'\b(?:total\s+)?monthly\s+budget\b',
    caseSensitive: false,
  ).hasMatch(question)) {
    final amount = RegExp(
      r'\$\s*(?:[0-9]+(?:,[0-9]{3})*|[0-9]+)(?:\.[0-9]{1,2})?',
    ).firstMatch(question)?.group(0)?.replaceAll(RegExp(r'\s+'), '');
    options.add(
      _AssistantQuickReply(
        label: 'set a monthly budget',
        value: amount == null
            ? 'Set a total monthly budget.'
            : 'Set a total monthly budget of $amount.',
      ),
    );
  }

  final lowerQuestion = question.toLowerCase();
  final categoryMatches =
      _categoryOptions
          .where((category) => category != 'Other')
          .map(
            (category) => (
              category: category,
              index: lowerQuestion.indexOf(category.toLowerCase()),
            ),
          )
          .where((match) => match.index >= 0)
          .toList()
        ..sort((first, second) => first.index.compareTo(second.index));

  for (final match in categoryMatches) {
    final amount = _findCategoryBudgetAmount(question, match.category);
    options.add(
      _AssistantQuickReply(
        label: match.category,
        value: amount.isEmpty
            ? 'Set a ${match.category} budget.'
            : 'Set a ${match.category} budget of $amount.',
      ),
    );
  }

  final seen = <String>{};
  return options
      .where((option) {
        final key = option.label.toLowerCase();
        if (seen.contains(key)) return false;
        seen.add(key);
        return true;
      })
      .toList(growable: false);
}

String _findCategoryBudgetAmount(String question, String category) {
  final escapedCategory = RegExp.escape(category);
  const amountPattern =
      r'\$\s*(?:[0-9]+(?:,[0-9]{3})*|[0-9]+)(?:\.[0-9]{1,2})?';
  final patterns = [
    RegExp(
      '\\b$escapedCategory\\b\\s*\\(\\s*($amountPattern)\\s*\\)',
      caseSensitive: false,
    ),
    RegExp(
      '\\b$escapedCategory\\b[^.\$?]{0,40}?\\b(?:at|of|to|for|around|about)\\s+($amountPattern)',
      caseSensitive: false,
    ),
    RegExp('\\b$escapedCategory\\b\\s+($amountPattern)', caseSensitive: false),
    RegExp(
      '($amountPattern)[^.\$?]{0,40}?\\b$escapedCategory\\b',
      caseSensitive: false,
    ),
  ];

  for (final pattern in patterns) {
    final match = pattern.firstMatch(question);
    if (match != null) {
      return match.group(1)?.replaceAll(RegExp(r'\s+'), '') ?? '';
    }
  }
  return '';
}

String _getQuestionTopic(String question) {
  final cleaned = question
      .replaceFirst(RegExp(r'^question:\s*', caseSensitive: false), '')
      .replaceFirst(RegExp(r'\?\s*$'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  final match = RegExp(
    r'^(?:do you want|would you like|should i|should we|shall we|do we|can i|can we|could i|could we)\s+(.+)$',
    caseSensitive: false,
  ).firstMatch(cleaned);
  if (match == null) return '';
  return match.group(1)?.trim() ?? '';
}

class _BalanceHero extends StatelessWidget {
  const _BalanceHero({
    required this.user,
    required this.dashboard,
    required this.analytics,
    required this.avgMonthlySpend,
    required this.ytdSpend,
  });

  final User user;
  final DashboardData dashboard;
  final AnalyticsData analytics;
  final double avgMonthlySpend;
  final double ytdSpend;

  @override
  Widget build(BuildContext context) {
    final balance = dashboard.balance;
    final positive = balance.net >= 0;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF134E4A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _ProfileAvatar(
                initials: user.initials,
                avatarColor: user.avatarColor,
                avatarEmoji: user.avatarEmoji,
                radius: 24,
                fallbackTextColor: Colors.white,
                fallbackBackgroundColor: Colors.white.withValues(alpha: 0.14),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back, ${user.name.split(' ').first}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${analytics.expenseCount} approved expenses tracked',
                      style: const TextStyle(color: Color(0xFFCBD5E1)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text('Net balance', style: TextStyle(color: Color(0xFF94A3B8))),
          const SizedBox(height: 6),
          Text(
            money(balance.net),
            style: TextStyle(
              color: positive
                  ? const Color(0xFF5EEAD4)
                  : const Color(0xFFFCA5A5),
              fontSize: 42,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.4,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _HeroMetric(
                  label: 'People to settle',
                  value: '${balance.settleCount}',
                ),
              ),
              Expanded(
                child: _HeroMetric(label: 'YTD spend', value: money(ytdSpend)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8))),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _UnbudgetedNotice extends StatelessWidget {
  const _UnbudgetedNotice({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.amber.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, size: 16, color: AppTheme.amber),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.tone,
    this.onTap,
  });

  final String label;
  final String value;
  final Color tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  if (onTap != null)
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: tone,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BudgetCard extends StatefulWidget {
  const _BudgetCard({
    required this.controller,
    required this.analytics,
    required this.onEdit,
  });

  final AppController controller;
  final AnalyticsData analytics;
  final VoidCallback onEdit;

  @override
  State<_BudgetCard> createState() => _BudgetCardState();
}

class _BudgetCardState extends State<_BudgetCard> {
  bool _breakdownOpen = false;

  @override
  Widget build(BuildContext context) {
    final goal = widget.controller.budgetGoal;
    final g = (goal != null && goal.total > 0) ? goal : null;
    final breakdown = goal?.breakdown ?? const {};
    final actuals = goal?.actuals ?? const {};
    final spent = actuals.values.fold(0.0, (sum, v) => sum + v);
    // Categories with actual spend but no budget allocation
    final unbudgeted = actuals.entries
        .where((e) => (breakdown[e.key] ?? 0) == 0 && e.value > 0)
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        g != null
                            ? '${_formatMonth(g.month)} Budget'
                            : '${_formatMonth(DateTime.now().toIso8601String().substring(0, 7))} Budget',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        g != null
                            ? 'Goal: ${money(g.total)}'
                            : 'No budget set for this month',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: widget.onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: Text(g != null ? 'Edit' : 'Set Budget'),
                ),
              ],
            ),
            if (g != null) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${money(spent)} spent',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '${money((g.total - spent).clamp(0, double.infinity))} left',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: spent > g.total ? AppTheme.red : AppTheme.teal,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  minHeight: 10,
                  value: (spent / g.total).clamp(0.0, 1.0),
                  backgroundColor: const Color(0xFFE2E8F0),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    spent > g.total ? AppTheme.red : AppTheme.teal,
                  ),
                ),
              ),
            ],
            if (g == null && spent > 0) ...[
              const SizedBox(height: 10),
              _UnbudgetedNotice(
                children: [
                  Text(
                    'You\'ve spent ${money(spent)} this month across '
                    '${actuals.length} categor${actuals.length == 1 ? 'y' : 'ies'}, '
                    'but no monthly budget is set.',
                    style: const TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap Set Budget to start tracking your spending.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ] else if (unbudgeted.isNotEmpty) ...[
              const SizedBox(height: 10),
              _UnbudgetedNotice(
                children: [
                  const Text(
                    'Spending outside your budget:',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ...unbudgeted.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        'You spent ${money(e.value)} on ${e.key}, but no budget is set for this category.',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap Edit to add these categories to your breakdown.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
            if (breakdown.isNotEmpty) ...[
              const SizedBox(height: 10),
              InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => setState(() => _breakdownOpen = !_breakdownOpen),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Text(
                        'Category breakdown',
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        _breakdownOpen
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ],
                  ),
                ),
              ),
              if (_breakdownOpen) ...[
                const SizedBox(height: 8),
                ...breakdown.entries.map((e) {
                  final budgeted = e.value;
                  final catSpent = actuals[e.key] ?? 0.0;
                  final ratio = budgeted > 0
                      ? (catSpent / budgeted).clamp(0.0, 1.0)
                      : 0.0;
                  final over = catSpent > budgeted;
                  final barColor = over ? AppTheme.red : AppTheme.teal;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              e.key,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              '${money(catSpent)} / ${money(budgeted)}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: over ? AppTheme.red : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            minHeight: 7,
                            value: ratio,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: AlwaysStoppedAnimation<Color>(barColor),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _BudgetFormOverlay extends StatefulWidget {
  const _BudgetFormOverlay({required this.controller, required this.onClose});

  final AppController controller;
  final VoidCallback onClose;

  @override
  State<_BudgetFormOverlay> createState() => _BudgetFormOverlayState();
}

class _BudgetFormOverlayState extends State<_BudgetFormOverlay> {
  late final TextEditingController _totalCtrl;
  final Map<String, TextEditingController> _catCtrls = {};
  bool _saving = false;
  String? _error;

  void _rebuild() => setState(() {});

  @override
  void initState() {
    super.initState();
    final existing = widget.controller.budgetGoal;
    final currentTotal = (existing?.total ?? 0) > 0 ? existing!.total : null;
    _totalCtrl = TextEditingController(
      text: currentTotal != null ? currentTotal.toStringAsFixed(2) : '',
    );
    _totalCtrl.addListener(_rebuild);
    for (final cat in _categoryOptions) {
      final val = existing?.breakdown[cat];
      _catCtrls[cat] = TextEditingController(
        text: val != null && val > 0 ? val.toStringAsFixed(2) : '',
      );
      _catCtrls[cat]!.addListener(_rebuild);
    }
  }

  @override
  void dispose() {
    _totalCtrl.removeListener(_rebuild);
    _totalCtrl.dispose();
    for (final c in _catCtrls.values) {
      c.removeListener(_rebuild);
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final total = double.tryParse(_totalCtrl.text.trim());
    if (total == null || total <= 0) {
      setState(() => _error = 'Enter a valid total budget amount.');
      return;
    }
    final breakdown = <String, double>{};
    for (final cat in _categoryOptions) {
      final val = double.tryParse(_catCtrls[cat]!.text.trim());
      if (val != null && val > 0) breakdown[cat] = val;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.controller.saveBudget(total: total, breakdown: breakdown);
      if (mounted) widget.onClose();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = double.tryParse(_totalCtrl.text.trim()) ?? 0;
    final catSum = _catCtrls.values.fold(
      0.0,
      (sum, c) => sum + (double.tryParse(c.text.trim()) ?? 0),
    );
    final overBudget = total > 0 && catSum > total;

    return Stack(
      children: [
        // Scrim — tapping outside the card dismisses the form
        Positioned.fill(
          child: GestureDetector(
            onTap: _saving ? null : widget.onClose,
            child: const ColoredBox(color: Color(0x80000000)),
          ),
        ),
        // Form card — centered within the page body
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: Material(
              borderRadius: BorderRadius.circular(12),
              child: GestureDetector(
                onTap: () {}, // absorb taps so they don't reach the scrim
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Set Monthly Budget',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 18),
                        TextField(
                          controller: _totalCtrl,
                          autofocus: true,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Total monthly goal (\$)',
                            border: OutlineInputBorder(),
                            prefixText: '\$ ',
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'Category breakdown (optional)',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Allocate your budget across spending categories.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 12),
                        ..._categoryOptions.map(
                          (cat) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: TextField(
                              controller: _catCtrls[cat],
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: InputDecoration(
                                labelText: cat,
                                border: const OutlineInputBorder(),
                                prefixText: '\$ ',
                              ),
                            ),
                          ),
                        ),
                        if (overBudget)
                          Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: AppTheme.amber.withValues(alpha: 0.4),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    size: 16,
                                    color: AppTheme.amber,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Category total \$${catSum.toStringAsFixed(2)} exceeds your budget of \$${total.toStringAsFixed(2)}.',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (_error != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _error!,
                            style: const TextStyle(color: AppTheme.red),
                          ),
                        ],
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _saving ? null : widget.onClose,
                                child: const Text('Cancel'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                onPressed: _saving || overBudget ? null : _save,
                                child: _saving
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text('Save'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Owed to person page ────────────────────────────────────────────────────

class _OwedToPersonPage extends StatefulWidget {
  const _OwedToPersonPage({
    required this.balance,
    required this.controller,
    required this.onPaymentSheet,
  });

  final CounterpartyBalance balance;
  final AppController controller;
  final Future<void> Function(BuildContext, Expense) onPaymentSheet;

  @override
  State<_OwedToPersonPage> createState() => _OwedToPersonPageState();
}

class _OwedToPersonPageState extends State<_OwedToPersonPage> {
  final Set<String> _selected = {};

  List<Expense> get _openExpenses => widget.controller.expenses
      .where(
        (e) =>
            e.paidById == widget.balance.id &&
            e.userPaymentStatus != 'paid' &&
            e.userOwes > 0,
      )
      .toList();

  bool get _allSelected =>
      _openExpenses.isNotEmpty &&
      _openExpenses.every((e) => _selected.contains(e.id));

  double get _selectedTotal => _openExpenses
      .where((e) => _selected.contains(e.id))
      .fold(0.0, (sum, e) => sum + (e.userOwes - e.userPaid));

  void _toggleAll() {
    setState(() {
      if (_allSelected) {
        _selected.clear();
      } else {
        _selected.addAll(_openExpenses.map((e) => e.id));
      }
    });
  }

  Future<void> _paySelected(BuildContext context) async {
    final toPayIds = Set<String>.from(_selected);
    final toPay = _openExpenses.where((e) => toPayIds.contains(e.id)).toList();
    if (toPay.isEmpty) return;

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    for (final expense in toPay) {
      await widget.onPaymentSheet(context, expense);
      if (!mounted) return;
    }

    setState(() => _selected.removeAll(toPayIds));

    if (_openExpenses.isEmpty && mounted) {
      messenger.showSnackBar(const SnackBar(content: Text('All settled up!')));
      navigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final expenses = _openExpenses;
    final balance = widget.balance;

    return Scaffold(
      appBar: AppBar(
        title: Text('You owe ${balance.name}'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        systemOverlayStyle: Theme.of(context).brightness == Brightness.dark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),
      body: expenses.isEmpty
          ? const Center(child: Text('Nothing open — all settled!'))
          : Column(
              children: [
                // Header card
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          _ProfileAvatar(
                            initials: balance.initials,
                            avatarColor: balance.avatarColor,
                            avatarEmoji: balance.avatarEmoji,
                            radius: 24,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  balance.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  'Total owed: ${money(balance.amount)}',
                                  style: const TextStyle(
                                    color: AppTheme.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // Select all row
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _allSelected,
                        onChanged: (_) => _toggleAll(),
                        activeColor: AppTheme.teal,
                      ),
                      const Text(
                        'Select all',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                // Expense list
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                    itemCount: expenses.length,
                    itemBuilder: (context, i) {
                      final expense = expenses[i];
                      final remaining = expense.userOwes - expense.userPaid;
                      final checked = _selected.contains(expense.id);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: CheckboxListTile(
                          value: checked,
                          activeColor: AppTheme.teal,
                          onChanged: (_) => setState(() {
                            if (checked) {
                              _selected.remove(expense.id);
                            } else {
                              _selected.add(expense.id);
                            }
                          }),
                          title: Text(
                            expense.description,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            '${expense.groupName} • ${expense.category} • ${formatDate(expense.expenseDate)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          secondary: Text(
                            money(remaining),
                            style: const TextStyle(
                              color: AppTheme.red,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
      // Pay button anchored to bottom
      bottomNavigationBar: expenses.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton(
                  onPressed: _selected.isEmpty
                      ? null
                      : () => _paySelected(context),
                  child: Text(
                    _selected.isEmpty
                        ? 'Select expenses to pay'
                        : 'Pay selected (${money(_selectedTotal)})',
                  ),
                ),
              ),
            ),
    );
  }
}

// ── Recent expenses card ───────────────────────────────────────────────────

class _RecentExpensesCard extends StatelessWidget {
  const _RecentExpensesCard({
    required this.controller,
    required this.userId,
    required this.onPaymentSheet,
  });

  final AppController controller;
  final String userId;
  final Future<void> Function(BuildContext, Expense) onPaymentSheet;

  double _userShare(Expense e) {
    if (e.groupId == 'self') return e.amount;
    final split = e.splits.firstWhere(
      (s) => s.userId == userId,
      orElse: () => ExpenseSplit(userId: '', amount: 0),
    );
    return split.amount;
  }

  @override
  Widget build(BuildContext context) {
    final sorted = [...controller.expenses]
      ..sort((a, b) => b.expenseDate.compareTo(a.expenseDate));
    final top3 = sorted.take(3).toList();
    final hasMore = sorted.length > 3;

    if (sorted.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Expenses',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            ...top3.map((expense) {
              final share = _userShare(expense);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => onPaymentSheet(context, expense),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              expense.description,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${expense.groupId == 'self' ? 'Personal' : expense.groupName} • ${formatDate(expense.expenseDate)}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        money(share),
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            if (hasMore) ...[
              const Divider(height: 1),
              const SizedBox(height: 8),
              InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        _MyExpensesPage(controller: controller, userId: userId),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'See more',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── My expenses page ───────────────────────────────────────────────────────

class _MyExpensesPage extends StatelessWidget {
  const _MyExpensesPage({required this.controller, required this.userId});

  final AppController controller;
  final String userId;

  double _userShare(Expense e) {
    if (e.groupId == 'self') return e.amount;
    final split = e.splits.firstWhere(
      (s) => s.userId == userId,
      orElse: () => ExpenseSplit(userId: '', amount: 0),
    );
    return split.amount;
  }

  @override
  Widget build(BuildContext context) {
    final sorted = [...controller.expenses]
      ..sort((a, b) => b.expenseDate.compareTo(a.expenseDate));

    final byMonth = <String, List<Expense>>{};
    for (final e in sorted) {
      final month = e.expenseDate.length >= 7
          ? e.expenseDate.substring(0, 7)
          : 'Unknown';
      byMonth.putIfAbsent(month, () => []).add(e);
    }
    final sortedMonths = byMonth.keys.toList()..sort((a, b) => b.compareTo(a));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Expenses'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        systemOverlayStyle: Theme.of(context).brightness == Brightness.dark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),
      body: sorted.isEmpty
          ? const Center(child: Text('No expenses yet.'))
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: sortedMonths.length,
              itemBuilder: (context, index) {
                final month = sortedMonths[index];
                final items = byMonth[month]!;
                final monthTotal = items.fold(
                  0.0,
                  (sum, e) => sum + _userShare(e),
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _formatMonth(month),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                  ),
                                ),
                              ),
                              Text(
                                money(monthTotal),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Divider(height: 1),
                          ...items.map((expense) {
                            final share = _userShare(expense);
                            return Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          expense.description,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${expense.groupId == 'self' ? 'Personal' : expense.groupName} • ${expense.category} • ${formatDate(expense.expenseDate)}',
                                          style: Theme.of(
                                            context,
                                          ).textTheme.bodySmall,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    money(share),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ── Group spending section ─────────────────────────────────────────────────

class _GroupSpendingSection extends StatelessWidget {
  const _GroupSpendingSection({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    // Compute totals from live expenses, grouped by groupId (exclude 'self')
    final totals = <String, double>{};
    final names = <String, String>{};
    for (final expense in controller.expenses) {
      if (expense.groupId == 'self') continue;
      totals[expense.groupId] = (totals[expense.groupId] ?? 0) + expense.amount;
      names[expense.groupId] = expense.groupName;
    }

    if (totals.isEmpty) {
      return const SizedBox.shrink();
    }

    final sorted = totals.keys.toList()
      ..sort((a, b) => totals[b]!.compareTo(totals[a]!));

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Group spending',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            ...sorted.asMap().entries.map((entry) {
              final groupId = entry.value;
              final name = names[groupId]!;
              final total = totals[groupId]!;
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: AppTheme.teal.withValues(
                            alpha: 0.12,
                          ),
                          foregroundColor: AppTheme.teal,
                          child: Text(
                            name.isEmpty ? '?' : name[0].toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        Text(
                          money(total),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right_rounded),
                          color: AppTheme.muted,
                          visualDensity: VisualDensity.compact,
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => _GroupExpensesPage(
                                groupId: groupId,
                                groupName: name,
                                totalSpend: total,
                                controller: controller,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _GroupExpensesPage extends StatelessWidget {
  const _GroupExpensesPage({
    required this.groupId,
    required this.groupName,
    required this.totalSpend,
    required this.controller,
  });

  final String groupId;
  final String groupName;
  final double totalSpend;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final expenses = controller.expenses
        .where((e) => e.groupId == groupId)
        .toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        systemOverlayStyle: Theme.of(context).brightness == Brightness.dark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          16 + MediaQuery.of(context).padding.bottom,
        ),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppTheme.teal.withValues(alpha: 0.12),
                    foregroundColor: AppTheme.teal,
                    child: Text(
                      groupName.isEmpty ? '?' : groupName[0].toUpperCase(),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        groupName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        money(totalSpend),
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.teal,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Total group spending',
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (expenses.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Text('No expenses yet for this group.'),
              ),
            )
          else ...[
            ...() {
              final byMonth = <String, List<Expense>>{};
              for (final e in expenses) {
                final month = e.expenseDate.length >= 7
                    ? e.expenseDate.substring(0, 7)
                    : 'Unknown';
                byMonth.putIfAbsent(month, () => []).add(e);
              }
              final sortedMonths = byMonth.keys.toList()
                ..sort((a, b) => b.compareTo(a));
              return sortedMonths.map((month) {
                final items = byMonth[month]!;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatMonth(month),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Divider(height: 1),
                          ...items.map(
                            (expense) => Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          expense.description,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        money(expense.amount),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${expense.category} • Paid by ${expense.paidByName} • ${formatDate(expense.expenseDate)}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 6,
                                    children: [
                                      Chip(
                                        visualDensity: VisualDensity.compact,
                                        label: Text(
                                          expense.settlementStatus == 'paid'
                                              ? 'Settled'
                                              : 'Open',
                                        ),
                                      ),
                                      if (expense.userPaymentStatus == 'paid')
                                        const Chip(
                                          visualDensity: VisualDensity.compact,
                                          label: Text('You paid'),
                                        ),
                                      if (expense.userOwes > 0)
                                        Chip(
                                          visualDensity: VisualDensity.compact,
                                          label: Text(
                                            'Your share: ${money(expense.userOwes)}',
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              });
            }(),
          ],
        ],
      ),
    );
  }
}

String _formatMonth(String ym) {
  if (ym.length < 7) return ym;
  final parts = ym.split('-');
  const months = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  final m = int.tryParse(parts[1]) ?? 0;
  return '${months[m]} ${parts[0]}';
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _VoteCard extends StatelessWidget {
  const _VoteCard({required this.vote, required this.controller});

  final Vote vote;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final currentUserId = controller.user?.id;
    final isCreator =
        currentUserId != null && vote.requestedBy == currentUserId;
    final mine = currentUserId == null
        ? null
        : vote.decisions
              .where((d) => d.userId == currentUserId)
              .cast<VoteDecision?>()
              .firstOrNull;

    final isPending = vote.status == 'pending';
    final isApproved = mine?.decision == 'yes';

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        color: isPending ? AppTheme.slate : Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _StatusChip(label: vote.status, dark: isPending),
                  _StatusChip(label: vote.category, dark: isPending),
                  if (isCreator)
                    _StatusChip(label: 'You created this', dark: isPending)
                  else if (mine != null)
                    _StatusChip(
                      label: 'You voted ${mine.decision}',
                      dark: isPending,
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                vote.description,
                style: TextStyle(
                  color: isPending ? Colors.white : AppTheme.slate,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${vote.groupName} • Requested by ${vote.requestedByName}',
                style: TextStyle(
                  color: isPending ? const Color(0xFFCBD5E1) : AppTheme.muted,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                money(vote.amount),
                style: TextStyle(
                  color: isPending ? const Color(0xFF5EEAD4) : AppTheme.teal,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (vote.reason.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  vote.reason,
                  style: TextStyle(
                    color: isPending ? const Color(0xFFCBD5E1) : AppTheme.slate,
                    height: 1.45,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: vote.decisions
                    .map(
                      (d) => _StatusChip(
                        label: '${d.name}: ${d.decision}',
                        dark: isPending,
                      ),
                    )
                    .toList(),
              ),
              if (isPending) ...[
                const SizedBox(height: 18),
                if (isCreator && mine != null) ...[
                  // Creator's auto-approved badge + undo — no Expanded so Row is never unconstrained
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 10,
                          horizontal: 14,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0x2622C55E),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0x5922C55E)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              color: Color(0xFF4ADE80),
                              size: 16,
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Approved',
                              style: TextStyle(
                                color: Color(0xFF4ADE80),
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      TextButton(
                        onPressed: controller.loading
                            ? null
                            : () async {
                                try {
                                  await controller.undoVote(voteId: vote.id);
                                } catch (_) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        controller.errorMessage ??
                                            'Unable to undo vote.',
                                      ),
                                    ),
                                  );
                                }
                              },
                        style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                        ),
                        child: const Text('Undo'),
                      ),
                    ],
                  ),
                ] else if (mine != null) ...[
                  // Voter who already voted: decision badge + undo — same no-Expanded layout
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 10,
                          horizontal: 14,
                        ),
                        decoration: BoxDecoration(
                          color: isApproved
                              ? const Color(0x2622C55E)
                              : const Color(0x26EF4444),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isApproved
                                ? const Color(0x5922C55E)
                                : const Color(0x59EF4444),
                          ),
                        ),
                        child: Text(
                          isApproved ? 'You approved' : 'You declined',
                          style: TextStyle(
                            color: isApproved
                                ? const Color(0xFF4ADE80)
                                : const Color(0xFFFCA5A5),
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      TextButton(
                        onPressed: controller.loading
                            ? null
                            : () async {
                                try {
                                  await controller.undoVote(voteId: vote.id);
                                } catch (_) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        controller.errorMessage ??
                                            'Unable to undo vote.',
                                      ),
                                    ),
                                  );
                                }
                              },
                        style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                        ),
                        child: const Text('Undo'),
                      ),
                    ],
                  ),
                ] else ...[
                  // Unvoted member: approve / decline
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: controller.loading
                              ? null
                              : () async {
                                  try {
                                    await controller.respondToVote(
                                      voteId: vote.id,
                                      decision: 'no',
                                    );
                                  } catch (_) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          controller.errorMessage ??
                                              'Unable to submit vote.',
                                        ),
                                      ),
                                    );
                                  }
                                },
                          child: const Text('Decline'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: controller.loading
                              ? null
                              : () async {
                                  try {
                                    await controller.respondToVote(
                                      voteId: vote.id,
                                      decision: 'yes',
                                    );
                                  } catch (_) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          controller.errorMessage ??
                                              'Unable to submit vote.',
                                        ),
                                      ),
                                    );
                                  }
                                },
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF5EEAD4),
                            foregroundColor: AppTheme.slate,
                          ),
                          child: const Text('Approve'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _InviteCard extends StatelessWidget {
  const _InviteCard({required this.invite, required this.controller});

  final GroupInvite invite;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.amber.withValues(alpha: 0.14),
                    foregroundColor: AppTheme.amber,
                    child: const Icon(Icons.mail_outline_rounded),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invite.groupName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          'Invited by ${invite.invitedByName} as ${invite.role}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: controller.loading
                          ? null
                          : () => _respond(context, accept: false),
                      child: const Text('Decline'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: controller.loading
                          ? null
                          : () => _respond(context, accept: true),
                      child: const Text('Accept'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _respond(BuildContext context, {required bool accept}) async {
    try {
      await controller.respondToInvite(inviteId: invite.id, accept: accept);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(accept ? 'Invite accepted.' : 'Invite declined.'),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(controller.errorMessage ?? 'Unable to update invite.'),
        ),
      );
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.dark});

  final String label;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: dark
            ? Colors.white.withValues(alpha: 0.12)
            : AppTheme.teal.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: dark ? Colors.white : AppTheme.tealDark,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _NewGroupSheet extends StatefulWidget {
  const _NewGroupSheet({required this.controller, this.group});

  final AppController controller;
  final Group? group;

  @override
  State<_NewGroupSheet> createState() => _NewGroupSheetState();
}

class _NewGroupSheetState extends State<_NewGroupSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _thresholdController = TextEditingController(text: '200');
  final _descriptionController = TextEditingController();
  final _invitesController = TextEditingController();
  String _type = 'roommates';

  bool get _editing => widget.group != null;

  @override
  void initState() {
    super.initState();
    final group = widget.group;
    if (group != null) {
      _nameController.text = group.name;
      _thresholdController.text = group.threshold.toStringAsFixed(2);
      _descriptionController.text = group.description;
      _invitesController.text = group.pendingInvites
          .map((invite) => invite.email)
          .join('\n');
      _type = group.type;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _thresholdController.dispose();
    _descriptionController.dispose();
    _invitesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        16,
        16,
        16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              _editing ? 'Edit group' : 'New group',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Group name'),
              validator: (value) =>
                  (value ?? '').trim().isEmpty ? 'Enter a group name' : null,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Group type'),
              items: const [
                DropdownMenuItem(value: 'roommates', child: Text('Roommates')),
                DropdownMenuItem(value: 'trip', child: Text('Trip')),
                DropdownMenuItem(value: 'household', child: Text('Household')),
                DropdownMenuItem(value: 'custom', child: Text('Custom')),
              ],
              onChanged: (value) => setState(() => _type = value ?? _type),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _thresholdController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(labelText: 'Voting threshold'),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _invitesController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Invite emails',
                hintText: 'Comma or newline separated',
              ),
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: widget.controller.loading ? null : _submit,
              child: Text(_editing ? 'Save changes' : 'Create group'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      final group = widget.group;
      if (group == null) {
        await widget.controller.createGroup(
          name: _nameController.text.trim(),
          type: _type,
          threshold: double.tryParse(_thresholdController.text.trim()) ?? 0,
          description: _descriptionController.text.trim(),
          inviteEmails: _parseInviteEmails(_invitesController.text),
        );
      } else {
        await widget.controller.updateGroup(
          groupId: group.id,
          name: _nameController.text.trim(),
          type: _type,
          threshold: double.tryParse(_thresholdController.text.trim()) ?? 0,
          description: _descriptionController.text.trim(),
          inviteEmails: _parseInviteEmails(_invitesController.text),
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_editing ? 'Group updated.' : 'Group created.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ??
                (_editing
                    ? 'Unable to update group.'
                    : 'Unable to create group.'),
          ),
        ),
      );
    }
  }
}

class _GroupDetailsSheet extends StatelessWidget {
  const _GroupDetailsSheet({required this.group, required this.controller});

  final Group group;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final group =
        controller.groups
            .where((item) => item.id == this.group.id)
            .firstOrNull ??
        this.group;
    final groupExpenses = controller.expenses
        .where((expense) => expense.groupId == group.id)
        .toList();
    final pendingVotes = controller.votes
        .where((vote) => vote.groupId == group.id && vote.status == 'pending')
        .toList();
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            Text(group.emoji, style: const TextStyle(fontSize: 36)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    group.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text('${group.type} • ${money(group.threshold)} threshold'),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            if (group.isOwner) ...[
              OutlinedButton.icon(
                onPressed: controller.loading ? null : () => _showEdit(context),
                icon: const Icon(Icons.edit_rounded),
                label: const Text('Edit group'),
              ),
              OutlinedButton.icon(
                onPressed: controller.loading
                    ? null
                    : () => _confirmDelete(context),
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('Delete group'),
              ),
            ],
          ],
        ),
        if (group.description.isNotEmpty) ...[
          const SizedBox(height: 18),
          Text(group.description),
        ],
        if (pendingVotes.isNotEmpty) ...[
          const SizedBox(height: 18),
          const Text(
            'Pending approval',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          ...pendingVotes.map((vote) {
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: AppTheme.amber.withValues(alpha: 0.14),
                foregroundColor: AppTheme.amber,
                child: Text(vote.category.isEmpty ? '?' : vote.category[0]),
              ),
              title: Text(vote.description),
              subtitle: Text(
                '${vote.decisions.where((decision) => decision.decision == 'yes').length}/${group.members.length} approved • by ${vote.requestedByName}',
              ),
              trailing: Text(
                money(vote.amount),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            );
          }),
        ],
        const SizedBox(height: 18),
        const Text(
          'Approved expenses',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        if (groupExpenses.isEmpty)
          const _EmptyCard(text: 'No approved expenses in this group yet.')
        else
          ...groupExpenses.map(
            (expense) => _ExpenseDetailTile(
              expense: expense,
              apiBaseUrl: controller.apiBaseUrl,
            ),
          ),
        const SizedBox(height: 18),
        const Text(
          'Members',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        ...group.members.map((member) {
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: _ProfileAvatar(
              initials: member.initials,
              avatarColor: member.avatarColor,
              avatarEmoji: member.avatarEmoji,
            ),
            title: Text(member.name),
            subtitle: Text(member.email),
            trailing: Chip(label: Text(member.role)),
          );
        }),
        if (group.pendingInvites.isNotEmpty) ...[
          const SizedBox(height: 18),
          const Text(
            'Pending invites',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          ...group.pendingInvites.map(
            (invite) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(
                child: Icon(Icons.mail_outline_rounded),
              ),
              title: Text(invite.email),
              subtitle: Text(invite.status),
            ),
          ),
        ],
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: group.isOwner || controller.loading
              ? null
              : () => _confirmLeave(context),
          icon: const Icon(Icons.logout_rounded),
          label: Text(group.isOwner ? 'Owner cannot leave' : 'Leave group'),
        ),
      ],
    );
  }

  Future<void> _showEdit(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _NewGroupSheet(controller: controller, group: group),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete ${group.name}?'),
        content: const Text(
          'This permanently removes the group, its expenses, votes, challenges, invites, and member history.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (shouldDelete != true || !context.mounted) return;
    try {
      await controller.deleteGroup(group.id);
      if (!context.mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Group deleted.')));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(controller.errorMessage ?? 'Unable to delete group.'),
        ),
      );
    }
  }

  Future<void> _confirmLeave(BuildContext context) async {
    final shouldLeave = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Leave ${group.name}?'),
        content: const Text(
          'You will stop seeing this group, its balances, and future expenses.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
    if (shouldLeave != true || !context.mounted) return;
    try {
      await controller.leaveGroup(group.id);
      if (!context.mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Left group.')));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(controller.errorMessage ?? 'Unable to leave group.'),
        ),
      );
    }
  }
}

class _ExpenseDetailTile extends StatelessWidget {
  const _ExpenseDetailTile({required this.expense, required this.apiBaseUrl});

  final Expense expense;
  final String apiBaseUrl;

  @override
  Widget build(BuildContext context) {
    final receiptUrl = _absoluteApiUrl(apiBaseUrl, expense.receiptUrl);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: AppTheme.teal.withValues(alpha: 0.12),
        foregroundColor: AppTheme.tealDark,
        child: Text(expense.category.isEmpty ? '?' : expense.category[0]),
      ),
      title: Text(expense.description),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${expense.category} • Paid by ${expense.paidByName} • ${formatDate(expense.expenseDate)}',
          ),
          if (receiptUrl != null) ...[
            const SizedBox(height: 8),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => _showReceipt(context, receiptUrl),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    receiptUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppTheme.teal.withValues(alpha: 0.08),
                      alignment: Alignment.center,
                      child: const Text('View receipt'),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
      trailing: Text(
        money(expense.amount),
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
    );
  }

  Future<void> _showReceipt(BuildContext context, String receiptUrl) {
    return showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Receipt',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Flexible(
              child: InteractiveViewer(
                child: Image.network(
                  receiptUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Unable to load receipt image.'),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SplitSummary extends StatelessWidget {
  const _SplitSummary({
    required this.splitMethod,
    required this.total,
    required this.amount,
  });

  final String splitMethod;
  final double total;
  final double amount;

  @override
  Widget build(BuildContext context) {
    final target = splitMethod == 'percent' ? 100.0 : amount;
    final valid = (total - target).abs() <= 0.25;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: valid ? const Color(0xFFF0FDFA) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(
            valid ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
            color: valid ? AppTheme.tealDark : AppTheme.amber,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              splitMethod == 'percent'
                  ? 'Current total: ${total.toStringAsFixed(2)}% of 100%'
                  : 'Current total: ${money(total)} of ${money(target)}',
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsAvatarPicker extends StatelessWidget {
  const _SettingsAvatarPicker({
    required this.initials,
    required this.selectedSeed,
    required this.saving,
    required this.onSelected,
  });

  final String initials;
  final String selectedSeed;
  final bool saving;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Profile picture', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        SizedBox(
          height: 58,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _avatarSeeds.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final seed = _avatarSeeds[index];
              final selected = seed == selectedSeed;
              return Tooltip(
                message: seed.isEmpty ? 'Initial' : seed,
                child: InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: saving ? null : () => onSelected(seed),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    width: 54,
                    height: 54,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected ? AppTheme.teal : AppTheme.border,
                        width: selected ? 3 : 1,
                      ),
                    ),
                    child: ClipOval(
                      child: seed.isEmpty
                          ? _InitialAvatarPreview(initials: initials)
                          : Image.network(
                              _diceBearUrl(seed),
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  ColoredBox(
                                    color: AppTheme.teal.withValues(
                                      alpha: 0.12,
                                    ),
                                    child: Center(
                                      child: Text(
                                        seed[0],
                                        style: const TextStyle(
                                          color: AppTheme.teal,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                            ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _InitialAvatarPreview extends StatelessWidget {
  const _InitialAvatarPreview({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppTheme.teal.withValues(alpha: 0.12),
      child: Center(
        child: Text(
          initials.isEmpty ? '?' : initials,
          style: const TextStyle(
            color: AppTheme.teal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
    this.radius = 20,
    this.fallbackTextColor = Colors.white,
    this.fallbackBackgroundColor,
  });

  final String initials;
  final String avatarColor;
  final String avatarEmoji;
  final double radius;
  final Color fallbackTextColor;
  final Color? fallbackBackgroundColor;

  @override
  Widget build(BuildContext context) {
    if (avatarEmoji.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppTheme.border,
        foregroundImage: NetworkImage(_diceBearUrl(avatarEmoji)),
        onForegroundImageError: (error, stackTrace) {},
        child: Text(
          initials,
          style: TextStyle(
            color: AppTheme.tealDark,
            fontWeight: FontWeight.w800,
            fontSize: radius * 0.62,
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: fallbackBackgroundColor ?? colorFromHex(avatarColor),
      child: Text(
        initials,
        style: TextStyle(
          color: fallbackTextColor,
          fontWeight: FontWeight.w800,
          fontSize: radius * 0.62,
        ),
      ),
    );
  }
}

class _CenteredState extends StatelessWidget {
  const _CenteredState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 34,
              backgroundColor: AppTheme.teal.withValues(alpha: 0.1),
              foregroundColor: AppTheme.teal,
              child: Icon(icon, size: 34),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: const EdgeInsets.all(20), child: Text(text)),
    );
  }
}

String money(double value) {
  final sign = value < 0 ? '-' : '';
  return '$sign\$${value.abs().toStringAsFixed(2)}';
}

String _datePayload(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}

String formatDate(String raw) {
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  return '${parsed.month}/${parsed.day}/${parsed.year}';
}

Color colorFromHex(String hex) {
  final normalized = hex.replaceAll('#', '');
  if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(normalized)) {
    return AppTheme.teal;
  }
  return Color(int.parse('FF$normalized', radix: 16));
}

String _diceBearUrl(String seed) {
  return 'https://api.dicebear.com/9.x/avataaars/png?seed=${Uri.encodeComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
}

String? _absoluteApiUrl(String baseUrl, String rawUrl) {
  if (rawUrl.isEmpty) return null;
  final parsed = Uri.tryParse(rawUrl);
  if (parsed != null && parsed.hasScheme) return rawUrl;
  final base = Uri.parse(baseUrl);
  return base.resolve(rawUrl).toString();
}

List<String> _parseInviteEmails(String raw) {
  return raw
      .split(RegExp(r'[\n,]'))
      .map((item) => item.trim().toLowerCase())
      .where((item) => item.contains('@'))
      .toSet()
      .toList();
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
