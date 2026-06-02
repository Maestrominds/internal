import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary900 = Color(0xFF0A1628);
  static const Color primary800 = Color(0xFF0D1B2A);
  static const Color primary700 = Color(0xFF1A2F4A);
  static const Color primary600 = Color(0xFF1B3A6B);
  static const Color primary500 = Color(0xFF1E4D8C);
  static const Color accent500  = Color(0xFF2D7DD2);
  static const Color accent400  = Color(0xFF4D9FEF);
  static const Color accentGlow = Color(0xFF00B4D8);
  static const Color surface    = Color(0xFFFFFFFF);
  static const Color surface2   = Color(0xFFF0F4F8);
  static const Color surface3   = Color(0xFFE2E8F0);
  static const Color textPrimary   = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted     = Color(0xFF94A3B8);
  static const Color success = Color(0xFF10B981);
  static const Color danger  = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    colorScheme: ColorScheme.fromSeed(
      seedColor: accent500,
      primary: accent500,
      surface: surface2,
    ),
    scaffoldBackgroundColor: surface2,
    appBarTheme: const AppBarTheme(
      backgroundColor: primary800,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: surface3, width: 1),
      ),
      margin: const EdgeInsets.only(bottom: 10),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent500,
        foregroundColor: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: surface3),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: surface3, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: accent500, width: 1.5),
      ),
      labelStyle: const TextStyle(color: textSecondary, fontFamily: 'Inter'),
      hintStyle: const TextStyle(color: textMuted, fontFamily: 'Inter'),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    ),
  );
}
