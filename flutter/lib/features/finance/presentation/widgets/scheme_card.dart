import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/widgets/collected_summary.dart';
import '../../../../core/format/format.dart';
import '../../domain/finance_scheme.dart';
import '../finance_routes.dart';
import 'badges.dart';
import 'saved_scheme_button.dart';
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
class SchemeBadges extends StatelessWidget {
  const SchemeBadges({super.key, required this.scheme, this.largeEligibility = false});

  final SchemeSummary scheme; // 제도 요약
  final bool largeEligibility; // 자격 배지 크게

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final showDday = scheme.dday != null && scheme.status != SchemeStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: scheme.status, label: scheme.statusLabel),
        if (showDday)
          Text(
            scheme.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: colors.primary),
          ),
        Pill(text: scheme.categoryLabel, background: colors.primaryContainer, foreground: colors.onPrimaryContainer),
        for (final tag in scheme.tags.take(3)) Pill(text: tag),
        EligibilityBadge(eligibility: scheme.eligibility, large: largeEligibility),
      ],
    );
  }
}

/// 목록·상세에서 쓰는 Scheme 카드 위젯.
class SchemeCard extends StatelessWidget {
  const SchemeCard({super.key, required this.scheme, this.onTap});

  final SchemeSummary scheme; // 제도 요약
  final VoidCallback? onTap; // 탭 시 콜백

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => context.push(FinanceRoutes.scheme(scheme.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                scheme.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: SchemeBadges(scheme: scheme)),
                  SavedSchemeButton(schemeId: scheme.id),
                ],
              ),
              const SizedBox(height: 8),
              CollectedSummary(
                summary: scheme.summary,
                maxLines: 2,
                missingText: ServiceCopy.missingSummaryCard,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  MetaItem(label: '주관', value: scheme.organization, width: 170),
                  MetaItem(label: '지역', value: scheme.regionLabel, width: 170),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(scheme.applicationStart, scheme.applicationEnd),
                    width: 170,
                  ),
                  MetaItem(label: '출처', value: scheme.sourceLabels.join(', '), width: 170),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
