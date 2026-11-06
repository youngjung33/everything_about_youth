import 'package:flutter/material.dart';

import '../../domain/living_guide.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

typedef BadgeColors = ColorPair;

BadgeColors statusColors(GuideStatus status) => switch (status) {
  GuideStatus.open => AppColors.success,
  GuideStatus.upcoming => AppColors.info,
  GuideStatus.closed => AppColors.neutral,
};

class Pill extends StatelessWidget {
  const Pill({super.key, required this.text, this.background, this.foreground, this.bold = false, this.large = false});

  final String text;
  final Color? background;
  final Color? foreground;
  final bool bold;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: large ? 12 : 8, vertical: large ? 6 : 3),
      decoration: BoxDecoration(
        color: background ?? scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: large ? 14 : 12,
          fontWeight: bold ? AppFonts.bold : AppFonts.regular,
          color: foreground ?? scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, required this.label});

  final GuideStatus status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = statusColors(status);
    return Pill(text: label, background: c.background, foreground: c.foreground, bold: true);
  }
}
