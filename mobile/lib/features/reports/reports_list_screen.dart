import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'reports_provider.dart';
import 'report_detail_screen.dart';
import 'add_report_screen.dart';

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

                        if (filteredReports.isEmpty) {
                          return Center(
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
                        }

                        return ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredReports.length,
                          itemBuilder: (context, index) {
                            final r = filteredReports[index];
                            return _ReportCard(
                              report: r,
                              onTap: () async {
                                final refreshNeeded = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (ctx) => ReportDetailScreen(reportId: r.id),
                                  ),
                                );
                                if (refreshNeeded == true) {
                                  ref.read(clientReportsProvider.notifier).fetchReportsForClient(
                                        name: _selectedClient!.clientName,
                                        phone: _selectedClient!.clientPhone,
                                      );
                                }
                              },
                            );
                          },
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

  const _ReportCard({required this.report, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.clientName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${report.managerName} · ${formatDate(report.reportDate)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                formatINR(report.amount),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.accent500,
                ),
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
