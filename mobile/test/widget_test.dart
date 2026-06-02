// Basic smoke test for InternalApp
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:internal_boss_app/main.dart';

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: InternalBossApp()),
    );
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
