import 'package:flutter_test/flutter_test.dart';

import 'package:splitstack_mobile/main.dart';

void main() {
  testWidgets('shows the SplitStack mobile login screen', (tester) async {
    await tester.pumpWidget(const SplitStackMobileApp());

    expect(find.text('SplitStack AI'), findsOneWidget);
    expect(find.text('Ask about your real shared spending.'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
