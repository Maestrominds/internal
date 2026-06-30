import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'features/splash/splash_screen.dart';

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
      home: const SplashScreen(),
    );
  }
}
