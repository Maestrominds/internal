import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/reports/reports_list_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: InternalBossApp(),
    ),
  );
}

class InternalBossApp extends StatelessWidget {
  const InternalBossApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'InternalApp — Boss',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends ConsumerWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    if (authState.loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0A1628),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Color(0xFF2D7DD2)),
              SizedBox(height: 16),
              Text(
                'InternalApp',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (authState.isAuthenticated) {
      return const ReportsListScreen();
    }

    return const LoginScreen();
  }
}
