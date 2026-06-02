import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api_service.dart';

// User model
class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id'],
    name: json['name'],
    email: json['email'],
    role: json['role'],
  );
}

// Auth State
class AuthState {
  final UserModel? user;
  final bool loading;
  final String? error;

  const AuthState({this.user, this.loading = false, this.error});

  bool get isAuthenticated => user != null;

  AuthState copyWith({UserModel? user, bool? loading, String? error}) =>
      AuthState(
        user: user ?? this.user,
        loading: loading ?? this.loading,
        error: error,
      );
}

// Auth Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api = ApiService();

  AuthNotifier() : super(const AuthState(loading: true)) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final hasToken = await _api.hasToken();
      if (!hasToken) {
        state = const AuthState();
        return;
      }
      final res = await _api.getMe();
      final user = UserModel.fromJson(res.data['user']);
      state = AuthState(user: user);
    } catch (_) {
      await _api.clearToken();
      state = const AuthState();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final res = await _api.login(email, password);
      final token = res.data['token'] as String;
      await _api.saveToken(token);
      final user = UserModel.fromJson(res.data['user']);
      state = AuthState(user: user);
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Login failed';
      state = AuthState(error: msg);
      return false;
    } catch (_) {
      state = const AuthState(error: 'Unexpected error');
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {}
    await _api.clearToken();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
