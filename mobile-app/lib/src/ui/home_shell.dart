import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';

import '../core/app_theme.dart';
import '../data/models.dart';
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
        return Scaffold(
          appBar: AppBar(
            title: Text(_titles[_currentIndex]),
            actions: [
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
            onDestinationSelected: (index) {
              setState(() => _currentIndex = index);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.groups_outlined),
                selectedIcon: Icon(Icons.groups_rounded),
                label: 'Groups',
              ),
              NavigationDestination(
                icon: Icon(Icons.add_circle_outline_rounded),
                selectedIcon: Icon(Icons.add_circle_rounded),
                label: 'Add',
              ),
              NavigationDestination(
                icon: Icon(Icons.how_to_vote_outlined),
                selectedIcon: Icon(Icons.how_to_vote_rounded),
                label: 'Votes',
              ),
              NavigationDestination(
                icon: Icon(Icons.emoji_events_outlined),
                selectedIcon: Icon(Icons.emoji_events_rounded),
                label: 'Goals',
              ),
              NavigationDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings_rounded),
                label: 'Settings',
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final dashboard = controller.dashboard;
    final analytics = controller.analytics;

    if (dashboard == null || analytics == null || controller.user == null) {
      return const _CenteredState(
        icon: Icons.hourglass_bottom_rounded,
        title: 'Loading your dashboard',
        subtitle: 'Pulling balances, expenses, and groups from the API.',
      );
    }

    return RefreshIndicator(
      onRefresh: () => controller.refreshAll(showLoader: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          _BalanceHero(
            user: controller.user!,
            dashboard: dashboard,
            analytics: analytics,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Owed to you',
                  value: money(dashboard.balance.totalOwedToYou),
                  tone: AppTheme.teal,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'You owe',
                  value: money(dashboard.balance.totalYouOwe),
                  tone: AppTheme.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Monthly spend',
                  value: money(analytics.monthTotal),
                  tone: AppTheme.slate,
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
          const SizedBox(height: 20),
          _SectionCard(
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
                            style: Theme.of(context).textTheme.titleMedium,
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
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Group spending',
            subtitle: 'Which groups are driving the most spend',
            child: Column(
              children: analytics.byGroup.map((group) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.teal.withValues(alpha: 0.12),
                    foregroundColor: AppTheme.teal,
                    child: Text(
                      group.name.isEmpty ? '?' : group.name[0].toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  title: Text(group.name),
                  trailing: Text(
                    money(group.total),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Recent expenses',
            subtitle: 'Latest activity across your groups',
            child: Column(
              children: controller.expenses.take(6).map((expense) {
                final canMarkPaid = expense.userPaymentStatus == 'open';
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFFF0FDFA),
                    foregroundColor: AppTheme.tealDark,
                    child: const Icon(Icons.receipt_long_rounded),
                  ),
                  title: Text(expense.description),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${expense.groupName} • ${expense.category} • ${formatDate(expense.expenseDate)}',
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Chip(
                            visualDensity: VisualDensity.compact,
                            label: Text(
                              expense.settlementStatus == 'paid'
                                  ? 'Finished'
                                  : 'Open',
                            ),
                          ),
                          if (expense.userPaymentStatus == 'paid')
                            const Chip(
                              visualDensity: VisualDensity.compact,
                              label: Text('You paid'),
                            ),
                          if (canMarkPaid)
                            TextButton.icon(
                              onPressed: controller.loading
                                  ? null
                                  : () => _showPaymentSheet(context, expense),
                              icon: const Icon(Icons.payments_rounded),
                              label: Text(
                                'Pay ${money(expense.userOwes - expense.userPaid)}',
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        money(expense.amount),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        formatDate(expense.expenseDate),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showPaymentSheet(BuildContext context, Expense expense) async {
    final noteController = TextEditingController();
    String method = _payoutMethods.first;
    final payment = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
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
                  Text(
                    '${expense.description} • ${money(expense.userOwes - expense.userPaid)}',
                  ),
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
                    controller: noteController,
                    decoration: const InputDecoration(
                      labelText: 'Note or confirmation optional',
                    ),
                  ),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop({
                      'method': method,
                      'note': noteController.text.trim(),
                    }),
                    icon: const Icon(Icons.payments_rounded),
                    label: const Text('Pay'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    noteController.dispose();
    if (payment == null || !context.mounted) return;
    try {
      await controller.recordExpensePayment(
        expenseId: expense.id,
        method: payment['method'] ?? _payoutMethods.first,
        note: payment['note'] ?? '',
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(controller.errorMessage ?? 'Unable to record payment.'),
        ),
      );
      return;
    }
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Expense marked paid.')));
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
  void didUpdateWidget(covariant _AddExpenseTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_groupId == null && widget.controller.groups.isNotEmpty) {
      _groupId = widget.controller.groups.first.id;
    }
    _syncSplitControllers();
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

  Group? get _selectedGroup {
    if (widget.controller.groups.isEmpty) return null;
    return widget.controller.groups.firstWhere(
      (group) => group.id == _groupId,
      orElse: () => widget.controller.groups.first,
    );
  }

  @override
  Widget build(BuildContext context) {
    final group = _selectedGroup;
    final groups = widget.controller.groups;
    if (_groupId == null && groups.isNotEmpty) {
      _groupId = groups.first.id;
      _syncSplitControllers();
    }

    if (groups.isEmpty) {
      return const _CenteredState(
        icon: Icons.add_circle_outline_rounded,
        title: 'No groups available',
        subtitle: 'Create or join a group before adding a mobile expense.',
      );
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
                    'Add shared expense',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'This first pass supports equal, percent, and custom member splits.',
                  ),
                  const SizedBox(height: 18),
                  DropdownButtonFormField<String>(
                    initialValue: _groupId,
                    decoration: const InputDecoration(labelText: 'Group'),
                    items: groups
                        .map(
                          (item) => DropdownMenuItem(
                            value: item.id,
                            child: Text('${item.emoji} ${item.name}'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _groupId = value;
                        _syncSplitControllers();
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
                      decoration: const InputDecoration(
                        labelText: 'Expense date',
                        suffixIcon: Icon(Icons.calendar_today_rounded),
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
                      DropdownMenuItem(value: 'custom', child: Text('Custom')),
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
                            suffixText: _splitMethod == 'percent' ? '%' : '\$',
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
    return _splitControllers.values.fold<double>(0, (sum, controller) {
      return sum + (double.tryParse(controller.text.trim()) ?? 0);
    });
  }

  void _syncSplitControllers() {
    final group = _selectedGroup;
    if (group == null) return;
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
      final triggeredVote = await widget.controller.createExpense({
        'groupId': group.id,
        'description': _descriptionController.text.trim(),
        'amount': amount,
        'category': _category,
        'expenseDate': _datePayload(_expenseDate),
        'splitMethod': _splitMethod,
        'reason': _reasonController.text.trim(),
        if (_receiptImageBytes != null) ...{
          'receiptImageBase64': base64Encode(_receiptImageBytes!),
          'receiptFileName': _receiptFileName ?? 'receipt.jpg',
          'receiptMimeType': _receiptMimeType ?? 'image/jpeg',
        },
        if (_splitMethod != 'equal') 'splits': splits,
      });
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

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickReceipt(ImageSource source) async {
    setState(() => _pickingReceipt = true);
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        imageQuality: 100,
        maxWidth: 2400,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() {
        _receiptImageBytes = bytes;
        _receiptFileName = picked.name;
        _receiptMimeType = picked.mimeType ?? 'image/jpeg';
        _receiptSourceLabel = source == ImageSource.camera
            ? 'Camera capture'
            : 'Uploaded image';
      });
      await _scanReceipt(picked.path);
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to attach receipt image.');
      }
    } finally {
      if (mounted) {
        setState(() => _pickingReceipt = false);
      }
    }
  }

  Future<void> _scanReceipt(String imagePath) async {
    if (imagePath.isEmpty) return;
    setState(() => _scanningReceipt = true);
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result = await recognizer.processImage(
        InputImage.fromFilePath(imagePath),
      );
      final details = _parseReceiptText(result.text);
      if (!mounted) return;
      setState(() {
        if (details.description != null) {
          _descriptionController.text = details.description!;
        }
        if (details.amount != null) {
          _amountController.text = details.amount!.toStringAsFixed(2);
        }
        if (details.date != null) {
          _expenseDate = details.date!;
        }
        _syncSplitControllers();
      });
      final found = [
        if (details.description != null) 'description',
        if (details.amount != null) 'amount',
        if (details.date != null) 'date',
      ];
      _showMessage(
        found.isEmpty
            ? 'Receipt attached. Review and enter any missing details.'
            : 'Receipt scan filled ${found.join(', ')}. Review before submitting.',
      );
    } catch (_) {
      if (mounted) {
        _showMessage('Receipt attached, but text scan was not readable.');
      }
    } finally {
      await recognizer.close();
      if (mounted) {
        setState(() => _scanningReceipt = false);
      }
    }
  }

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
    final picked = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null || !mounted) return;
    setState(() => _expenseDate = picked);
  }
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
              Text(scanning ? 'Scanning receipt text...' : 'Opening picker...'),
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
  const _ReceiptDetails({this.description, this.amount, this.date});

  final String? description;
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
    description: _receiptDescription(lines),
    amount: _receiptAmount(lines),
    date: _receiptDate(rawText),
  );
}

String? _receiptDescription(List<String> lines) {
  final ignored = RegExp(
    r'(receipt|invoice|order|cashier|terminal|subtotal|total|tax|visa|mastercard|amex|debit|credit|change|balance)',
    caseSensitive: false,
  );
  for (final line in lines.take(8)) {
    final cleaned = line.replaceAll(RegExp(r"[^A-Za-z0-9 &.'-]"), '').trim();
    if (cleaned.length >= 3 && !ignored.hasMatch(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

double? _receiptAmount(List<String> lines) {
  final moneyPattern = RegExp(
    r'(?<!\d)(?:\$)?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2}))(?!\d)',
  );
  final totalWords = RegExp(
    r'(grand\s+total|amount\s+due|balance\s+due|total)',
    caseSensitive: false,
  );
  final ignoreWords = RegExp(
    r'(subtotal|tax|tip|change|cash|card|visa|mastercard|amex)',
    caseSensitive: false,
  );

  for (var i = lines.length - 1; i >= 0; i--) {
    final line = lines[i];
    if (!totalWords.hasMatch(line) || ignoreWords.hasMatch(line)) continue;
    final matches = moneyPattern.allMatches(line).toList();
    if (matches.isNotEmpty) {
      return _moneyValue(matches.last.group(1));
    }
    if (i + 1 < lines.length) {
      final nextMatches = moneyPattern.allMatches(lines[i + 1]).toList();
      if (nextMatches.isNotEmpty) {
        return _moneyValue(nextMatches.last.group(1));
      }
    }
  }

  final allAmounts = <double>[];
  for (final line in lines) {
    if (ignoreWords.hasMatch(line)) continue;
    for (final match in moneyPattern.allMatches(line)) {
      final value = _moneyValue(match.group(1));
      if (value != null && value > 0) allAmounts.add(value);
    }
  }
  if (allAmounts.isEmpty) return null;
  allAmounts.sort();
  return allAmounts.last;
}

double? _moneyValue(String? raw) {
  if (raw == null) return null;
  return double.tryParse(raw.replaceAll(',', '').trim());
}

DateTime? _receiptDate(String rawText) {
  final numeric = RegExp(
    r'\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b',
  ).firstMatch(rawText);
  if (numeric != null) {
    final first = int.tryParse(numeric.group(1)!);
    final second = int.tryParse(numeric.group(2)!);
    var year = int.tryParse(numeric.group(3)!);
    if (first != null && second != null && year != null) {
      if (year < 100) year += 2000;
      final month = first > 12 ? second : first;
      final day = first > 12 ? first : second;
      final parsed = DateTime.tryParse(
        '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}',
      );
      if (parsed != null) return parsed;
    }
  }

  final wordDate = RegExp(
    r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b',
    caseSensitive: false,
  ).firstMatch(rawText);
  if (wordDate == null) return null;
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
  final month = months[wordDate.group(1)!.toLowerCase()];
  final day = int.tryParse(wordDate.group(2)!);
  var year = int.tryParse(wordDate.group(3)!);
  if (month == null || day == null || year == null) return null;
  if (year < 100) year += 2000;
  return DateTime.tryParse(
    '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}',
  );
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
              (challenge) =>
                  _ChallengeCard(challenge: challenge, controller: controller),
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

class _ChallengeCard extends StatelessWidget {
  const _ChallengeCard({required this.challenge, required this.controller});

  final Challenge challenge;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
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
              OutlinedButton.icon(
                onPressed: controller.loading
                    ? null
                    : () => _showContributionSheet(context),
                icon: const Icon(Icons.add_card_rounded),
                label: const Text('Add contribution'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showContributionSheet(BuildContext context) async {
    final amountController = TextEditingController();
    final amount = await showModalBottomSheet<double>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(sheetContext).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add contribution',
                style: Theme.of(sheetContext).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(labelText: 'Amount'),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: () {
                  final amount = double.tryParse(amountController.text.trim());
                  if (amount == null || amount <= 0) return;
                  Navigator.of(sheetContext).pop(amount);
                },
                icon: const Icon(Icons.check_rounded),
                label: const Text('Add'),
              ),
            ],
          ),
        );
      },
    );
    amountController.dispose();
    if (amount == null || !context.mounted) return;
    try {
      await controller.contributeToChallenge(
        challengeId: challenge.id,
        amount: amount,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Contribution added.')));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            controller.errorMessage ?? 'Unable to add contribution.',
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
                          itemCount: _assistantSuggestions.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final suggestion = _assistantSuggestions[index];
                            return ActionChip(
                              label: Text(suggestion),
                              onPressed: widget.controller.sendingChat
                                  ? null
                                  : () => _send(suggestion),
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

class _BalanceHero extends StatelessWidget {
  const _BalanceHero({
    required this.user,
    required this.dashboard,
    required this.analytics,
  });

  final User user;
  final DashboardData dashboard;
  final AnalyticsData analytics;

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
                child: _HeroMetric(
                  label: 'Average expense',
                  value: money(analytics.avgExpense),
                ),
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

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final String value;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
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
    );
  }
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
    final mine = controller.user == null
        ? null
        : vote.decisions
              .where((decision) => decision.userId == controller.user!.id)
              .cast<VoteDecision?>()
              .firstOrNull;

    final isPending = vote.status == 'pending';
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
                  if (mine != null)
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
                      (decision) => _StatusChip(
                        label: '${decision.name}: ${decision.decision}',
                        dark: isPending,
                      ),
                    )
                    .toList(),
              ),
              if (isPending) ...[
                const SizedBox(height: 18),
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
  const _NewGroupSheet({required this.controller});

  final AppController controller;

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
            const Text(
              'New group',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
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
              child: const Text('Create group'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      await widget.controller.createGroup(
        name: _nameController.text.trim(),
        type: _type,
        threshold: double.tryParse(_thresholdController.text.trim()) ?? 0,
        description: _descriptionController.text.trim(),
        inviteEmails: _parseInviteEmails(_invitesController.text),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Group created.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.controller.errorMessage ?? 'Unable to create group.',
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
        if (group.description.isNotEmpty) ...[
          const SizedBox(height: 18),
          Text(group.description),
        ],
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
  if (normalized.length != 6) return AppTheme.teal;
  return Color(int.parse('FF$normalized', radix: 16));
}

String _diceBearUrl(String seed) {
  return 'https://api.dicebear.com/9.x/avataaars/png?seed=${Uri.encodeComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
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
