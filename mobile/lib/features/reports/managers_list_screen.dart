import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';

class ManagerModel {
  final String id;
  final String name;
  final String email;
  final bool isActive;
  final String createdAt;

  const ManagerModel({
    required this.id,
    required this.name,
    required this.email,
    required this.isActive,
    required this.createdAt,
  });

  factory ManagerModel.fromJson(Map<String, dynamic> json) => ManagerModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        isActive: json['is_active'] ?? true,
        createdAt: json['created_at'] ?? '',
      );
}

class ManagersListScreen extends ConsumerStatefulWidget {
  const ManagersListScreen({super.key});

  @override
  ConsumerState<ManagersListScreen> createState() => _ManagersListScreenState();
}

class _ManagersListScreenState extends ConsumerState<ManagersListScreen> {
  final ApiService _api = ApiService();
  List<ManagerModel> _managers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchManagers();
  }

  Future<void> _fetchManagers() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getManagers();
      final list = (res.data['managers'] as List<dynamic>)
          .map((e) => ManagerModel.fromJson(e))
          .toList();
      setState(() {
        _managers = list;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load managers: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _addManager() async {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    bool loading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Add Manager'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Name', hintText: 'Enter name'),
                    maxLength: 50,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: 'Email', hintText: 'Enter email'),
                    keyboardType: TextInputType.emailAddress,
                    maxLength: 50,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Email is required';
                      if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) {
                        return 'Invalid email format';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: passCtrl,
                    decoration: const InputDecoration(labelText: 'Password', hintText: 'Min 6 characters'),
                    obscureText: true,
                    validator: (v) => v == null || v.length < 6 ? 'Password must be at least 6 characters' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDlgState(() => loading = true);
                      try {
                        await _api.addManager(
                          name: nameCtrl.text.trim(),
                          email: emailCtrl.text.trim(),
                          password: passCtrl.text,
                        );
                        if (!mounted) return;
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Manager added successfully'), backgroundColor: AppTheme.success),
                        );
                        _fetchManagers();
                      } catch (e) {
                        setDlgState(() => loading = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to add manager: $e'), backgroundColor: AppTheme.danger),
                        );
                      }
                    },
              child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _resetPassword(ManagerModel m) async {
    final formKey = GlobalKey<FormState>();
    final passCtrl = TextEditingController();
    bool loading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: Text('Reset Password for ${m.name}'),
          content: Form(
            key: formKey,
            child: TextFormField(
              controller: passCtrl,
              decoration: const InputDecoration(labelText: 'New Password', hintText: 'Min 6 characters'),
              obscureText: true,
              validator: (v) => v == null || v.length < 6 ? 'Password must be at least 6 characters' : null,
            ),
          ),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDlgState(() => loading = true);
                      try {
                        await _api.resetManagerPassword(m.id, passCtrl.text);
                        if (!mounted) return;
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Password for ${m.name} reset successfully!'), backgroundColor: AppTheme.success),
                        );
                      } catch (e) {
                        setDlgState(() => loading = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Reset failed: $e'), backgroundColor: AppTheme.danger),
                        );
                      }
                    },
              child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Reset'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteManager(ManagerModel m) async {
    bool loading = false;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Text('Delete Manager'),
          content: loading
              ? const SizedBox(
                  height: 60,
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                )
              : Text('Are you sure you want to delete "${m.name}"? They will be immediately logged out if currently signed in.'),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: loading
                  ? null
                  : () async {
                      setDlgState(() => loading = true);
                      try {
                        await _api.deleteManager(m.id);
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx, true);
                      } catch (e) {
                        setDlgState(() => loading = false);
                        if (!ctx.mounted) return;
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(content: Text('Delete failed: $e'), backgroundColor: AppTheme.danger),
                        );
                        Navigator.pop(ctx, false);
                      }
                    },
              style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
              child: loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: AppTheme.danger, strokeWidth: 2),
                    )
                  : const Text('Delete'),
            ),
          ],
        ),
      ),
    );

    if (confirm == true) {
      _fetchManagers();
    }
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '—';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('d MMM yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Managers'),
        backgroundColor: AppTheme.primary800,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addManager,
        backgroundColor: AppTheme.accent500,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Manager', style: TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 4,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Shimmer.fromColors(
                  baseColor: AppTheme.surface3,
                  highlightColor: AppTheme.surface,
                  child: Container(
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            )
          : _managers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: AppTheme.textMuted.withAlpha(100)),
                      const SizedBox(height: 16),
                      const Text('No managers found', style: TextStyle(color: AppTheme.textMuted)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _managers.length,
                  itemBuilder: (context, index) {
                    final m = _managers[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.surface2,
                          child: Text(
                            m.name.isNotEmpty ? m.name[0].toUpperCase() : '',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary600),
                          ),
                        ),
                        title: Text(
                          m.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.email,
                              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: m.isActive ? Colors.green.shade50 : Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: m.isActive ? Colors.green.shade200 : Colors.red.shade200),
                                  ),
                                  child: Text(
                                    m.isActive ? '● Active' : '● Inactive',
                                    style: TextStyle(
                                      color: m.isActive ? Colors.green.shade700 : Colors.red.shade700,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Added: ${_formatDate(m.createdAt)}',
                                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                ),
                              ],
                            ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.refresh, color: AppTheme.accent500, size: 20),
                              tooltip: 'Reset Password',
                              onPressed: () => _resetPassword(m),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppTheme.danger, size: 20),
                              tooltip: 'Delete Manager',
                              onPressed: () => _deleteManager(m),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
