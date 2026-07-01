import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'reports_provider.dart';
import 'report_detail_screen.dart';
import 'add_report_screen.dart';
import '../../core/api_service.dart';
import 'managers_list_screen.dart';
import 'audit_logs_screen.dart';
import '../auth/reset_password_screen.dart';
import '../auth/login_screen.dart';

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
    final user = ref.read(authProvider).user;
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
          if (user?.role == 'boss')
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _deleteReport(r.id);
              },
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete Transaction'),
            ),

          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteReport(String reportId) async {
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Transaction'),
        content: const Text('Are you sure you want to permanently delete this report? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppTheme.accent500)),
    );

    try {
      await ApiService().deleteReport(reportId);
      navigator.pop(); // close loader

      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Report deleted successfully.')),
      );

      if (_selectedClient != null) {
        ref.read(clientReportsProvider.notifier).fetchReportsForClient(
              name: _selectedClient!.clientName,
              phone: _selectedClient!.clientPhone,
            );
      }
    } catch (e) {
      navigator.pop(); // close loader
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Failed to delete report: $e')),
      );
    }
  }

  Future<void> _deleteClient(ClientItem client) async {
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    final phoneStr = client.clientPhone != null && client.clientPhone!.isNotEmpty
        ? ' (Phone: ${client.clientPhone})'
        : '';
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Client'),
        content: Text('Are you sure you want to permanently delete client "${client.clientName}"$phoneStr? This will permanently delete ALL reports and images for this client from the database.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppTheme.accent500)),
    );

    try {
      await ApiService().deleteClient(client.clientName, client.clientPhone);
      navigator.pop(); // close loader

      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Client and all reports deleted successfully.')),
      );

      if (_selectedClient != null &&
          _selectedClient!.clientName == client.clientName &&
          _selectedClient!.clientPhone == client.clientPhone) {
        setState(() {
          _selectedClient = null;
          _searchQuery = '';
          _searchCtrl.clear();
        });
      }

      ref.read(clientsProvider.notifier).fetchClients();
    } catch (e) {
      navigator.pop(); // close loader
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Failed to delete client: $e')),
      );
    }
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

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_selectedClient != null) {
          setState(() {
            _selectedClient = null;
            _searchQuery = '';
            _searchCtrl.clear();
          });
        } else {
          // If there's a parent route (e.g. HomeScreen), go back to it
          final navigator = Navigator.of(context);
          if (navigator.canPop()) {
            navigator.pop();
          } else {
            final exit = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Exit App'),
                content: const Text('Are you sure you want to exit?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Cancel'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Exit'),
                  ),
                ],
              ),
            );
            if (exit == true) {
              await SystemNavigator.pop();
            }
          }
        }
      },

      child: Scaffold(
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
                ref.read(authProvider.notifier).logout().then((_) {
                  if (context.mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (ctx) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                });
              } else if (v == 'managers') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const ManagersListScreen()),
                );
              } else if (v == 'audit') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const AuditLogsScreen()),
                );
              } else if (v == 'reset_password') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const ResetPasswordScreen()),
                );
              } else if (v == 'delete_client') {
                if (_selectedClient != null) {
                  _deleteClient(_selectedClient!);
                }
              }
            },
            itemBuilder: (_) => [
              if (user?.role == 'boss' && _selectedClient != null)
                const PopupMenuItem(
                  value: 'delete_client',
                  child: Row(
                    children: [
                      Icon(Icons.delete_forever, size: 18, color: AppTheme.danger),
                      SizedBox(width: 10),
                      Text('Delete Client', style: TextStyle(color: AppTheme.danger)),
                    ],
                  ),
                ),
              if (user?.role == 'boss')
                const PopupMenuItem(
                  value: 'managers',
                  child: Row(
                    children: [
                      Icon(Icons.people_outline, size: 18, color: AppTheme.textSecondary),
                      SizedBox(width: 10),
                      Text('Manage Managers'),
                    ],
                  ),
                ),
              if (user?.role == 'boss')
                const PopupMenuItem(
                  value: 'audit',
                  child: Row(
                    children: [
                      Icon(Icons.history_edu_outlined, size: 18, color: AppTheme.textSecondary),
                      SizedBox(width: 10),
                      Text('Audit Logs'),
                    ],
                  ),
                ),
              if (user?.role == 'boss')
                const PopupMenuItem(
                  value: 'reset_password',
                  child: Row(
                    children: [
                      Icon(Icons.lock_reset, size: 18, color: AppTheme.textSecondary),
                      SizedBox(width: 10),
                      Text('Reset Password'),
                    ],
                  ),
                ),
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
              builder: (ctx) => AddReportScreen(
                prefilledClientName: _selectedClient?.clientName,
                prefilledClientPhone: _selectedClient?.clientPhone,
              ),
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
        label: Text(_selectedClient == null ? 'Add Client' : 'Add Report', style: const TextStyle(color: Colors.white)),
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
                                onLongPress: user?.role == 'boss' ? () => _deleteClient(client) : null,
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
                        String lastReportDate = '—';
                        ReportItem? firstReport;
                        if (reports.isNotEmpty) {
                          // Find first report chronologically (oldest)
                          final sortedReportsAsc = List<ReportItem>.from(reports);
                          sortedReportsAsc.sort((a, b) {
                            final dateA = DateTime.tryParse(a.reportDate) ?? DateTime(9999);
                            final dateB = DateTime.tryParse(b.reportDate) ?? DateTime(9999);
                            final dateComp = dateA.compareTo(dateB);
                            if (dateComp != 0) return dateComp;
                            return reports.indexOf(a).compareTo(reports.indexOf(b));
                          });
                          firstReport = sortedReportsAsc.first;
                          startedDate = formatDate(firstReport.reportDate);

                          // Find last report chronologically (newest)
                          final sortedReportsDesc = List<ReportItem>.from(reports);
                          sortedReportsDesc.sort((a, b) {
                            final dateA = DateTime.tryParse(a.reportDate) ?? DateTime(1970);
                            final dateB = DateTime.tryParse(b.reportDate) ?? DateTime(1970);
                            final dateComp = dateB.compareTo(dateA); // Descending (newest first)
                            if (dateComp != 0) return dateComp;
                            return reports.indexOf(b).compareTo(reports.indexOf(a));
                          });
                          lastReportDate = formatDate(sortedReportsDesc.first.reportDate);
                        }

                        // Compute cumulative outstanding sums based on ALL reports sorted chronologically (oldest first)
                        final sortedAllReports = List<ReportItem>.from(reports);
                        sortedAllReports.sort((a, b) {
                          final dateA = DateTime.tryParse(a.reportDate) ?? DateTime(9999);
                          final dateB = DateTime.tryParse(b.reportDate) ?? DateTime(9999);
                          final dateComp = dateA.compareTo(dateB);
                          if (dateComp != 0) return dateComp;
                          return reports.indexOf(a).compareTo(reports.indexOf(b));
                        });

                        double runningSum = 0.0;
                        final Map<String, double> runningSumsMap = {};
                        for (final r in sortedAllReports) {
                          runningSum = r.isGreen ? runningSum + r.amount : runningSum - r.amount;
                          runningSumsMap[r.id] = runningSum;
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
                          content = InteractiveViewer(
                            constrained: false,
                            minScale: 0.5,
                            maxScale: 2.5,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 100),
                              child: Container(
                                margin: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.surface2),
                                ),
                                child: DataTable(
                                  headingRowColor: WidgetStateProperty.all(AppTheme.surface2),
                                  showCheckboxColumn: false,
                                  columns: const [
                                    DataColumn(label: Text('Created / Edited By', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary))),
                                    DataColumn(label: Text('Uploaded Date', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary))),
                                    DataColumn(label: Text('Amount', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary))),
                                    DataColumn(label: Text('Net Outstanding', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary))),
                                    DataColumn(label: Text('Images', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textSecondary))),
                                  ],
                                  rows: filteredReports.map((r) {
                                    final double runningSumAtReport = runningSumsMap[r.id] ?? 0.0;
                                    return DataRow(
                                      onSelectChanged: (_) => _handleRowClick(context, r),
                                      cells: [
                                        DataCell(Text(r.managerName, style: const TextStyle(fontWeight: FontWeight.w500))),
                                        DataCell(Text(formatDate(r.reportDate))),
                                        DataCell(
                                          Text(
                                            '${r.isGreen ? "+" : "-"} ${formatINR(r.amount)}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: r.isGreen ? Colors.green.shade600 : Colors.red.shade600,
                                            ),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            '${runningSumAtReport >= 0 ? "+" : "-"} ${formatINR(runningSumAtReport.abs())}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: runningSumAtReport >= 0 ? Colors.green.shade600 : Colors.red.shade600,
                                            ),
                                          ),
                                        ),
                                        DataCell(
                                          r.imageCount > 0
                                              ? OutlinedButton(
                                                  onPressed: () => _handleViewImages(context, r.id),
                                                  style: OutlinedButton.styleFrom(
                                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                                    side: const BorderSide(color: AppTheme.accent500),
                                                  ),
                                                  child: Text('View (${r.imageCount})'),
                                                )
                                              : const Text('No images', style: TextStyle(color: AppTheme.textMuted)),
                                        ),
                                      ],
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
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
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        _selectedClient!.clientName,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (_selectedClient!.clientBusinessName != null &&
                                          _selectedClient!.clientBusinessName!.isNotEmpty) ...[
                                        const SizedBox(width: 8),
                                        Text(
                                          _selectedClient!.clientBusinessName!,
                                          style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (_selectedClient!.clientPhone != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      '📞 ${_selectedClient!.clientPhone}',
                                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                                    ),
                                  ],
                                  const SizedBox(height: 16),
                                  // Received Amt and Started Date aligned in the same line
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'AMT RECEIVED',
                                            style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            firstReport != null
                                                ? '${firstReport.isGreen ? "+" : "-"}${formatINR(firstReport.amount)}'
                                                : '—',
                                            style: TextStyle(
                                              color: firstReport != null
                                                  ? (firstReport.isGreen ? Colors.greenAccent : Colors.redAccent)
                                                  : Colors.white,
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
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
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  // Net Outstanding and Last Report date aligned in the same line
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
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'LAST REPORT',
                                            style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            lastReportDate,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 14,
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
    ),
  );
  }
}

