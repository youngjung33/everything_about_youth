import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/format.dart';
import '../../../../core/launch.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/benefit_program.dart';
import '../widgets/badges.dart';
import '../widgets/program_card.dart';
import '../widgets/eligibility_next_steps_card.dart';
import '../widgets/saved_program_button.dart';
import '../../../../core/theme/app_fonts.dart';

class ProgramDetailPage extends ConsumerWidget {
  const ProgramDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(programDetailProvider(id));

    return AppScaffold(
      appBar: AppTopBar(
        title: const Text('정책 상세'),
        actions: [SavedProgramButton(programId: id, compact: false)],
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

  final ProgramDetail detail;

  @override
  Widget build(BuildContext context) {
    final program = detail.summary;
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ProgramBadges(program: program, largeEligibility: true),
            const SizedBox(height: 12),
            Text(program.title, style: textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
            if (program.summary != null && program.summary!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(program.summary!, style: textTheme.bodyLarge),
            ],
            if (program.eligibility != null) ...[
              const SizedBox(height: 16),
              _EligibilityCard(eligibility: program.eligibility!),
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
                  MetaItem(label: '주관', value: program.organization, width: 200),
                  MetaItem(label: '분야', value: program.categoryLabel, width: 200),
                  MetaItem(label: '지역', value: program.regionLabel, width: 200),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(program.applicationStart, program.applicationEnd),
                    width: 200,
                  ),
                  MetaItem(label: '공고일', value: formatDate(program.announcementDate), width: 200),
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
            const SizedBox(height: 4),
            if (program.url != null)
              FilledButton.icon(
                onPressed: () => openExternal(context, program.url!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('원문 안내 보기'),
              ),
            if (detail.googleCalendarUrl != null) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => openExternal(context, detail.googleCalendarUrl!),
                icon: const Icon(Icons.event_outlined, size: 18),
                label: const Text('신청 마감일 캘린더에 넣기'),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              '이 정보는 공개 데이터와 각 기관 안내를 수집한 참고용입니다. 신청 전 반드시 원문을 확인하세요.',
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

  final ProgramSource source;

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
