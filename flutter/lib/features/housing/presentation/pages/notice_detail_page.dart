import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/format.dart';
import '../../../../core/launch.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../../application/providers.dart';
import '../../domain/notice.dart';
import '../widgets/badges.dart';
import '../widgets/notice_card.dart';
import '../../../../core/theme/app_fonts.dart';

class NoticeDetailPage extends ConsumerWidget {
  const NoticeDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(noticeDetailProvider(id));

    return AppScaffold(
      appBar: AppTopBar(title: const Text('공고 상세')),
      body: async.when(
        loading: () => const LoadingView(message: '공고 상세를 불러오는 중…'),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(noticeDetailProvider(id))),
        data: (detail) => _DetailBody(detail: detail),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});

  final NoticeDetail detail;

  @override
  Widget build(BuildContext context) {
    final notice = detail.summary;
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            NoticeBadges(notice: notice, largeEligibility: true),
            const SizedBox(height: 12),
            Text(notice.title, style: textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
            if (notice.eligibility != null) ...[
              const SizedBox(height: 16),
              _EligibilityCard(eligibility: notice.eligibility!),
            ],
            const SizedBox(height: 16),
            _Section(
              title: '공고 개요',
              child: Wrap(
                spacing: 16,
                runSpacing: 14,
                children: [
                  MetaItem(label: '공급기관', value: notice.organization, width: 200),
                  MetaItem(label: '지역', value: notice.regionLabel, width: 200),
                  MetaItem(
                    label: '접수기간',
                    value: formatPeriod(notice.applicationStart, notice.applicationEnd),
                    width: 200,
                  ),
                  MetaItem(label: '공고일', value: formatDate(notice.announcementDate), width: 200),
                  MetaItem(label: '당첨자 발표', value: formatDate(detail.winnerAnnouncementDate), width: 200),
                  MetaItem(label: '공급세대', value: formatHouseholds(notice.totalHouseholds), width: 200),
                  MetaItem(
                    label: '전용면적',
                    value: formatRange<double>(notice.minAreaM2, notice.maxAreaM2, formatArea),
                    width: 200,
                  ),
                  MetaItem(label: '보증금/분양가', value: formatFrom(notice.minDeposit), width: 200),
                  MetaItem(label: '월 임대료', value: formatFrom(notice.minMonthlyRent), width: 200),
                ],
              ),
            ),
            if (detail.eligibilityText != null)
              _Section(title: '공고 발췌', child: SelectableText(detail.eligibilityText!)),
            if (detail.complexes.isNotEmpty)
              _Section(
                title: '단지·세대유형',
                child: Column(children: [for (final complex in detail.complexes) _ComplexView(complex: complex)]),
              ),
            _Section(
              title: '출처',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [for (final source in detail.sources) _SourceRow(source: source)],
              ),
            ),
            const SizedBox(height: 4),
            if (notice.url != null)
              FilledButton.icon(
                onPressed: () => openExternal(context, notice.url!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('원문 공고 보기'),
              ),
            const SizedBox(height: 12),
            Text(
              '이 정보는 공개 데이터와 각 기관 공고를 수집한 참고용입니다. 신청 전 반드시 원문 공고를 확인하세요.',
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

class _EligibilityCard extends StatelessWidget {
  const _EligibilityCard({required this.eligibility});

  final Eligibility eligibility;

  @override
  Widget build(BuildContext context) {
    final colors = verdictColors(eligibility.verdict);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.background.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '내 조건 판정: ${eligibility.verdictLabel}',
            style: TextStyle(fontWeight: AppFonts.bold, fontSize: 16, color: colors.foreground),
          ),
          for (final reason in eligibility.reasons) _Bullet(text: reason, color: colors.foreground),
          for (final note in eligibility.notes) _Bullet(text: note, color: colors.foreground),
        ],
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: color)),
          Expanded(
            child: Text(text, style: TextStyle(color: color, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}

class _ComplexView extends StatelessWidget {
  const _ComplexView({required this.complex});

  final Complex complex;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(complex.name ?? '단지명 미상', style: const TextStyle(fontWeight: AppFonts.bold, fontSize: 15)),
              if (complex.housingTypeLabel.isNotEmpty) Pill(text: complex.housingTypeLabel),
              if (complex.households != null)
                Text(formatHouseholds(complex.households), style: TextStyle(fontSize: 13, color: scheme.outline)),
            ],
          ),
          if (complex.address != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(complex.address!, style: TextStyle(fontSize: 13, color: scheme.outline)),
            ),
          if (complex.units.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 36,
                  dataRowMinHeight: 36,
                  dataRowMaxHeight: 40,
                  columnSpacing: 24,
                  columns: const [
                    DataColumn(label: Text('유형')),
                    DataColumn(label: Text('전용면적')),
                    DataColumn(label: Text('세대수'), numeric: true),
                    DataColumn(label: Text('보증금/분양가'), numeric: true),
                    DataColumn(label: Text('월 임대료'), numeric: true),
                  ],
                  rows: [
                    for (final unit in complex.units)
                      DataRow(
                        cells: [
                          DataCell(Text(unit.name ?? '-')),
                          DataCell(Text(formatArea(unit.exclusiveAreaM2))),
                          DataCell(Text(formatHouseholds(unit.households))),
                          DataCell(Text(formatWon(unit.deposit))),
                          DataCell(Text(formatWon(unit.monthlyRent))),
                        ],
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SourceRow extends StatelessWidget {
  const _SourceRow({required this.source});

  final NoticeSource source;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fetched = source.fetchedDate;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${source.sourceLabel}${fetched != null ? '  ·  수집 ${formatDate(fetched)}' : ''}',
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
          ),
          if (source.url != null)
            TextButton(onPressed: () => openExternal(context, source.url!), child: const Text('원문')),
        ],
      ),
    );
  }
}
