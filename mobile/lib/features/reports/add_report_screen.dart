import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart' as dio;
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme.dart';
import '../../core/api_service.dart';
import 'reports_provider.dart';

class AddReportScreen extends ConsumerStatefulWidget {
  final ReportDetail? editReport;
  final String? prefilledClientName;
  final String? prefilledClientPhone;
  const AddReportScreen({super.key, this.editReport, this.prefilledClientName, this.prefilledClientPhone});

  @override
  ConsumerState<AddReportScreen> createState() => _AddReportScreenState();
}

class _AddReportScreenState extends ConsumerState<AddReportScreen> {
  final _formKey = GlobalKey<FormState>();

  final _clientNameCtrl = TextEditingController();
  final _clientPhoneCtrl = TextEditingController();
  final _clientBusinessNameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  final _shortDescCtrl = TextEditingController();

  DateTime? _selectedDate;
  DateTime? _nextReportDate;
  final ImagePicker _picker = ImagePicker();

  // New images state
  final List<XFile> _newImages = [];
  final List<TextEditingController> _captionControllers = [];

  // Existing images state (for Edit mode)
  final List<ReportImage> _existingImages = [];
  final List<String> _deletedImageIds = [];

  bool _isGreen = true;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.editReport != null) {
      final r = widget.editReport!;
      _clientNameCtrl.text = r.clientName == 'Unnamed Client' ? '' : r.clientName;
      _clientPhoneCtrl.text = r.clientPhone ?? '';
      _clientBusinessNameCtrl.text = r.clientBusinessName ?? '';
      _amountCtrl.text = r.amount == 0 ? '' : r.amount.toString();
      _noteCtrl.text = r.note ?? '';
      _shortDescCtrl.text = r.shortDesc ?? '';
      _isGreen = r.isGreen;
      try {
        _selectedDate = DateTime.parse(r.reportDate);
      } catch (_) {
        _selectedDate = DateTime.now();
      }
      if (r.nextReportDate != null && r.nextReportDate!.isNotEmpty) {
        try {
          _nextReportDate = DateTime.parse(r.nextReportDate!);
        } catch (_) {}
      }
      _existingImages.addAll(r.images);
    } else {
      _selectedDate = DateTime.now();
      if (widget.prefilledClientName != null) {
        _clientNameCtrl.text = widget.prefilledClientName!;
      }
      if (widget.prefilledClientPhone != null) {
        _clientPhoneCtrl.text = widget.prefilledClientPhone!;
      }
    }
  }

  @override
  void dispose() {
    _clientNameCtrl.dispose();
    _clientPhoneCtrl.dispose();
    _clientBusinessNameCtrl.dispose();
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    _shortDescCtrl.dispose();
    for (final ctrl in _captionControllers) {
      ctrl.dispose();
    }
    super.dispose();
  }

  int get _activeExistingCount =>
      _existingImages.length - _deletedImageIds.length;

  int get _totalActiveCount => _activeExistingCount + _newImages.length;

  Future<void> _pickImages() async {
    final maxAllowed = 5 - _totalActiveCount;
    if (maxAllowed <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum 5 images allowed in a report.')),
      );
      return;
    }

    final List<XFile> picked = await _picker.pickMultiImage();
    if (picked.isEmpty) return;
    if (!mounted) return;

    final toAdd = picked.take(maxAllowed).toList();
    if (picked.length > maxAllowed) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Only first $maxAllowed images were added (Max 5 total).')),
      );
    }

    setState(() {
      _newImages.addAll(toAdd);
      for (var i = 0; i < toAdd.length; i++) {
        _captionControllers.add(TextEditingController());
      }
    });
  }

  void _removeNewImage(int index) {
    setState(() {
      _newImages.removeAt(index);
      final removedCtrl = _captionControllers.removeAt(index);
      removedCtrl.dispose();
    });
  }

  void _toggleDeleteExisting(String id) {
    setState(() {
      if (_deletedImageIds.contains(id)) {
        _deletedImageIds.remove(id);
      } else {
        _deletedImageIds.add(id);
      }
    });
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary700,
              onPrimary: Colors.white,
              onSurface: AppTheme.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectNextReportDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _nextReportDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime(2100),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary700,
              onPrimary: Colors.white,
              onSurface: AppTheme.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _nextReportDate) {
      setState(() {
        _nextReportDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    // Validate captions for new images (must have captions if new image added)
    for (var i = 0; i < _newImages.length; i++) {
      final cap = _captionControllers[i].text.trim();
      if (cap.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Please add a caption for new image #${i + 1}')),
        );
        return;
      }
      if (cap.length > 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Caption for image #${i + 1} must be 200 characters or less.')),
        );
        return;
      }
    }

    // Validate amount format if provided
    double? finalAmount;
    if (_amountCtrl.text.isNotEmpty) {
      finalAmount = double.tryParse(_amountCtrl.text);
      if (finalAmount == null || finalAmount < 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a valid amount (>= 0)')),
        );
        return;
      }
    }

    setState(() => _loading = true);

    try {
      final api = ApiService();
      final Map<String, dynamic> formDataMap = {
        'client_name': _clientNameCtrl.text.trim(),
        'client_phone': _clientPhoneCtrl.text.trim(),
        'client_business_name': _clientBusinessNameCtrl.text.trim(),
        'amount': finalAmount ?? 0.0,
        'note': _noteCtrl.text.trim(),
        'short_desc': _shortDescCtrl.text.trim(),
        'is_green': _isGreen,
        'report_date': _selectedDate != null
            ? DateFormat('yyyy-MM-dd').format(_selectedDate!)
            : DateFormat('yyyy-MM-dd').format(DateTime.now()),
        'next_report_date': _nextReportDate != null
            ? DateFormat('yyyy-MM-dd').format(_nextReportDate!)
            : '',
      };

      // Add captions
      final captionsList = _captionControllers.map((c) => c.text.trim()).toList();
      if (captionsList.isNotEmpty) {
        formDataMap['captions'] = captionsList;
      }

      // Deletions for Edit Mode
      if (widget.editReport != null && _deletedImageIds.isNotEmpty) {
        formDataMap['deleted_image_ids'] = _deletedImageIds;
      }

      final formData = dio.FormData.fromMap(formDataMap);

      // Add files individually to avoid key bracket appending (e.g. images[] vs images)
      for (final imgFile in _newImages) {
        formData.files.add(
          MapEntry(
            'images',
            await dio.MultipartFile.fromFile(
              imgFile.path,
              filename: imgFile.name,
            ),
          ),
        );
      }

      dio.Response response;
      if (widget.editReport != null) {
        response = await api.updateReport(widget.editReport!.id, formData);
      } else {
        response = await api.createReport(formData);
      }

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.editReport != null
                ? 'Report updated successfully!'
                : 'Report submitted successfully!'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context, true);
      } else {
        throw Exception(response.data['message'] ?? 'Failed to submit report');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is dio.DioException
              ? (e.response?.data?['message'] ?? 'Network error occurred')
              : e.toString()),
          backgroundColor: AppTheme.danger,
        ),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.editReport != null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primary800,
        title: Text(isEdit ? 'Edit Report' : 'Add Report'),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Report Details',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'All fields are optional except captions for added images.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                  const SizedBox(height: 20),

                  // Client Name and Phone (only show if not prefilled)
                  if (widget.prefilledClientName == null) ...[
                    TextFormField(
                      controller: _clientNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Client Name',
                        hintText: 'Enter client name',
                        prefixIcon: Icon(Icons.person),
                        border: OutlineInputBorder(),
                      ),
                      maxLength: 50,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _clientPhoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Client Phone Number',
                        hintText: 'Enter phone number',
                        prefixIcon: Icon(Icons.phone),
                        border: OutlineInputBorder(),
                      ),
                      maxLength: 15,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _clientBusinessNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Client Business Name',
                        hintText: 'Enter business name',
                        prefixIcon: Icon(Icons.business),
                        border: OutlineInputBorder(),
                      ),
                      maxLength: 100,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Amount
                  TextFormField(
                    controller: _amountCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Amount (INR)',
                      hintText: 'Total amount',
                      prefixIcon: Icon(Icons.currency_rupee),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Transaction Type
                  const Text(
                    'Transaction Type',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => setState(() => _isGreen = true),
                          icon: Icon(Icons.circle, color: _isGreen ? Colors.white : Colors.green, size: 14),
                          label: Text(
                            'Plus (Green)',
                            style: TextStyle(
                              color: _isGreen ? Colors.white : Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: _isGreen ? Colors.green : Colors.transparent,
                            side: const BorderSide(color: Colors.green, width: 2),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => setState(() => _isGreen = false),
                          icon: Icon(Icons.circle, color: !_isGreen ? Colors.white : Colors.red, size: 14),
                          label: Text(
                            'Minus (Red)',
                            style: TextStyle(
                              color: !_isGreen ? Colors.white : Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: !_isGreen ? Colors.red : Colors.transparent,
                            side: const BorderSide(color: Colors.red, width: 2),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Date Selector Card
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    child: ListTile(
                      leading: const Icon(Icons.calendar_today, color: AppTheme.primary600),
                      title: const Text(
                        'Report Date',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      subtitle: Text(
                        _selectedDate != null
                            ? DateFormat('d MMMM yyyy').format(_selectedDate!)
                            : 'Select Date',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      trailing: const Icon(Icons.arrow_drop_down),
                      onTap: _selectDate,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Next Report Date selector card
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    child: ListTile(
                      leading: const Icon(Icons.alarm, color: AppTheme.primary600),
                      title: const Text(
                        'Next Report Date (Optional Reminder)',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      subtitle: Text(
                        _nextReportDate != null
                            ? DateFormat('d MMMM yyyy').format(_nextReportDate!)
                            : 'Not Set',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      trailing: _nextReportDate != null
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                setState(() {
                                  _nextReportDate = null;
                                });
                              },
                            )
                          : const Icon(Icons.arrow_drop_down),
                      onTap: _selectNextReportDate,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Note
                  TextFormField(
                    controller: _noteCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Note',
                      hintText: 'Short note (optional)',
                      prefixIcon: Icon(Icons.note_alt),
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 20,
                  ),
                  const SizedBox(height: 16),

                  // Short Desc
                  TextFormField(
                    controller: _shortDescCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Brief description of the work done',
                      prefixIcon: Icon(Icons.description),
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                    maxLength: 200,
                  ),
                  const SizedBox(height: 24),

                  // --- Images Section ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Images ($_totalActiveCount/5)',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      if (_totalActiveCount < 5)
                        TextButton.icon(
                          onPressed: _pickImages,
                          icon: const Icon(Icons.add_a_photo, color: AppTheme.primary600),
                          label: const Text('Add', style: TextStyle(color: AppTheme.primary600)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Existing Images list (with deletes)
                  if (isEdit && _existingImages.isNotEmpty) ...[
                    const Text(
                      'Existing Images (Tap to delete)',
                      style: TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _existingImages.length,
                      itemBuilder: (ctx, idx) {
                        final img = _existingImages[idx];
                        final isDeleted = _deletedImageIds.contains(img.id);

                        return Card(
                          color: isDeleted ? Colors.red.shade50 : null,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: isDeleted ? Colors.red.shade300 : Colors.grey.shade300,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: CachedNetworkImage(
                                    imageUrl: img.cloudinaryUrl,
                                    width: 60,
                                    height: 60,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    img.caption ?? 'No caption',
                                    style: TextStyle(
                                      decoration: isDeleted ? TextDecoration.lineThrough : null,
                                      color: isDeleted ? Colors.red : AppTheme.textPrimary,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    isDeleted ? Icons.undo : Icons.delete,
                                    color: isDeleted ? Colors.green : Colors.red,
                                  ),
                                  onPressed: () => _toggleDeleteExisting(img.id),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // New picked images
                  if (_newImages.isNotEmpty) ...[
                    const Text(
                      'New Attachments (Captions required)',
                      style: TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _newImages.length,
                      itemBuilder: (ctx, idx) {
                        final file = _newImages[idx];
                        return Card(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(color: Colors.grey.shade300),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.file(
                                    File(file.path),
                                    width: 80,
                                    height: 80,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      TextField(
                                        controller: _captionControllers[idx],
                                        maxLines: 2,
                                        maxLength: 200,
                                        decoration: const InputDecoration(
                                          labelText: 'Caption *',
                                          hintText: 'Enter caption for this image',
                                          border: OutlineInputBorder(),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                CircleAvatar(
                                  backgroundColor: Colors.grey.shade100,
                                  child: IconButton(
                                    icon: const Icon(Icons.close, color: Colors.black54, size: 20),
                                    onPressed: () => _removeNewImage(idx),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accent500,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        isEdit ? 'Save Changes' : 'Submit Report',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
          if (_loading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(color: AppTheme.accent500),
              ),
            ),
        ],
      ),
    );
  }
}
