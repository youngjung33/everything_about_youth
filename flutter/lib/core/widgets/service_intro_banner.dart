import 'package:flutter/material.dart';

import '../design/service_accent.dart';
import '../theme/app_fonts.dart';

/// 목록 상단: **어느 서비스인지**·한 줄 안내 (인지성).
class ServiceIntroBanner extends StatelessWidget {
  const ServiceIntroBanner({super.key, required this.accent});

  final ServiceAccent accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: accent.containerColor(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.accent.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(accent.icon, color: accent.accent, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  accent.title,
                  style: TextStyle(fontWeight: AppFonts.bold, color: accent.accent, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  accent.tagline,
                  style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
