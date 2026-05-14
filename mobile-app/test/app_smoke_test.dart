import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/src/app.dart';
import 'package:mobile_app/src/core/app_theme.dart';
import 'package:mobile_app/src/data/api_client.dart';
import 'package:mobile_app/src/data/models.dart';
import 'package:mobile_app/src/data/session_store.dart';
import 'package:mobile_app/src/state/app_controller.dart';
import 'package:mobile_app/src/ui/home_shell.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class _PaymentTestController extends AppController {
  _PaymentTestController()
    : super(apiClient: ApiClient(), sessionStore: SessionStore());

  String? recordedMethod;
  String? recordedNote;

  @override
  Future<void> recordExpensePayment({
    required String expenseId,
    required String method,
    String note = '',
  }) async {
    recordedMethod = method;
    recordedNote = note;
  }
}

void main() {
  String ymd(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  test('extracts the total amount from receipt OCR text', () {
    const receiptText = '''
CASH RECEIPT
Lorem 6.50
Ipsum 7.50
Dolor Sit 48.00
Sub Total 76.80
Sales Tax 8.00
Total 84.80
Balance 84.80
THANK YOU
''';

    expect(debugReceiptAmountFromText(receiptText), 84.80);
  });

  test('extracts a small receipt total with cents', () {
    const receiptText = '''
RECEIPT
ITEM 12.00
TAX 1.05
TOTAL 13.05
''';

    expect(debugReceiptAmountFromText(receiptText), 13.05);
  });

  test('extracts total amount when OCR misreads the total label', () {
    const receiptText = '''
CASH RECEIPT
Sub-Total 76.80
Sales Tax 8.00
Tota1 84.80
Balance 84.80
''';

    expect(debugReceiptAmountFromText(receiptText), 84.80);
  });

  test('extracts receipt total when OCR splits cents with a space', () {
    const receiptText = '''
RECEIPT
TOTAL AMOUNT
\$ 117 00
CASH
\$ 200 00
CHANGE
\$ 83 00
''';

    expect(debugReceiptAmountFromText(receiptText), 117.00);
  });

  test('does not autofill ambiguous integer totals', () {
    const receiptText = '''
RECEIPT
TOTAL AMOUNT
\$ 1700
CASH
\$ 2000
''';

    expect(debugReceiptAmountFromText(receiptText), isNull);
  });

  test('extracts comma-decimal total with currency code', () {
    const receiptText = '''
Berghotel
1xSchweinschnitzel a 25.00 CHF 25.00
1xChasplatzli 18.50 CHF 18.50
Total : CHF 54,50
Inkl. 7.6% MwSt 54.50 CHF: 3,85
''';

    expect(debugReceiptAmountFromText(receiptText), 54.50);
  });

  test('does not choose an item price when total label is unreadable', () {
    const receiptText = '''
Berghotel
1xSchweinschnitzel a 25.00 CHF 25.00
1xChasplatzli 18.50 CHF 18.50
CHF 54,50
Inkl. 7.6% MwSt 54.50 CHF: 3,85
''';

    expect(debugReceiptAmountFromText(receiptText), isNull);
  });

  test('extracts total when OCR splits total label and currency amount', () {
    const receiptText = '''
Berghotel
Zikakite Macchiato a 4.50 CHF 9.00
1xGipfeli 2.00 CHF 2.00
Tota l : CHF
54,50
Inkl. 7.6% MwSt 54.50 CHF: 3,85
''';

    expect(debugReceiptAmountFromText(receiptText), 54.50);
  });

  test('extracts regular shopping receipt total from total amount row', () {
    const receiptText = '''
RECEIPT
1x Lorem ipsum \$ 35.00
2x Lorem ipsum \$ 15.00
TOTAL AMOUNT \$ 117.00
CASH \$ 200.00
CHANGE \$ 83.00
''';

    expect(debugReceiptAmountFromText(receiptText), 117.00);
  });

  test('skips total savings and keeps the receipt total', () {
    const receiptText = '''
STORE RECEIPT
SUBTOTAL 76.80
TAX 8.00
TOTAL \$84.80
TOTAL SAVINGS \$5.20
''';

    expect(debugReceiptAmountFromText(receiptText), 84.80);
  });

  test('extracts total paid rows as the receipt amount', () {
    const receiptText = '''
RESTAURANT
Food 38.50
Tax 3.18
VISA \$41.68
TOTAL PAID \$41.68
''';

    expect(debugReceiptAmountFromText(receiptText), 41.68);
  });

  test('does not confuse stored-value balances with receipt total', () {
    const receiptText = '''
COFFEE SHOP
Latte 5.50
TOTAL \$5.50
GIFT CARD BALANCE \$24.50
''';

    expect(debugReceiptAmountFromText(receiptText), 5.50);
  });

  test('recovers unlabeled total from subtotal and tax math', () {
    const receiptText = '''
STORE RECEIPT
SUBTOTAL \$76.80
SALES TAX \$8.00
\$84.80
CASH \$100.00
CHANGE \$15.20
''';

    expect(debugReceiptAmountFromText(receiptText), 84.80);
  });

  test('extracts numeric receipt date', () {
    const receiptText = '''
STORE RECEIPT
DATE 05/04/2026 18:42
TOTAL \$41.68
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  test('extracts older receipt dates that remain editable in the picker', () {
    const receiptText = '''
STORE RECEIPT
DATE 12/31/2019 18:42
TOTAL \$41.68
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2019-12-31');
  });

  test('extracts date when OCR puts amount and date on one line', () {
    const receiptText = '''
STORE RECEIPT
DATE 05/04/2026 TOTAL \$41.68
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  test('extracts date when OCR drops date separators', () {
    const receiptText = '''
STORE RECEIPT
DATE 05 04 2026 18:42
TOTAL \$41.68
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  test('extracts receipt date when OCR confuses zeroes and ones', () {
    const receiptText = '''
STORE RECEIPT
DATE O5/O4/2O26
TOTAL \$41.68
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  test('extracts word-form receipt date', () {
    const receiptText = '''
LOCAL MARKET
Purchased May 4, 2026
TOTAL \$84.80
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  test('ignores return-by dates when choosing receipt date', () {
    const receiptText = '''
LOCAL MARKET
RETURN BY 06/04/2026
TRANSACTION DATE 05/04/2026
TOTAL \$84.80
''';

    expect(ymd(debugReceiptDateFromText(receiptText)!), '2026-05-04');
  });

  testWidgets('shows auth screen when no session exists', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});

    await tester.pumpWidget(const SplitStackApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in to SplitStack'), findsOneWidget);
    expect(find.text('SplitStack'), findsWidgets);
  });

  testWidgets('keeps the add expense date picker editable', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    final controller =
        AppController(apiClient: ApiClient(), sessionStore: SessionStore())
          ..user = User(
            id: 'u1',
            name: 'Jordan Lee',
            email: 'jordan@example.com',
            initials: 'JL',
            avatarColor: '#0D9488',
            avatarEmoji: '',
          )
          ..groups = [
            Group(
              id: 'g1',
              name: 'Wicker Park Apt',
              type: 'roommates',
              emoji: '',
              threshold: 500,
              description: '',
              isOwner: true,
              members: [
                GroupMember(
                  id: 'u1',
                  name: 'Jordan Lee',
                  email: 'jordan@example.com',
                  initials: 'JL',
                  avatarColor: '#0D9488',
                  avatarEmoji: '',
                  role: 'owner',
                ),
              ],
              pendingInvites: const [],
            ),
          ];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: HomeShell(controller: controller),
      ),
    );
    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Change expense date'), findsOneWidget);

    await tester.tap(find.byTooltip('Change expense date'));
    await tester.pumpAndSettle();

    expect(find.byType(DatePickerDialog), findsOneWidget);
  });

  testWidgets(
    'marks an expense paid from the payout sheet without exceptions',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({});
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final controller = _PaymentTestController()
        ..user = User(
          id: 'u1',
          name: 'Jordan Lee',
          email: 'jordan@example.com',
          initials: 'JL',
          avatarColor: '#0D9488',
          avatarEmoji: '',
        )
        ..dashboard = DashboardData(
          balance: BalanceSummary(
            net: -18.5,
            totalOwedToYou: 0,
            totalYouOwe: 18.5,
            settleCount: 1,
            owedToYou: const [],
            youOwe: [
              CounterpartyBalance(
                id: 'u2',
                name: 'Alex Chen',
                initials: 'AC',
                avatarColor: '#8B5CF6',
                avatarEmoji: '',
                amount: 18.5,
                groups: [GroupRef(id: 'g1', name: 'Roommates')],
              ),
            ],
            people: const [],
          ),
          pendingVotes: 0,
        )
        ..analytics = AnalyticsData(
          monthTotal: 37,
          avgExpense: 37,
          expenseCount: 1,
          byCategory: [CategorySpend(category: 'Dining', total: 37)],
          byGroup: [GroupSpend(id: 'g1', name: 'Roommates', total: 37)],
        )
        ..expenses = [
          Expense(
            id: 'e1',
            groupId: 'g1',
            groupName: 'Roommates',
            description: 'Pizza night',
            amount: 37,
            category: 'Dining',
            paidById: 'u2',
            paidByName: 'Alex Chen',
            expenseDate: '2026-05-06',
            splitMethod: 'equal',
            userOwes: 18.5,
            userPaid: 0,
            settlementStatus: 'open',
            userPaymentStatus: 'open',
            receiptUrl: '',
            splits: const [],
          ),
        ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: HomeShell(controller: controller),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('You owe'));
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.arrow_forward_ios_rounded));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Checkbox).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Pay selected (\$18.50)'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Venmo'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Zelle').last);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Pay'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(controller.recordedMethod, 'Zelle');
      expect(find.text('Expense marked paid.'), findsOneWidget);
    },
  );

  testWidgets('renders challenges tab with contribution controls', (
    tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({});
    final controller =
        AppController(apiClient: ApiClient(), sessionStore: SessionStore())
          ..user = User(
            id: 'u1',
            name: 'Jordan Lee',
            email: 'jordan@example.com',
            initials: 'JL',
            avatarColor: '#0D9488',
            avatarEmoji: '',
          )
          ..groups = [
            Group(
              id: 'g1',
              name: 'Wicker Park Apt',
              type: 'roommates',
              emoji: '',
              threshold: 500,
              description: '',
              isOwner: true,
              members: const [],
              pendingInvites: const [],
            ),
          ]
          ..challengeData = ChallengeData(
            rings: [
              ChallengeRing(
                id: 'c1',
                label: 'April Grocery Goal',
                value: 180,
                max: 400,
                color: '#0D9488',
              ),
            ],
            challenges: [
              Challenge(
                id: 'c1',
                groupId: 'g1',
                groupName: 'Wicker Park Apt',
                name: 'April Grocery Goal',
                description: 'Keep groceries under budget.',
                goal: 400,
                current: 180,
                unit: '\$',
                color: '#0D9488',
                startDate: '2026-04-01',
                endDate: '2026-04-30',
                createdByName: 'Jordan Lee',
                memberProgress: [
                  ChallengeMemberProgress(
                    userId: 'u1',
                    name: 'Jordan Lee',
                    initials: 'JL',
                    avatarColor: '#0D9488',
                    avatarEmoji: '',
                    spent: 180,
                    goal: 400,
                  ),
                ],
              ),
            ],
          );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: HomeShell(controller: controller),
      ),
    );
    await tester.tap(find.text('Goals'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('April Grocery Goal'), findsWidgets);
    expect(find.textContaining('Member spending'), findsOneWidget);
    expect(find.text('Jordan'), findsOneWidget);
  });
}
