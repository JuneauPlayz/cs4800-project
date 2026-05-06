import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/src/app.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() {
  testWidgets('shows the SplitStack mobile login screen', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});

    await tester.pumpWidget(const SplitStackApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign in to SplitStack'), findsOneWidget);
    expect(find.text('SplitStack'), findsWidgets);
  });
}
