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

void main() {
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

  testWidgets('shows auth screen when no session exists', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});

    await tester.pumpWidget(const SplitStackApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in to SplitStack'), findsOneWidget);
    expect(find.text('SplitStack'), findsWidgets);
  });

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
                contributions: const [],
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
    expect(find.text('Contribution amount'), findsOneWidget);
    expect(find.text('Add'), findsWidgets);
  });
}
