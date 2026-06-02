import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api_service.dart';

// Report list item model
class ReportItem {
  final String id;
  final String clientName;
  final double amount;
  final String reportDate;
  final String managerName;

  const ReportItem({
    required this.id,
    required this.clientName,
    required this.amount,
    required this.reportDate,
    required this.managerName,
  });

  factory ReportItem.fromJson(Map<String, dynamic> json) => ReportItem(
    id: json['id'],
    clientName: json['client_name'],
    amount: double.tryParse(json['amount'].toString()) ?? 0,
    reportDate: json['report_date'] ?? '',
    managerName: json['manager_name'] ?? '',
  );
}

// Report detail model
class ReportDetail {
  final String id;
  final String clientName;
  final double amount;
  final String reportDate;
  final String managerName;
  final String managerEmail;
  final String? note;
  final String? shortDesc;
  final String createdAt;
  final List<ReportImage> images;

  const ReportDetail({
    required this.id,
    required this.clientName,
    required this.amount,
    required this.reportDate,
    required this.managerName,
    required this.managerEmail,
    this.note,
    this.shortDesc,
    required this.createdAt,
    required this.images,
  });

  factory ReportDetail.fromJson(Map<String, dynamic> json) => ReportDetail(
    id: json['id'],
    clientName: json['client_name'],
    amount: double.tryParse(json['amount'].toString()) ?? 0,
    reportDate: json['report_date'] ?? '',
    managerName: json['manager_name'] ?? '',
    managerEmail: json['manager_email'] ?? '',
    note: json['note'],
    shortDesc: json['short_desc'],
    createdAt: json['created_at'] ?? '',
    images: (json['images'] as List<dynamic>? ?? [])
        .map((e) => ReportImage.fromJson(e))
        .toList(),
  );
}

class ReportImage {
  final String id;
  final String cloudinaryUrl;
  final String? caption;

  const ReportImage({required this.id, required this.cloudinaryUrl, this.caption});

  factory ReportImage.fromJson(Map<String, dynamic> json) => ReportImage(
    id: json['id'] ?? '',
    cloudinaryUrl: json['cloudinary_url'] ?? '',
    caption: json['caption'],
  );
}

// Reports List Provider
class ReportsNotifier extends StateNotifier<AsyncValue<List<ReportItem>>> {
  final ApiService _api = ApiService();

  ReportsNotifier() : super(const AsyncValue.loading()) {
    fetchReports();
  }

  Future<void> fetchReports({String? search}) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.getReports(search: search);
      final list = (res.data['reports'] as List<dynamic>)
          .map((e) => ReportItem.fromJson(e))
          .toList();
      state = AsyncValue.data(list);
    } on DioException catch (e) {
      state = AsyncValue.error(
        e.response?.data?['message'] ?? 'Failed to load reports',
        StackTrace.current,
      );
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final reportsProvider =
    StateNotifierProvider<ReportsNotifier, AsyncValue<List<ReportItem>>>(
  (ref) => ReportsNotifier(),
);

// Report Detail Provider
final reportDetailProvider = FutureProvider.family<ReportDetail, String>(
  (ref, id) async {
    final api = ApiService();
    final res = await api.getReportById(id);
    return ReportDetail.fromJson(res.data['report']);
  },
);
