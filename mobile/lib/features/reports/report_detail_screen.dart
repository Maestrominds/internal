// dart:io removed — not needed
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:gal/gal.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';
import 'reports_provider.dart';
import 'add_report_screen.dart';

String _formatINR(double amount) {
  final formatter = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );
  return formatter.format(amount);
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

class ReportDetailScreen extends ConsumerStatefulWidget {
  final String reportId;
  const ReportDetailScreen({super.key, required this.reportId});

  @override
  ConsumerState<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends ConsumerState<ReportDetailScreen> {
  bool _refreshed = false;

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(reportDetailProvider(widget.reportId));
    final currentUser = ref.watch(authProvider).user;

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          // If we popped, return whether we made modifications
          // To send result back, we should have used Navigator.pop(context, _refreshed)
          // but PopScope handles system back button.
        }
      },
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: AppTheme.primary800,
          title: const Text('Report Details'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context, _refreshed),
          ),
          actions: detailAsync.when(
            data: (report) {
              final canEdit = currentUser != null &&
                  (currentUser.role == 'boss' || report.managerId == currentUser.id);
              if (!canEdit) return null;
              return [
                IconButton(
                  icon: const Icon(Icons.edit, color: Colors.white),
                  onPressed: () async {
                    final edited = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (ctx) => AddReportScreen(editReport: report),
                      ),
                    );
                    if (edited == true) {
                      setState(() {
                        _refreshed = true;
                      });
                      ref
                          .read(reportDetailProvider(widget.reportId).notifier)
                          .fetchDetail();
                    }
                  },
                  tooltip: 'Edit Report',
                ),
              ];
            },
            loading: () => null,
            error: (err, stack) => null,
          ),
        ),
        body: detailAsync.when(
          loading: () => _SkeletonDetail(),
          error: (err, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                const SizedBox(height: 12),
                Text(err.toString(), style: const TextStyle(color: AppTheme.textSecondary)),
              ],
            ),
          ),
          data: (report) => SingleChildScrollView(
            child: Column(
              children: [
                // Header gradient banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primary700, AppTheme.primary600],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report.clientName,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${report.managerName} · ${_formatDate(report.reportDate)}',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Colors.white60,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        _formatINR(report.amount),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.accentGlow,
                        ),
                      ),
                    ],
                  ),
                ),

                // Details body
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Fields grid
                      _DetailGrid(report: report, currentUserId: currentUser?.id),

                      // Description
                      if (report.shortDesc != null && report.shortDesc!.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        _SectionTitle('Description'),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.surface2,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.surface3),
                          ),
                          child: Text(
                            report.shortDesc!,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              height: 1.7,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],

                      // Images
                      if (report.images.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        _SectionTitle('Attachments (${report.images.length})'),
                        const SizedBox(height: 12),
                        _ImageGrid(images: report.images),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(height: 2, width: 40, color: AppTheme.accent500),
      ],
    );
  }
}

class _DetailGrid extends StatelessWidget {
  final ReportDetail report;
  final String? currentUserId;
  const _DetailGrid({required this.report, this.currentUserId});

  Widget _field(String label, String value, {Color? valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.textMuted,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: valueColor ?? AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final editorNames = report.editors.map((e) {
      if (e.id == currentUserId) return 'you';
      return e.name;
    }).join(', ');

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        SizedBox(
          width: (MediaQuery.of(context).size.width - 56) / 2,
          child: _field('CLIENT NAME', report.clientName),
        ),
        if (report.clientPhone != null && report.clientPhone!.isNotEmpty)
          SizedBox(
            width: (MediaQuery.of(context).size.width - 56) / 2,
            child: _field('CLIENT PHONE', report.clientPhone!),
          ),
        SizedBox(
          width: (MediaQuery.of(context).size.width - 56) / 2,
          child: _field('TOTAL AMOUNT', _formatINR(report.amount), valueColor: AppTheme.accent500),
        ),
        SizedBox(
          width: (MediaQuery.of(context).size.width - 56) / 2,
          child: _field('REPORT DATE', _formatDate(report.reportDate)),
        ),
        SizedBox(
          width: (MediaQuery.of(context).size.width - 56) / 2,
          child: _field('SUBMITTED BY', report.managerName),
        ),
        if (editorNames.isNotEmpty)
          SizedBox(
            width: MediaQuery.of(context).size.width - 40,
            child: _field('EDITED BY', editorNames),
          ),
        if (report.note != null && report.note!.isNotEmpty)
          SizedBox(
            width: (MediaQuery.of(context).size.width - 56) / 2,
            child: _field('NOTE', report.note!),
          ),
        SizedBox(
          width: (MediaQuery.of(context).size.width - 56) / 2,
          child: _field('SUBMITTED ON', _formatDate(report.createdAt)),
        ),
      ],
    );
  }
}

class _ImageGrid extends StatelessWidget {
  final List<ReportImage> images;
  const _ImageGrid({required this.images});

  void _openLightbox(BuildContext context, int index) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _Lightbox(images: images, initialIndex: index),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width > 600 ? 3 : 2;
    const spacing = 10.0;
    const runSpacing = 16.0;

    final totalSpacing = (crossAxisCount - 1) * spacing;
    final itemWidth = (width - 40.0 - totalSpacing) / crossAxisCount;

    return Wrap(
      spacing: spacing,
      runSpacing: runSpacing,
      children: List.generate(images.length, (idx) {
        final img = images[idx];
        return GestureDetector(
          onTap: () => _openLightbox(context, idx),
          child: SizedBox(
            width: itemWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 4 / 3,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: CachedNetworkImage(
                      imageUrl: img.cloudinaryUrl,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Shimmer.fromColors(
                        baseColor: AppTheme.surface3,
                        highlightColor: AppTheme.surface,
                        child: Container(color: AppTheme.surface),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: AppTheme.surface2,
                        child: const Icon(Icons.broken_image, color: AppTheme.textMuted),
                      ),
                    ),
                  ),
                ),
                if (img.caption != null && img.caption!.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      img.caption!,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      }),
    );
  }
}

class _Lightbox extends StatefulWidget {
  final List<ReportImage> images;
  final int initialIndex;
  const _Lightbox({required this.images, required this.initialIndex});

  @override
  State<_Lightbox> createState() => _LightboxState();
}

class _LightboxState extends State<_Lightbox> {
  late PageController _pageController;
  late int _current;
  bool _downloading = false;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _downloadImage() async {
    if (_downloading) return;
    setState(() => _downloading = true);
    try {
      final url = widget.images[_current].cloudinaryUrl;
      final dio = Dio();
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/report_image_${_current + 1}.jpg';
      await dio.download(url, path);
      await Gal.putImage(path);
      Fluttertoast.showToast(
        msg: 'Image saved to gallery!',
        backgroundColor: AppTheme.success,
        textColor: Colors.white,
      );
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Download failed',
        backgroundColor: AppTheme.danger,
        textColor: Colors.white,
      );
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          '${_current + 1} / ${widget.images.length}',
          style: const TextStyle(fontSize: 14, color: Colors.white60),
        ),
        actions: [
          IconButton(
            icon: _downloading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.download_rounded, color: Colors.white),
            onPressed: _downloadImage,
            tooltip: 'Save to Gallery',
          ),
        ],
      ),
      body: PhotoViewGallery.builder(
        pageController: _pageController,
        itemCount: widget.images.length,
        onPageChanged: (idx) => setState(() => _current = idx),
        builder: (context, index) {
          return PhotoViewGalleryPageOptions(
            imageProvider: CachedNetworkImageProvider(
              widget.images[index].cloudinaryUrl,
            ),
            minScale: PhotoViewComputedScale.contained,
            maxScale: PhotoViewComputedScale.covered * 3,
          );
        },
        loadingBuilder: (context, event) => const Center(
          child: CircularProgressIndicator(color: AppTheme.accent500),
        ),
      ),
      bottomNavigationBar: widget.images[_current].caption != null &&
              widget.images[_current].caption!.trim().isNotEmpty
          ? Container(
              color: Colors.black,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              child: Text(
                widget.images[_current].caption!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            )
          : null,
    );
  }
}

class _SkeletonDetail extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surface3,
      highlightColor: AppTheme.surface,
      child: Column(
        children: [
          Container(height: 120, color: AppTheme.surface),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Wrap(
              spacing: 16,
              runSpacing: 16,
              children: List.generate(6, (_) {
                return Container(
                  width: (MediaQuery.of(context).size.width - 56) / 2,
                  height: 40,
                  color: AppTheme.surface,
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
