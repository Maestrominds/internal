import 'package:dio/dio.dart';

class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, {this.code});

  @override
  String toString() => message;

  factory AppException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const AppException(
          'Connection timed out. Please check your internet connection and try again.',
          code: 'TIMEOUT',
        );
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode;
        final data = e.response?.data;
        String? serverMessage;
        
        if (data is Map<String, dynamic>) {
          serverMessage = data['message'] ?? data['error'];
        } else if (data is String) {
          serverMessage = data;
        }

        if (status == 400) {
          return AppException(
            serverMessage ?? 'Invalid request. Please check your input and try again.',
            code: 'BAD_REQUEST',
          );
        } else if (status == 401) {
          return AppException(
            serverMessage ?? 'Incorrect email or password. Please try again.',
            code: 'UNAUTHORIZED',
          );
        } else if (status == 403) {
          return AppException(
            serverMessage ?? 'Access denied. You do not have permission to perform this action.',
            code: 'FORBIDDEN',
          );
        } else if (status == 404) {
          return AppException(
            serverMessage ?? 'Requested information was not found.',
            code: 'NOT_FOUND',
          );
        } else if (status == 429) {
          return const AppException(
            'Too many attempts. Please wait a moment and try again.',
            code: 'TOO_MANY_REQUESTS',
          );
        } else if (status != null && status >= 500) {
          return const AppException(
            'The server is experiencing temporary difficulties. Please try again later.',
            code: 'SERVER_ERROR',
          );
        }
        
        return AppException(
          serverMessage ?? 'An error occurred during communication with the server.',
          code: 'BAD_RESPONSE',
        );
      case DioExceptionType.connectionError:
        return const AppException(
          'Cannot connect to the server. Please check your internet connection.',
          code: 'CONNECTION_ERROR',
        );
      case DioExceptionType.cancel:
        return const AppException(
          'Request was cancelled.',
          code: 'CANCELLED',
        );
      default:
        return const AppException(
          'A network error occurred. Please try again.',
          code: 'UNKNOWN_NETWORK',
        );
    }
  }

  factory AppException.fromError(dynamic e) {
    if (e is DioException) {
      return AppException.fromDioException(e);
    }
    if (e is AppException) {
      return e;
    }
    return AppException(e.toString());
  }
}
