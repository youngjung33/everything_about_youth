import 'package:flutter/material.dart';

import '../../domain/notice.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

/// 배지 색상 (배경, 글자)
typedef BadgeColors = ColorPair;

BadgeColors statusColors(NoticeStatus status) => switch (status) {
  NoticeStatus.open => AppColors.success,
  NoticeStatus.upcoming => AppColors.info,
  NoticeStatus.closed => AppColors.neutral,
};

BadgeColors verdictColors(Verdict verdict) => switch (verdict) {
  Verdict.eligible => AppColors.success,
  Verdict.check => AppColors.warning,
  Verdict.ineligible => AppColors.danger,
};

/// 둥근 라벨
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

  final NoticeStatus status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = statusColors(status);
    return Pill(text: label, background: c.background, foreground: c.foreground, bold: true);
  }
}

/// 자격 판정 배지. 판정이 없으면(내 조건 미입력) 아무것도 그리지 않는다.
/// 길게 누르거나(모바일) 마우스를 올리면(웹) 판정 사유가 보인다.
class EligibilityBadge extends StatelessWidget {
  const EligibilityBadge({super.key, required this.eligibility, this.large = false});

  final Eligibility? eligibility;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final e = eligibility;
    if (e == null) return const SizedBox.shrink();
    final c = verdictColors(e.verdict);
    final badge = Pill(
      text: e.verdictLabel,
      background: c.background,
      foreground: c.foreground,
      bold: true,
      large: large,
    );
    if (e.reasons.isEmpty) return badge;
    return Tooltip(message: e.reasons.join('\n'), child: badge);
  }
}
