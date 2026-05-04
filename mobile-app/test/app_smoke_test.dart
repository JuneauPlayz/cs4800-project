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
