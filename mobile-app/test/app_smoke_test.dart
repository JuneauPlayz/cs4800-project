import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/src/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows auth screen when no session exists', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const SplitStackApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in to SplitStack'), findsOneWidget);
    expect(find.text('SplitStack'), findsWidgets);
  });
}
