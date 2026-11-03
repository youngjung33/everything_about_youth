import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/format.dart';
import '../../../../core/launch.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/finance_scheme.dart';
import '../widgets/scheme_card.dart';
import '../widgets/eligibility_next_steps_card.dart';
import '../widgets/saved_scheme_button.dart';
import '../../../../core/widgets/detail_primary_actions.dart';
import '../../../../core/theme/app_fonts.dart';

class SchemeDetailPage extends ConsumerWidget {
  const SchemeDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(programDetailProvider(id));

    return AppScaffold(
      appBar: AppTopBar(
        title: const Text('정책 상세'),
        actions: [SavedSchemeButton(schemeId: id, compact: false)],
      ),
      bottomBar: async.maybeWhen(
        data: (detail) {
          final scheme = detail.summary;
          final actions = <Widget>[
            if (scheme.url != null)
              FilledButton.icon(
                onPressed: () => openExternal(context, scheme.url!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('원문 안내 보기'),
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

  final SchemeDetail detail;

  @override
  Widget build(BuildContext context) {
    final scheme = detail.summary;
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(scheme.title, style: textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
            const SizedBox(height: 10),
            SchemeBadges(scheme: scheme, largeEligibility: true),
            if (scheme.summary != null && scheme.summary!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(scheme.summary!, style: textTheme.bodyLarge),
            ],
            if (scheme.eligibility != null) ...[
              const SizedBox(height: 16),
              _EligibilityCard(eligibility: scheme.eligibility!),
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
                  MetaItem(label: '주관', value: scheme.organization, width: 200),
                  MetaItem(label: '분야', value: scheme.categoryLabel, width: 200),
                  MetaItem(label: '지역', value: scheme.regionLabel, width: 200),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(scheme.applicationStart, scheme.applicationEnd),
                    width: 200,
                  ),
                  MetaItem(label: '공고일', value: formatDate(scheme.announcementDate), width: 200),
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
              '이 정보는 공개 데이터와 각 기관 안내를 수집한 참고용입니다. 신청 전 반드시 원문을 확인하세요.',
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

class _SourceRow extends StatelessWidget {
  const _SourceRow({required this.source});

  final SchemeSource source;

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
            TextButton(onPressed: () => openExternal(context, source.url!), child: const Text('출처 링크')),
        ],
      ),
    );
  }
}
