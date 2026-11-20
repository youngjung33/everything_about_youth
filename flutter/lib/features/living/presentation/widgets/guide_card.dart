import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/widgets/collected_summary.dart';
import '../../domain/living_guide.dart';
import '../living_routes.dart';
import 'badges.dart';
import 'saved_guide_button.dart';
import '../../../../core/theme/app_fonts.dart';

/// 카드에 보조로 붙는 메타 한 줄(지역·기간 등).
class MetaItem extends StatelessWidget {
  const MetaItem({super.key, required this.label, required this.value, this.width = 150});

  final String label; // 화면에 보이는 한글 라벨
  final String value; // 코드 값
  final double width; // 가로 너비

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: colors.outline)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

/// 카드 상단 상태·판정 배지 묶음.
class GuideBadges extends StatelessWidget {
  const GuideBadges({super.key, required this.guide, this.largeEligibility = false});

  final GuideSummary guide; // 가이드 요약
  final bool largeEligibility; // 자격 배지 크게

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final showDday = guide.dday != null && guide.status != GuideStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: guide.status, label: guide.statusLabel),
        EligibilityBadge(eligibility: guide.eligibility, large: largeEligibility),
        if (showDday)
          Text(
            guide.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: colors.primary),
          ),
        Pill(text: guide.categoryLabel, background: colors.primaryContainer, foreground: colors.onPrimaryContainer),
        for (final tag in guide.tags.take(3)) Pill(text: tag),
      ],
    );
  }
}

/// 목록·상세에서 쓰는 Guide 카드 위젯.
class GuideCard extends StatelessWidget {
  const GuideCard({super.key, required this.guide, this.onTap});

  final GuideSummary guide; // 가이드 요약
  final VoidCallback? onTap; // 탭 시 콜백

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => context.push(LivingRoutes.guide(guide.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                guide.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: GuideBadges(guide: guide)),
                  SavedGuideButton(guideId: guide.id),
                ],
              ),
              const SizedBox(height: 8),
              CollectedSummary(
                summary: guide.summary,
                maxLines: 2,
                missingText: ServiceCopy.missingSummaryCard,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 6),
              Text(
                '${guide.organization} · ${guide.regionLabel}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.outline),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
