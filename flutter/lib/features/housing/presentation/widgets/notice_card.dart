import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/format.dart';
import '../../domain/notice.dart';
import '../housing_routes.dart';
import 'badges.dart';
import 'saved_notice_button.dart';
import '../../../../core/theme/app_fonts.dart';

/// 라벨(작게) + 값 한 쌍
class MetaItem extends StatelessWidget {
  const MetaItem({super.key, required this.label, required this.value, this.width = 150});

  final String label;
  final String value;
  final double width;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: scheme.outline)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

/// 공고 상태·유형 배지 줄 (카드/상세 공통)
class NoticeBadges extends StatelessWidget {
  const NoticeBadges({super.key, required this.notice, this.largeEligibility = false});

  final NoticeSummary notice;
  final bool largeEligibility;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showDday = notice.dday != null && notice.status != NoticeStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: notice.status, label: notice.statusLabel),
        if (showDday)
          Text(
            notice.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: scheme.primary),
          ),
        Pill(text: notice.supplyTypeLabel, background: scheme.primaryContainer, foreground: scheme.onPrimaryContainer),
        for (final label in notice.housingTypeLabels) Pill(text: label),
        EligibilityBadge(eligibility: notice.eligibility, large: largeEligibility),
      ],
    );
  }
}

class NoticeCard extends StatelessWidget {
  const NoticeCard({super.key, required this.notice});

  final NoticeSummary notice;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(HousingRoutes.notice(notice.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: NoticeBadges(notice: notice)),
                  SavedNoticeButton(noticeId: notice.id),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                notice.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  MetaItem(label: '공급기관', value: notice.organization, width: 170),
                  MetaItem(label: '지역', value: notice.regionLabel, width: 170),
                  MetaItem(
                    label: '접수기간',
                    value: formatPeriod(notice.applicationStart, notice.applicationEnd),
                    width: 170,
                  ),
                  MetaItem(label: '공급세대', value: formatHouseholds(notice.totalHouseholds), width: 100),
                  MetaItem(label: '보증금/분양가', value: formatFrom(notice.minDeposit), width: 120),
                  MetaItem(label: '월 임대료', value: formatFrom(notice.minMonthlyRent), width: 100),
                  MetaItem(
                    label: '전용면적',
                    value: formatRange<double>(notice.minAreaM2, notice.maxAreaM2, formatArea),
                    width: 120,
                  ),
                  MetaItem(label: '출처', value: notice.sourceLabels.join(', '), width: 170),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
