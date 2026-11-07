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
import '../../domain/job_posting.dart';
import '../widgets/posting_card.dart';
import '../widgets/eligibility_next_steps_card.dart';
import '../widgets/saved_posting_button.dart';
import '../../../../core/widgets/detail_primary_actions.dart';
import '../../../../core/theme/app_fonts.dart';

class PostingDetailPage extends ConsumerWidget {
  const PostingDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(programDetailProvider(id));

    return AppScaffold(
      appBar: AppTopBar(
        title: const Text('정책 상세'),
        actions: [SavedPostingButton(postingId: id, compact: false)],
      ),
      bottomBar: async.maybeWhen(
        data: (detail) {
          final posting = detail.summary;
          final actions = <Widget>[
            if (posting.url != null)
              OutlinedButton.icon(
                onPressed: () => openExternal(context, posting.url!),
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
        loading: () => const LoadingView(message: '정책 상세를 불러오는 중…'),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(programDetailProvider(id))),
        data: (detail) => _DetailBody(detail: detail),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});

  final PostingDetail detail;

  @override
  Widget build(BuildContext context) {
    final posting = detail.summary;
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(posting.title, style: textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
            const SizedBox(height: 10),
            PostingBadges(posting: posting, largeEligibility: true),
            const SizedBox(height: 8),
            CollectedSummary(summary: posting.summary),
            if (posting.eligibility != null) ...[
              const SizedBox(height: 16),
              _EligibilityCard(eligibility: posting.eligibility!),
            ],
            const SizedBox(height: 16),
            EligibilityNextStepsSection(detail: detail),
            const SizedBox(height: 16),
            _Section(
              title: '정책 개요',
              child: Wrap(
                spacing: 16,
                runSpacing: 14,
                children: [
                  MetaItem(label: '주관', value: posting.organization, width: 200),
                  MetaItem(label: '분야', value: posting.categoryLabel, width: 200),
                  MetaItem(label: '지역', value: posting.regionLabel, width: 200),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(posting.applicationStart, posting.applicationEnd),
                    width: 200,
                  ),
                  MetaItem(label: '공고일', value: formatDate(posting.announcementDate), width: 200),
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
              ServiceCopy.financeDetailVerificationFooter,
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorPosting.outline),
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

class _EligibilityCard extends StatelessWidget {
  const _EligibilityCard({required this.eligibility});

  final Eligibility eligibility;

  @override
  Widget build(BuildContext context) {
    final posting = Theme.of(context).colorPosting;
    return Card(
      color: posting.surfaceContainerHighest,
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
                Text(n, style: TextStyle(fontSize: 12, color: posting.outline)),
            ],
          ],
        ),
      ),
    );
  }
}

class _SourceRow extends StatelessWidget {
  const _SourceRow({required this.source});

  final PostingSource source;

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
