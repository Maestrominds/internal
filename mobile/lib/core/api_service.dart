import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: kBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add auth token to every request
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: kTokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (DioException error, handler) {
          handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;

  // Store JWT token
  Future<void> saveToken(String token) async {
    await _storage.write(key: kTokenKey, value: token);
  }

  // Clear JWT token on logout
  Future<void> clearToken() async {
    await _storage.delete(key: kTokenKey);
  }

  // Check if token exists
  Future<bool> hasToken() async {
    final token = await _storage.read(key: kTokenKey);
    return token != null && token.isNotEmpty;
  }

  // Auth
  Future<Response> login(String email, String password) {
    return _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
  }

  Future<Response> getMe() {
    return _dio.get('/auth/me');
  }

  Future<Response> logout() {
    return _dio.post('/auth/logout');
  }

  // Reports
  Future<Response> getReports({String? search}) {
    return _dio.get('/reports', queryParameters: {
      if (search != null && search.isNotEmpty) 'search': search,
    });
  }

  Future<Response> getReportById(String id) {
    return _dio.get('/reports/$id');
  }
}
