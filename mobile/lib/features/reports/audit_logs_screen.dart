import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';

// ── Model ──────────────────────────────────────────────────────────────────
class AuditLog {
  final String id;
  final String userName;
  final String userRole;
  final String action;
  final String? description;
  final String createdAt;

  const AuditLog({
    required this.id,
    required this.userName,
    required this.userRole,
    required this.action,
    this.description,
    required this.createdAt,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) => AuditLog(
        id: json['id'] ?? '',
        userName: json['user_name'] ?? 'Unknown',
        userRole: json['user_role'] ?? 'unknown',
        action: json['action'] ?? '',
        description: json['description'],
        createdAt: json['created_at'] ?? '',
      );
}

// ── Action styling ─────────────────────────────────────────────────────────
class _ActionStyle {
  final Color bg;
  final Color fg;
  final String label;
  final IconData icon;
  const _ActionStyle({required this.bg, required this.fg, required this.label, required this.icon});
}

const _actionStyles = <String, _ActionStyle>{
  'LOGIN': _ActionStyle(bg: Color(0xFFDBEAFE), fg: Color(0xFF1D4ED8), label: 'Login', icon: Icons.login_rounded),
  'CREATE_REPORT': _ActionStyle(bg: Color(0xFFDCFCE7), fg: Color(0xFF15803D), label: 'Create Report', icon: Icons.add_circle_outline),
  'EDIT_REPORT': _ActionStyle(bg: Color(0xFFFEF3C7), fg: Color(0xFFB45309), label: 'Edit Report', icon: Icons.edit_outlined),
  'ADD_MANAGER': _ActionStyle(bg: Color(0xFFE0E7FF), fg: Color(0xFF4338CA), label: 'Add Manager', icon: Icons.person_add_outlined),
  'DEACTIVATE_MANAGER': _ActionStyle(bg: Color(0xFFFEE2E2), fg: Color(0xFFDC2626), label: 'Deactivate Manager', icon: Icons.person_off_outlined),
  'RESET_PASSWORD': _ActionStyle(bg: Color(0xFFFCE7F3), fg: Color(0xFF9D174D), label: 'Reset Password', icon: Icons.lock_reset_outlined),
};

const _actionFilters = [
  'All',
  'LOGIN',
  'CREATE_REPORT',
  'EDIT_REPORT',
  'ADD_MANAGER',
  'DEACTIVATE_MANAGER',
  'RESET_PASSWORD',
];

// ── Provider ───────────────────────────────────────────────────────────────
class AuditState {
  final List<AuditLog> logs;
  final bool loading;
  final int total;
  final int page;
  final String? error;

  const AuditState({
    this.logs = const [],
    this.loading = true,
    this.total = 0,
    this.page = 1,
    this.error,
  });

  AuditState copyWith({
    List<AuditLog>? logs,
    bool? loading,
    int? total,
    int? page,
    String? error,
  }) =>
      AuditState(
        logs: logs ?? this.logs,
        loading: loading ?? this.loading,
        total: total ?? this.total,
        page: page ?? this.page,
        error: error,
      );
}

class AuditNotifier extends StateNotifier<AuditState> {
  final ApiService _api = ApiService();

  AuditNotifier() : super(const AuditState()) {
    fetch();
  }

  Future<void> fetch({int page = 1, String? action}) async {
    state = state.copyWith(loading: true, page: page, error: null);
    try {
      final res = await _api.getAuditLogs(
        page: page,
        limit: 20,
        action: (action == null || action == 'All') ? null : action,
      );
      final data = res.data as Map<String, dynamic>;
      final logs = (data['logs'] as List<dynamic>)
          .map((e) => AuditLog.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(logs: logs, total: data['total'] as int, loading: false);
    } catch (e) {
      state = state.copyWith(loading: false, error: 'Failed to load audit logs');
    }
  }
}

final auditProvider = StateNotifierProvider.autoDispose<AuditNotifier, AuditState>(
  (ref) => AuditNotifier(),
);

// ── Screen ──────────────────────────────────────────────────────────────────
class AuditLogsScreen extends ConsumerStatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  ConsumerState<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends ConsumerState<AuditLogsScreen> {
  String _selectedFilter = 'All';
  static const _limit = 20;

  String _formatDateTime(String dateStr) {
    try {
      final d = DateTime.parse(dateStr).toLocal();
      return DateFormat('d MMM yyyy, h:mm a').format(d);
    } catch (_) {
      return dateStr;
    }
  }

  Widget _buildActionChip(String action) {
    final style = _actionStyles[action] ??
        const _ActionStyle(
          bg: Color(0xFFF1F5F9),
          fg: Color(0xFF475569),
          label: 'Unknown',
          icon: Icons.info_outline,
        );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: style.bg,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 12, color: style.fg),
          const SizedBox(width: 4),
          Text(
            style.label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: style.fg),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleChip(String role) {
    final isBoss = role == 'boss';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isBoss ? const Color(0xFFFEF3C7) : const Color(0xFFE0E7FF),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        role,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: isBoss ? const Color(0xFF92400E) : const Color(0xFF3730A3),
        ),
      ),
    );
  }

  void _showDeleteDialog(AuditLog log) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Audit Log'),
        content: const Text('Are you sure you want to delete this log?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiService().deleteAuditLog(log.id);
                if (mounted) {
                  ref.read(auditProvider.notifier).fetch(page: ref.read(auditProvider).page, action: _selectedFilter);
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete log')),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(auditProvider);
    final notifier = ref.read(auditProvider.notifier);
    final totalPages = (state.total / _limit).ceil();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primary800,
        title: const Text('Audit Logs', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () => notifier.fetch(page: state.page, action: _selectedFilter),
          ),
        ],
      ),
      body: Column(
        children: [
          // Info banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [AppTheme.primary700, AppTheme.primary600]),
            ),
            child: Text(
              'Showing ${state.logs.length} of ${state.total} entries',
              style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),

          // Filter chips
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _actionFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final f = _actionFilters[i];
                final isActive = _selectedFilter == f;
                final style = f == 'All' ? null : _actionStyles[f];
                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedFilter = f);
                    notifier.fetch(page: 1, action: f);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isActive
                          ? (style?.bg ?? AppTheme.accent500)
                          : AppTheme.surface3,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(
                        color: isActive
                            ? (style?.fg ?? Colors.white)
                            : AppTheme.surface3,
                        width: 1.5,
                      ),
                    ),
                    child: Text(
                      f == 'All' ? 'All Actions' : (style?.label ?? f),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isActive
                            ? (f == 'All' ? Colors.white : style!.fg)
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Log list
          Expanded(
            child: state.loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.accent500))
                : state.error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                            const SizedBox(height: 12),
                            Text(state.error!, style: const TextStyle(color: AppTheme.textSecondary)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => notifier.fetch(action: _selectedFilter),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : state.logs.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.article_outlined, size: 56, color: AppTheme.textMuted),
                                SizedBox(height: 12),
                                Text('No audit logs found', style: TextStyle(color: AppTheme.textMuted)),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            color: AppTheme.accent500,
                            onRefresh: () => notifier.fetch(page: state.page, action: _selectedFilter),
                            child: ListView.separated(
                              padding: const EdgeInsets.all(12),
                              itemCount: state.logs.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final log = state.logs[index];
                                return InkWell(
                                  onLongPress: () => _showDeleteDialog(log),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Card(
                                    margin: EdgeInsets.zero,
                                    child: Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: _buildActionChip(log.action),
                                              ),
                                              const SizedBox(width: 8),
                                              _buildRoleChip(log.userRole),
                                            ],
                                          ),
                                          const SizedBox(height: 10),
                                          Row(
                                            children: [
                                              const Icon(Icons.person_outline, size: 15, color: AppTheme.textSecondary),
                                              const SizedBox(width: 4),
                                              Text(
                                                log.userName,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 14,
                                                  color: AppTheme.textPrimary,
                                                ),
                                              ),
                                            ],
                                          ),
                                          if (log.description != null && log.description!.isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Icon(Icons.info_outline, size: 14, color: AppTheme.textMuted),
                                                const SizedBox(width: 4),
                                                Expanded(
                                                  child: Text(
                                                    log.description!,
                                                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              const Icon(Icons.access_time, size: 13, color: AppTheme.textMuted),
                                              const SizedBox(width: 4),
                                              Text(
                                                _formatDateTime(log.createdAt),
                                                style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),

          // Pagination
          if (totalPages > 1)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                border: Border(top: BorderSide(color: AppTheme.surface3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ElevatedButton(
                    onPressed: state.page > 1
                        ? () => notifier.fetch(page: state.page - 1, action: _selectedFilter)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent500,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    child: const Text('Previous'),
                  ),
                  Text(
                    'Page ${state.page} of $totalPages',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                  ),
                  ElevatedButton(
                    onPressed: state.page < totalPages
                        ? () => notifier.fetch(page: state.page + 1, action: _selectedFilter)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent500,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    child: const Text('Next'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
