import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/format/format.dart';
import '../../../../core/widgets/collected_summary.dart';
import '../../../../core/launch.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/living_guide.dart';
import '../widgets/guide_card.dart';
import '../widgets/saved_guide_button.dart';
import '../widgets/checklist_steps_section.dart';
import '../widgets/eligibility_next_steps_card.dart';
import '../../../../core/widgets/detail_primary_actions.dart';
import '../../../../core/design/service_accent.dart';
import '../../../../core/theme/app_fonts.dart';

const _accent = ServiceAccent.living;

/// GuideDetail 화면.
class GuideDetailPage extends ConsumerWidget {
  const GuideDetailPage({super.key, required this.id});

  final String id; // 항목 식별자

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(guideDetailProvider(id));

    return AppScaffold(
      appBar: AppTopBar(
        title: Text(_accent.detailAppBarTitle),
        actions: [SavedGuideButton(guideId: id, compact: false)],
      ),
      bottomBar: async.maybeWhen(
        data: (detail) {
          final guide = detail.summary;
          final actions = <Widget>[
            if (guide.url != null)
              OutlinedButton.icon(
                onPressed: () => openExternal(context, guide.url!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text(ServiceCopy.officialPolicyButtonLabel),
              ),
            if (detail.googleCalendarUrl != null)
              OutlinedButton.icon(
                onPressed: () => openExternal(context, detail.googleCalendarUrl!),
                icon: const Icon(Icons.event_outlined, size: 18),
                label: const Text('마감일 캘린더'),
              ),
          ];
          return actions.isEmpty ? null : DetailPrimaryActions(children: actions);
        },
        orElse: () => null,
      ),
      body: async.when(
        loading: () => LoadingView(message: _accent.detailLoadingMessage),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(guideDetailProvider(id))),
        data: (detail) => _DetailBody(detail: detail),
      ),
    );
  }
}

/// 상세 본문(설명·판정·액션) 영역.
class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});

  final GuideDetail detail;

  @override
  Widget build(BuildContext context) {
    final guide = detail.summary;
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(guide.title, style: textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
            const SizedBox(height: 10),
            GuideBadges(guide: guide, largeEligibility: true),
            const SizedBox(height: 8),
            CollectedSummary(summary: guide.summary),
            if (guide.eligibility != null) ...[
              const SizedBox(height: 16),
              _EligibilityCard(eligibility: guide.eligibility!),
            ],
            const SizedBox(height: 16),
            EligibilityNextStepsSection(detail: detail),
            const SizedBox(height: 16),
            ChecklistStepsSection(steps: detail.checklistSteps),
            const SizedBox(height: 16),
            _Section(
              title: '안내 개요',
              child: Wrap(
                spacing: 16,
                runSpacing: 14,
                children: [
                  MetaItem(label: '주관', value: guide.organization, width: 200),
                  MetaItem(label: '분야', value: guide.categoryLabel, width: 200),
                  MetaItem(label: '지역', value: guide.regionLabel, width: 200),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(guide.applicationStart, guide.applicationEnd),
                    width: 200,
                  ),
                  MetaItem(label: _accent.announcementDateLabel, value: formatDate(guide.announcementDate), width: 200),
                ],
              ),
            ),
            _Section(
              title: '출처',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [for (final source in detail.sources) _SourceRow(source: source)],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              ServiceCopy.detailVerificationFooter,
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline),
            ),
            const SizedBox(height: 24),
            const SizedBox(height: 72),
          ],
        ),
      ),
    );
  }
}

/// 자격 판정 요약 카드.
class _EligibilityCard extends StatelessWidget {
  const _EligibilityCard({required this.eligibility});

  final Eligibility eligibility;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(eligibility.verdictLabel, style: TextStyle(fontWeight: AppFonts.bold, fontSize: 16)),
            if (eligibility.reasons.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final r in eligibility.reasons) Text('· $r'),
            ],
            if (eligibility.notes.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final n in eligibility.notes)
                Text(n, style: TextStyle(fontSize: 12, color: scheme.outline)),
            ],
          ],
        ),
      ),
    );
  }
}

/// 화면 섹션 제목·구분.
class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

/// 출처·원문 링크 한 줄.
class _SourceRow extends StatelessWidget {
  const _SourceRow({required this.source});

  final GuideSource source;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(source.sourceLabel, style: const TextStyle(fontWeight: AppFonts.bold)),
          Text('수집: ${formatDate(source.fetchedDate)} · ${source.externalId}', style: const TextStyle(fontSize: 12)),
          if (source.url != null)
            TextButton(onPressed: () => openExternal(context, source.url!), child: const Text(ServiceCopy.sourceLinkLabel)),
        ],
      ),
    );
  }
}
