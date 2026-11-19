import 'package:flutter/material.dart';

import '../../domain/living_guide.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

/// 배지 색상 (배경, 글자)
typedef BadgeColors = ColorPair;

/// 상태·판정 값에 맞는 배지 색 쌍을 반환한다.
BadgeColors statusColors(GuideStatus status) => switch (status) {
  GuideStatus.open => AppColors.success,
  GuideStatus.upcoming => AppColors.info,
  GuideStatus.closed => AppColors.neutral,
};

/// 상태·판정 값에 맞는 배지 색 쌍을 반환한다.
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

/// 모집·진행 상태 라벨 배지.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, required this.label});

  final GuideStatus status;
  final String label; // 화면에 보이는 한글 라벨

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
