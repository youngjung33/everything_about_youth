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
import '../../../../core/widgets/detail_primary_actions.dart';
import '../../../../core/design/service_accent.dart';
import '../../../../core/theme/app_fonts.dart';

const _accent = ServiceAccent.living;

class GuideDetailPage extends ConsumerWidget {
  const GuideDetailPage({super.key, required this.id});

  final String id;

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
            GuideBadges(guide: guide),
            const SizedBox(height: 8),
            CollectedSummary(summary: guide.summary),
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
