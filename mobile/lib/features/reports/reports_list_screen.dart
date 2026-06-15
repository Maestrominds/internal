import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'reports_provider.dart';
import 'report_detail_screen.dart';
import 'add_report_screen.dart';
import '../../core/api_service.dart';

String formatINR(double amount) {
  final formatter = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );
  return formatter.format(amount);
}

String formatDate(String dateStr) {
  if (dateStr.isEmpty) return '—';
  try {
    final date = DateTime.parse(dateStr);
    return DateFormat('d MMM yyyy').format(date);
  } catch (_) {
    return dateStr;
  }
}

Widget _shimmerCard() => Shimmer.fromColors(
  baseColor: AppTheme.surface3,
  highlightColor: AppTheme.surface,
  child: Container(
    height: 76,
    decoration: BoxDecoration(
      color: AppTheme.surface,
      borderRadius: BorderRadius.circular(12),
    ),
  ),
);

class ReportsListScreen extends ConsumerStatefulWidget {
  const ReportsListScreen({super.key});

  @override
  ConsumerState<ReportsListScreen> createState() => _ReportsListScreenState();
}

class _ReportsListScreenState extends ConsumerState<ReportsListScreen> {
  final _searchCtrl = TextEditingController();
  bool _searching = false;
  String _searchQuery = '';
  ClientItem? _selectedClient;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    setState(() {
      _searchQuery = value.trim();
    });
  }

  Future<void> _handleRowClick(BuildContext context, ReportItem r) async {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Choose Action'),
        content: const Text('What would you like to do for this transaction?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _viewDetails(r.id);
            },
            child: const Text('View Details'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _editReport(r.id);
            },
            child: const Text('Edit Transaction'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _viewDetails(String reportId) async {
    final refreshNeeded = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => ReportDetailScreen(reportId: reportId),
      ),
    );
    if (refreshNeeded == true && _selectedClient != null) {
      ref.read(clientReportsProvider.notifier).fetchReportsForClient(
            name: _selectedClient!.clientName,
            phone: _selectedClient!.clientPhone,
          );
    }
  }

  Future<void> _editReport(String reportId) async {
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppTheme.accent500)),
    );

    try {
      final res = await ApiService().getReportById(reportId);
      final detail = ReportDetail.fromJson(res.data['report']);
      navigator.pop(); // close loader

      final edited = await navigator.push<bool>(
        MaterialPageRoute(
          builder: (ctx) => AddReportScreen(editReport: detail),
        ),
      );
      if (edited == true && _selectedClient != null) {
        ref.read(clientReportsProvider.notifier).fetchReportsForClient(
              name: _selectedClient!.clientName,
              phone: _selectedClient!.clientPhone,
            );
      }
    } catch (e) {
      navigator.pop(); // close loader
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Failed to load report details: $e')),
      );
    }
  }

  Future<void> _handleViewImages(BuildContext context, String reportId) async {
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppTheme.accent500)),
    );

    try {
      final res = await ApiService().getReportById(reportId);
      final detail = ReportDetail.fromJson(res.data['report']);
      navigator.pop(); // close loader

      if (detail.images.isEmpty) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(content: Text('No images found for this transaction.')),
        );
        return;
      }

      navigator.push(
        MaterialPageRoute(
          builder: (ctx) => LightboxGallery(images: detail.images, initialIndex: 0),
        ),
      );
    } catch (e) {
      navigator.pop(); // close loader
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Failed to load images: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final clientsAsync = ref.watch(clientsProvider);
    final clientReportsAsync = ref.watch(clientReportsProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primary800,
        leading: _selectedClient != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () {
                  setState(() {
                    _selectedClient = null;
                    _searchQuery = '';
                    _searchCtrl.clear();
                  });
                },
              )
            : null,
        title: _searching
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: _selectedClient == null
                      ? 'Search client by name/phone...'
                      : 'Search reports...',
                  hintStyle: const TextStyle(color: Colors.white54),
                  border: InputBorder.none,
                  filled: false,
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged: _onSearch,
              )
            : Text(
                _selectedClient != null
                    ? _selectedClient!.clientName
                    : 'Clients',
                style: const TextStyle(color: Colors.white),
              ),
        actions: [
          IconButton(
            icon: Icon(_searching ? Icons.close : Icons.search, color: Colors.white),
            onPressed: () {
              setState(() {
                _searching = !_searching;
                _searchQuery = '';
                _searchCtrl.clear();
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              if (_selectedClient != null) {
                ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                      name: _selectedClient!.clientName,
                      phone: _selectedClient!.clientPhone,
                    );
              } else {
                ref.read(clientsProvider.notifier).fetchClients();
              }
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onSelected: (v) {
              if (v == 'logout') {
                ref.read(authProvider.notifier).logout();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: AppTheme.textSecondary),
                    SizedBox(width: 10),
                    Text('Sign Out'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final success = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => const AddReportScreen(),
            ),
          );
          if (success == true) {
            if (_selectedClient != null) {
              ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                    name: _selectedClient!.clientName,
                    phone: _selectedClient!.clientPhone,
                  );
            } else {
              ref.read(clientsProvider.notifier).fetchClients();
            }
          }
        },
        backgroundColor: AppTheme.accent500,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Report', style: TextStyle(color: Colors.white)),
      ),
      body: Column(
        children: [
          // Greeting Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primary700, AppTheme.primary600],
              ),
            ),
            child: Text(
              'Welcome, ${user?.name ?? 'Boss'}',
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          // Main View: Clients Grid/List OR selected Client Reports
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.accent500,
              onRefresh: () async {
                if (_selectedClient != null) {
                  await ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                        name: _selectedClient!.clientName,
                        phone: _selectedClient!.clientPhone,
                      );
                } else {
                  await ref.read(clientsProvider.notifier).fetchClients();
                }
              },
              child: _selectedClient == null
                  ? clientsAsync.when(
                      loading: () => ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: 6,
                        itemBuilder: (context, index) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _shimmerCard(),
                        ),
                      ),
                      error: (err, stack) => Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                            const SizedBox(height: 12),
                            Text(err.toString(), style: const TextStyle(color: AppTheme.textSecondary)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => ref.read(clientsProvider.notifier).fetchClients(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                      data: (clients) {
                        final filteredClients = clients.where((c) {
                          final matchName = c.clientName.toLowerCase().contains(_searchQuery.toLowerCase());
                          final matchPhone = c.clientPhone?.contains(_searchQuery) ?? false;
                          return matchName || matchPhone;
                        }).toList();

                        if (filteredClients.isEmpty) {
                          return Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.people_outline,
                                    size: 64, color: AppTheme.textMuted.withAlpha(100)),
                                const SizedBox(height: 16),
                                const Text('No clients found',
                                    style: TextStyle(color: AppTheme.textMuted)),
                              ],
                            ),
                          );
                        }

                        return ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredClients.length,
                          itemBuilder: (context, index) {
                            final client = filteredClients[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.surface2,
                                  child: const Icon(Icons.person, color: AppTheme.primary600),
                                ),
                                title: Text(
                                  client.clientName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                subtitle: client.clientPhone != null
                                    ? Text('📞 ${client.clientPhone}')
                                    : null,
                                trailing: const Icon(Icons.chevron_right, color: AppTheme.accent500),
                                onTap: () {
                                  setState(() {
                                    _selectedClient = client;
                                    _searchQuery = '';
                                    _searchCtrl.clear();
                                  });
                                  ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                                        name: client.clientName,
                                        phone: client.clientPhone,
                                      );
                                },
                              ),
                            );
                          },
                        );
                      },
                    )
                  : clientReportsAsync.when(
                      loading: () => ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: 6,
                        itemBuilder: (context, index) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _shimmerCard(),
                        ),
                      ),
                      error: (err, stack) => Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                            const SizedBox(height: 12),
                            Text(err.toString(), style: const TextStyle(color: AppTheme.textSecondary)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                                    name: _selectedClient!.clientName,
                                    phone: _selectedClient!.clientPhone,
                                  ),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                      data: (reports) {
                        final filteredReports = reports.where((r) {
                          final matchName = r.clientName.toLowerCase().contains(_searchQuery.toLowerCase());
                          final matchManager = r.managerName.toLowerCase().contains(_searchQuery.toLowerCase());
                          return matchName || matchManager;
                        }).toList();

                        // Compute total outstanding and started date
                        final double totalAmount = reports.fold(0.0, (sum, r) => r.isGreen ? sum + r.amount : sum - r.amount);
                        String startedDate = '—';
                        if (reports.isNotEmpty) {
                          final dates = reports.map((r) => DateTime.tryParse(r.reportDate) ?? DateTime(9999)).toList();
                          dates.sort();
                          startedDate = DateFormat('d MMM yyyy').format(dates.first);
                        }

                        Widget content;
                        if (filteredReports.isEmpty) {
                          content = Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.article_outlined,
                                    size: 64, color: AppTheme.textMuted.withAlpha(100)),
                                const SizedBox(height: 16),
                                const Text('No reports found for this client',
                                    style: TextStyle(color: AppTheme.textMuted)),
                              ],
                            ),
                          );
                        } else {
                          content = ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: filteredReports.length,
                            itemBuilder: (context, index) {
                              final r = filteredReports[index];
                              return _ReportCard(
                                report: r,
                                onTap: () => _handleRowClick(context, r),
                                onViewImages: () => _handleViewImages(context, r.id),
                              );
                            },
                          );
                        }

                        return Column(
                          children: [
                            // Premium Blue Header UI Card
                            Container(
                              margin: const EdgeInsets.all(16),
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppTheme.primary700, AppTheme.primary600],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.08),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedClient!.clientName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (_selectedClient!.clientPhone != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      '📞 ${_selectedClient!.clientPhone}',
                                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                                    ),
                                  ],
                                  const SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'NET OUTSTANDING',
                                            style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${totalAmount >= 0 ? "+" : ""}${formatINR(totalAmount)}',
                                            style: TextStyle(
                                              color: totalAmount >= 0 ? Colors.greenAccent : Colors.redAccent,
                                              fontSize: 18,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'STARTED DATE',
                                            style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            startedDate,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Expanded(child: content),
                          ],
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final ReportItem report;
  final VoidCallback onTap;
  final VoidCallback onViewImages;

  const _ReportCard({
    required this.report,
    required this.onTap,
    required this.onViewImages,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'By ${report.managerName}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatDate(report.reportDate),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMuted,
                      ),
                    ),
                    if (report.shortDesc != null && report.shortDesc!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        report.shortDesc!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ] else if (report.note != null && report.note!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        report.note!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${report.isGreen ? "+" : "-"} ${formatINR(report.amount)}',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: report.isGreen ? Colors.green.shade600 : Colors.red.shade600,
                    ),
                  ),
                  if (report.imageCount > 0) ...[
                    const SizedBox(height: 6),
                    OutlinedButton.icon(
                      onPressed: onViewImages,
                      icon: const Icon(Icons.image_outlined, size: 14),
                      label: Text(
                        'Images (${report.imageCount})',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        side: BorderSide(color: Theme.of(context).primaryColor),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
