import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api_service.dart';

// Client group model
class ClientItem {
  final String clientName;
  final String? clientPhone;

  const ClientItem({
    required this.clientName,
    this.clientPhone,
  });

  factory ClientItem.fromJson(Map<String, dynamic> json) => ClientItem(
    clientName: json['client_name'] ?? '',
    clientPhone: json['client_phone'],
  );
}

// Editor item model
class EditorItem {
  final String id;
  final String name;
  final String role;

  const EditorItem({
    required this.id,
    required this.name,
    required this.role,
  });

  factory EditorItem.fromJson(Map<String, dynamic> json) => EditorItem(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    role: json['role'] ?? '',
  );
}

// Report list item model
class ReportItem {
  final String id;
  final String clientName;
  final String? clientPhone;
  final double amount;
  final String reportDate;
  final String managerName;

  const ReportItem({
    required this.id,
    required this.clientName,
    this.clientPhone,
    required this.amount,
    required this.reportDate,
    required this.managerName,
  });

  factory ReportItem.fromJson(Map<String, dynamic> json) => ReportItem(
    id: json['id'],
    clientName: json['client_name'],
    clientPhone: json['client_phone'],
    amount: double.tryParse(json['amount'].toString()) ?? 0,
    reportDate: json['report_date'] ?? '',
    managerName: json['manager_name'] ?? '',
  );
}

// Report detail model
class ReportDetail {
  final String id;
  final String clientName;
  final String? clientPhone;
  final double amount;
  final String reportDate;
  final String managerName;
  final String managerId;
  final String managerEmail;
  final String? note;
  final String? shortDesc;
  final String createdAt;
  final List<ReportImage> images;
  final List<EditorItem> editors;

  const ReportDetail({
    required this.id,
    required this.clientName,
    this.clientPhone,
    required this.amount,
    required this.reportDate,
    required this.managerName,
    required this.managerId,
    required this.managerEmail,
    this.note,
    this.shortDesc,
    required this.createdAt,
    required this.images,
    required this.editors,
  });

  factory ReportDetail.fromJson(Map<String, dynamic> json) => ReportDetail(
    id: json['id'],
    clientName: json['client_name'],
    clientPhone: json['client_phone'],
    amount: double.tryParse(json['amount'].toString()) ?? 0,
    reportDate: json['report_date'] ?? '',
    managerName: json['manager_name'] ?? '',
    managerId: json['manager_id'] ?? '',
    managerEmail: json['manager_email'] ?? '',
    note: json['note'],
    shortDesc: json['short_desc'],
    createdAt: json['created_at'] ?? '',
    images: (json['images'] as List<dynamic>? ?? [])
        .map((e) => ReportImage.fromJson(e))
        .toList(),
    editors: (json['editors'] as List<dynamic>? ?? [])
        .map((e) => EditorItem.fromJson(e))
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

// Clients List Provider
class ClientsNotifier extends StateNotifier<AsyncValue<List<ClientItem>>> {
  final ApiService _api = ApiService();

  ClientsNotifier() : super(const AsyncValue.loading()) {
    fetchClients();
  }

  Future<void> fetchClients() async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.getClients();
      final list = (res.data['clients'] as List<dynamic>)
          .map((e) => ClientItem.fromJson(e))
          .toList();
      state = AsyncValue.data(list);
    } on DioException catch (e) {
      state = AsyncValue.error(
        e.response?.data?['message'] ?? 'Failed to load clients',
        StackTrace.current,
      );
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final clientsProvider =
    StateNotifierProvider<ClientsNotifier, AsyncValue<List<ClientItem>>>(
  (ref) => ClientsNotifier(),
);

// Client Reports Provider
class ClientReportsNotifier extends StateNotifier<AsyncValue<List<ReportItem>>> {
  final ApiService _api = ApiService();

  ClientReportsNotifier() : super(const AsyncValue.data([]));

  Future<void> fetchReportsForClient({String? name, String? phone}) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.getReports(clientName: name, clientPhone: phone);
      final list = (res.data['reports'] as List<dynamic>)
          .map((e) => ReportItem.fromJson(e))
          .toList();
      state = AsyncValue.data(list);
    } on DioException catch (e) {
      state = AsyncValue.error(
        e.response?.data?['message'] ?? 'Failed to load client reports',
        StackTrace.current,
      );
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final clientReportsProvider =
    StateNotifierProvider<ClientReportsNotifier, AsyncValue<List<ReportItem>>>(
  (ref) => ClientReportsNotifier(),
);

// Report Detail Provider
final reportDetailProvider = StateNotifierProvider.family<ReportDetailNotifier, AsyncValue<ReportDetail>, String>(
  (ref, id) => ReportDetailNotifier(id),
);

class ReportDetailNotifier extends StateNotifier<AsyncValue<ReportDetail>> {
  final String _id;
  final ApiService _api = ApiService();

  ReportDetailNotifier(this._id) : super(const AsyncValue.loading()) {
    fetchDetail();
  }

  Future<void> fetchDetail() async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.getReportById(_id);
      state = AsyncValue.data(ReportDetail.fromJson(res.data['report']));
    } on DioException catch (e) {
      state = AsyncValue.error(
        e.response?.data?['message'] ?? 'Failed to load report detail',
        StackTrace.current,
      );
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}
