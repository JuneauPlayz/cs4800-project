class UserSession {
  UserSession({required this.user, required this.token});

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      user: User.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
      token: _string(json['token']),
    );
  }

  final User user;
  final String token;
}

class User {
  User({
    required this.id,
    required this.name,
    required this.email,
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: _string(json['id']),
      name: _string(json['name']),
      email: _string(json['email']),
      initials: _string(json['initials']),
      avatarColor: _string(json['avatarColor']),
      avatarEmoji: _string(json['avatarEmoji']),
    );
  }

  final String id;
  final String name;
  final String email;
  final String initials;
  final String avatarColor;
  final String avatarEmoji;
}

class DashboardData {
  DashboardData({required this.balance, required this.pendingVotes});

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      balance: BalanceSummary.fromJson(
        json['balances'] as Map<String, dynamic>? ?? const {},
      ),
      pendingVotes: _int(json['pendingVotes']),
    );
  }

  final BalanceSummary balance;
  final int pendingVotes;
}

class BalanceSummary {
  BalanceSummary({
    required this.net,
    required this.totalOwedToYou,
    required this.totalYouOwe,
    required this.settleCount,
    required this.owedToYou,
    required this.youOwe,
    required this.people,
  });

  factory BalanceSummary.fromJson(Map<String, dynamic> json) {
    return BalanceSummary(
      net: _double(json['net']),
      totalOwedToYou: _double(json['totalOwedToYou']),
      totalYouOwe: _double(json['totalYouOwe']),
      settleCount: _int(json['settleCount']),
      owedToYou: _list(
        json['owedToYou'],
        (item) => CounterpartyBalance.fromJson(item),
      ),
      youOwe: _list(
        json['youOwe'],
        (item) => CounterpartyBalance.fromJson(item),
      ),
      people: _list(json['people'], (item) => PersonBalance.fromJson(item)),
    );
  }

  final double net;
  final double totalOwedToYou;
  final double totalYouOwe;
  final int settleCount;
  final List<CounterpartyBalance> owedToYou;
  final List<CounterpartyBalance> youOwe;
  final List<PersonBalance> people;
}

class CounterpartyBalance {
  CounterpartyBalance({
    required this.id,
    required this.name,
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
    required this.amount,
    required this.groups,
  });

  factory CounterpartyBalance.fromJson(Map<String, dynamic> json) {
    return CounterpartyBalance(
      id: _string(json['id']),
      name: _string(json['name']),
      initials: _string(json['initials']),
      avatarColor: _string(json['avatarColor']),
      avatarEmoji: _string(json['avatarEmoji']),
      amount: _double(json['amount']),
      groups: _list(json['groups'], (item) => GroupRef.fromJson(item)),
    );
  }

  final String id;
  final String name;
  final String initials;
  final String avatarColor;
  final String avatarEmoji;
  final double amount;
  final List<GroupRef> groups;
}

class PersonBalance {
  PersonBalance({
    required this.id,
    required this.name,
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
    required this.net,
    required this.paid,
    required this.owed,
  });

  factory PersonBalance.fromJson(Map<String, dynamic> json) {
    return PersonBalance(
      id: _string(json['id']),
      name: _string(json['name']),
      initials: _string(json['initials']),
      avatarColor: _string(json['avatarColor']),
      avatarEmoji: _string(json['avatarEmoji']),
      net: _double(json['net']),
      paid: _double(json['paid']),
      owed: _double(json['owed']),
    );
  }

  final String id;
  final String name;
  final String initials;
  final String avatarColor;
  final String avatarEmoji;
  final double net;
  final double paid;
  final double owed;
}

class GroupRef {
  GroupRef({required this.id, required this.name});

  factory GroupRef.fromJson(Map<String, dynamic> json) {
    return GroupRef(id: _string(json['id']), name: _string(json['name']));
  }

  final String id;
  final String name;
}

class Group {
  Group({
    required this.id,
    required this.name,
    required this.type,
    required this.emoji,
    required this.threshold,
    required this.description,
    required this.isOwner,
    required this.members,
    required this.pendingInvites,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: _string(json['id']),
      name: _string(json['name']),
      type: _string(json['type']),
      emoji: _string(json['emoji']),
      threshold: _double(json['threshold']),
      description: _string(json['description']),
      isOwner: _bool(json['isOwner']),
      members: _list(json['members'], (item) => GroupMember.fromJson(item)),
      pendingInvites: _list(
        json['pendingInvites'],
        (item) => PendingInvite.fromJson(item),
      ),
    );
  }

  final String id;
  final String name;
  final String type;
  final String emoji;
  final double threshold;
  final String description;
  final bool isOwner;
  final List<GroupMember> members;
  final List<PendingInvite> pendingInvites;
}

class GroupMember {
  GroupMember({
    required this.id,
    required this.name,
    required this.email,
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
    required this.role,
  });

  factory GroupMember.fromJson(Map<String, dynamic> json) {
    return GroupMember(
      id: _string(json['id']),
      name: _string(json['name']),
      email: _string(json['email']),
      initials: _string(json['initials']),
      avatarColor: _string(json['avatarColor']),
      avatarEmoji: _string(json['avatarEmoji']),
      role: _string(json['role']),
    );
  }

  final String id;
  final String name;
  final String email;
  final String initials;
  final String avatarColor;
  final String avatarEmoji;
  final String role;
}

class PendingInvite {
  PendingInvite({required this.id, required this.email, required this.status});

  factory PendingInvite.fromJson(Map<String, dynamic> json) {
    return PendingInvite(
      id: _string(json['id']),
      email: _string(json['email']),
      status: _string(json['status']),
    );
  }

  final String id;
  final String email;
  final String status;
}

class GroupInvite {
  GroupInvite({
    required this.id,
    required this.groupId,
    required this.groupName,
    required this.groupType,
    required this.invitedByName,
    required this.role,
    required this.createdAt,
  });

  factory GroupInvite.fromJson(Map<String, dynamic> json) {
    return GroupInvite(
      id: _string(json['id']),
      groupId: _string(json['groupId']),
      groupName: _string(json['groupName']),
      groupType: _string(json['groupType']),
      invitedByName: _string(json['invitedByName']),
      role: _string(json['role']),
      createdAt: _string(json['createdAt']),
    );
  }

  final String id;
  final String groupId;
  final String groupName;
  final String groupType;
  final String invitedByName;
  final String role;
  final String createdAt;
}

class Expense {
  Expense({
    required this.id,
    required this.groupId,
    required this.groupName,
    required this.description,
    required this.amount,
    required this.category,
    required this.paidByName,
    required this.expenseDate,
    required this.splitMethod,
    required this.userOwes,
    required this.userPaid,
    required this.settlementStatus,
    required this.userPaymentStatus,
    required this.splits,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: _string(json['id']),
      groupId: _string(json['groupId']),
      groupName: _string(json['groupName']),
      description: _string(json['description']),
      amount: _double(json['amount']),
      category: _string(json['category']),
      paidByName: _string(json['paidByName']),
      expenseDate: _string(json['expenseDate']),
      splitMethod: _string(json['splitMethod']),
      userOwes: _double(json['userOwes']),
      userPaid: _double(json['userPaid']),
      settlementStatus: _string(json['settlementStatus']),
      userPaymentStatus: _string(json['userPaymentStatus']),
      splits: _list(json['splits'], (item) => ExpenseSplit.fromJson(item)),
    );
  }

  final String id;
  final String groupId;
  final String groupName;
  final String description;
  final double amount;
  final String category;
  final String paidByName;
  final String expenseDate;
  final String splitMethod;
  final double userOwes;
  final double userPaid;
  final String settlementStatus;
  final String userPaymentStatus;
  final List<ExpenseSplit> splits;
}

class ExpenseSplit {
  ExpenseSplit({required this.userId, required this.amount});

  factory ExpenseSplit.fromJson(Map<String, dynamic> json) {
    return ExpenseSplit(
      userId: _string(json['userId']),
      amount: _double(json['amount']),
    );
  }

  final String userId;
  final double amount;
}

class Vote {
  Vote({
    required this.id,
    required this.groupName,
    required this.description,
    required this.amount,
    required this.category,
    required this.reason,
    required this.status,
    required this.requestedByName,
    required this.decisions,
  });

  factory Vote.fromJson(Map<String, dynamic> json) {
    return Vote(
      id: _string(json['id']),
      groupName: _string(json['groupName']),
      description: _string(json['description']),
      amount: _double(json['amount']),
      category: _string(json['category']),
      reason: _string(json['reason']),
      status: _string(json['status']),
      requestedByName: _string(json['requestedByName']),
      decisions: _list(
        json['decisions'],
        (item) => VoteDecision.fromJson(item),
      ),
    );
  }

  final String id;
  final String groupName;
  final String description;
  final double amount;
  final String category;
  final String reason;
  final String status;
  final String requestedByName;
  final List<VoteDecision> decisions;
}

class VoteDecision {
  VoteDecision({
    required this.userId,
    required this.name,
    required this.decision,
  });

  factory VoteDecision.fromJson(Map<String, dynamic> json) {
    return VoteDecision(
      userId: _string(json['userId']),
      name: _string(json['name']),
      decision: _string(json['decision']),
    );
  }

  final String userId;
  final String name;
  final String decision;
}

class AnalyticsData {
  AnalyticsData({
    required this.monthTotal,
    required this.avgExpense,
    required this.expenseCount,
    required this.byCategory,
    required this.byGroup,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    return AnalyticsData(
      monthTotal: _double(json['monthTotal']),
      avgExpense: _double(json['avgExpense']),
      expenseCount: _int(json['expenseCount']),
      byCategory: _list(
        json['byCategory'],
        (item) => CategorySpend.fromJson(item),
      ),
      byGroup: _list(json['byGroup'], (item) => GroupSpend.fromJson(item)),
    );
  }

  final double monthTotal;
  final double avgExpense;
  final int expenseCount;
  final List<CategorySpend> byCategory;
  final List<GroupSpend> byGroup;
}

class CategorySpend {
  CategorySpend({required this.category, required this.total});

  factory CategorySpend.fromJson(Map<String, dynamic> json) {
    return CategorySpend(
      category: _string(json['category']),
      total: _double(json['total']),
    );
  }

  final String category;
  final double total;
}

class GroupSpend {
  GroupSpend({required this.id, required this.name, required this.total});

  factory GroupSpend.fromJson(Map<String, dynamic> json) {
    return GroupSpend(
      id: _string(json['id']),
      name: _string(json['name']),
      total: _double(json['total']),
    );
  }

  final String id;
  final String name;
  final double total;
}

class ChallengeData {
  ChallengeData({required this.challenges, required this.rings});

  factory ChallengeData.fromJson(Map<String, dynamic> json) {
    return ChallengeData(
      challenges: _list(json['challenges'], (item) => Challenge.fromJson(item)),
      rings: _list(json['rings'], (item) => ChallengeRing.fromJson(item)),
    );
  }

  final List<Challenge> challenges;
  final List<ChallengeRing> rings;
}

class Challenge {
  Challenge({
    required this.id,
    required this.groupId,
    required this.groupName,
    required this.name,
    required this.description,
    required this.goal,
    required this.current,
    required this.unit,
    required this.color,
    required this.startDate,
    required this.endDate,
    required this.createdByName,
    required this.contributions,
  });

  factory Challenge.fromJson(Map<String, dynamic> json) {
    return Challenge(
      id: _string(json['id']),
      groupId: _string(json['groupId']),
      groupName: _string(json['groupName']),
      name: _string(json['name']),
      description: _string(json['description']),
      goal: _double(json['goal']),
      current: _double(json['current']),
      unit: _string(json['unit']),
      color: _string(json['color']),
      startDate: _string(json['startDate']),
      endDate: _string(json['endDate']),
      createdByName: _string(json['createdByName']),
      contributions: _list(
        json['contributions'],
        (item) => ChallengeContribution.fromJson(item),
      ),
    );
  }

  final String id;
  final String groupId;
  final String groupName;
  final String name;
  final String description;
  final double goal;
  final double current;
  final String unit;
  final String color;
  final String startDate;
  final String endDate;
  final String createdByName;
  final List<ChallengeContribution> contributions;
}

class ChallengeContribution {
  ChallengeContribution({
    required this.id,
    required this.userId,
    required this.amount,
    required this.createdAt,
    required this.name,
    required this.initials,
    required this.avatarColor,
    required this.avatarEmoji,
  });

  factory ChallengeContribution.fromJson(Map<String, dynamic> json) {
    return ChallengeContribution(
      id: _string(json['id']),
      userId: _string(json['userId']),
      amount: _double(json['amount']),
      createdAt: _string(json['createdAt']),
      name: _string(json['name']),
      initials: _string(json['initials']),
      avatarColor: _string(json['avatarColor']),
      avatarEmoji: _string(json['avatarEmoji']),
    );
  }

  final String id;
  final String userId;
  final double amount;
  final String createdAt;
  final String name;
  final String initials;
  final String avatarColor;
  final String avatarEmoji;
}

class ChallengeRing {
  ChallengeRing({
    required this.id,
    required this.label,
    required this.value,
    required this.max,
    required this.color,
  });

  factory ChallengeRing.fromJson(Map<String, dynamic> json) {
    return ChallengeRing(
      id: _string(json['id']),
      label: _string(json['label']),
      value: _double(json['value']),
      max: _double(json['max']),
      color: _string(json['color']),
    );
  }

  final String id;
  final String label;
  final double value;
  final double max;
  final String color;
}

class SettingsData {
  SettingsData({
    required this.userId,
    required this.emailVotes,
    required this.emailBalance,
    required this.pushSettlements,
    required this.aiProactive,
    required this.profileVisibility,
    required this.activityVisibility,
  });

  factory SettingsData.fromJson(Map<String, dynamic> json) {
    return SettingsData(
      userId: _string(json['userId']),
      emailVotes: _bool(json['emailVotes']),
      emailBalance: _bool(json['emailBalance']),
      pushSettlements: _bool(json['pushSettlements']),
      aiProactive: _bool(json['aiProactive']),
      profileVisibility: _string(json['profileVisibility']),
      activityVisibility: _string(json['activityVisibility']),
    );
  }

  SettingsData copyWith({
    bool? emailVotes,
    bool? emailBalance,
    bool? pushSettlements,
    bool? aiProactive,
    String? profileVisibility,
    String? activityVisibility,
  }) {
    return SettingsData(
      userId: userId,
      emailVotes: emailVotes ?? this.emailVotes,
      emailBalance: emailBalance ?? this.emailBalance,
      pushSettlements: pushSettlements ?? this.pushSettlements,
      aiProactive: aiProactive ?? this.aiProactive,
      profileVisibility: profileVisibility ?? this.profileVisibility,
      activityVisibility: activityVisibility ?? this.activityVisibility,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emailVotes': emailVotes,
      'emailBalance': emailBalance,
      'pushSettlements': pushSettlements,
      'aiProactive': aiProactive,
      'profileVisibility': profileVisibility,
      'activityVisibility': activityVisibility,
    };
  }

  final String userId;
  final bool emailVotes;
  final bool emailBalance;
  final bool pushSettlements;
  final bool aiProactive;
  final String profileVisibility;
  final String activityVisibility;
}

class ChatMessage {
  ChatMessage({required this.role, required this.text});

  final String role;
  final String text;
}

String _string(dynamic value) => value?.toString() ?? '';

double _double(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(_string(value)) ?? 0;
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(_string(value)) ?? 0;
}

bool _bool(dynamic value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  return _string(value).toLowerCase() == 'true';
}

List<T> _list<T>(dynamic value, T Function(Map<String, dynamic> json) parser) {
  final raw = value is List ? value : const [];
  return raw
      .whereType<Map>()
      .map((item) => parser(Map<String, dynamic>.from(item)))
      .toList();
}
