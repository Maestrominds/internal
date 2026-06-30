import 'package:flutter/material.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _currentPasswordCtrl.dispose();
    _newPasswordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
    });

    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      await ApiService().changePassword(
        currentPassword: _currentPasswordCtrl.text,
        newPassword: _newPasswordCtrl.text,
      );

      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Password updated successfully')),
      );

      _currentPasswordCtrl.clear();
      _newPasswordCtrl.clear();
      _confirmPasswordCtrl.clear();
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Failed to update password: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primary800,
        title: const Text('Reset Password', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Change your password',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Please fill all fields to update your password.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _currentPasswordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current Password',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter current password';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _newPasswordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  prefixIcon: Icon(Icons.lock_reset),
                  hintText: 'Min 6 characters',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter new password';
                  }
                  if (value.trim().length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmPasswordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                  prefixIcon: Icon(Icons.lock_clock),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please confirm new password';
                  }
                  if (value.trim() != _newPasswordCtrl.text.trim()) {
                    return 'Passwords do not match';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _loading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent500,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Update Password',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
