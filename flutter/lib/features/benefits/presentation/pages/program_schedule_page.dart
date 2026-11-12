import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/service_accent.dart';
import '../../../../core/format/format.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/theme/app_fonts.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/program_schedule.dart';
import '../benefits_routes.dart';
import '../widgets/program_card.dart';

class ProgramSchedulePage extends ConsumerStatefulWidget {
  const ProgramSchedulePage({super.key});

  @override
  ConsumerState<ProgramSchedulePage> createState() => _ProgramSchedulePageState();
}

class _ProgramSchedulePageState extends ConsumerState<ProgramSchedulePage> {
  ScheduleRangeMode _mode = ScheduleRangeMode.week;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(benefitsScheduleProgramsProvider);
    final textTheme = Theme.of(context).textTheme;

    return AppScaffold(
      appBar: AppTopBar(title: const Text('접수 일정')),
      body: async.when(
        loading: () => const LoadingView(message: '일정을 불러오는 중…'),
        error: (e, _) => ErrorView(
          message: errorMessage(e),
          onRetry: () => ref.invalidate(benefitsScheduleProgramsProvider),
        ),
        data: (data) {
          final events = buildProgramSchedule(today: data.today, mode: _mode, notices: data.items);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: SegmentedButton<ScheduleRangeMode>(
                  segments: const [
                    ButtonSegment(value: ScheduleRangeMode.week, label: Text('이번 주')),
                    ButtonSegment(value: ScheduleRangeMode.month, label: Text('이번 달')),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (next) => setState(() => _mode = next.first),
                ),
              ),
              if (events.isEmpty)
                Expanded(
                  child: EmptyView(
                    message: ServiceAccent.benefits.scheduleEmptyMessage,
                    hint: ServiceAccent.benefits.scheduleEmptyHint,
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: events.length,
                    itemBuilder: (context, index) {
                      final event = events[index];
                      final showDateHeader = index == 0 || events[index - 1].date != event.date;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showDateHeader) ...[
                            if (index > 0) const SizedBox(height: 12),
                            Text(
                              formatDate(event.date),
                              style: textTheme.titleSmall?.copyWith(fontWeight: AppFonts.bold),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 88,
                                child: Text(
                                  event.kindLabel,
                                  style: textTheme.labelLarge?.copyWith(
                                    color: Theme.of(context).colorScheme.primary,
                                    fontWeight: AppFonts.bold,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: ProgramCard(
                                  program: event.notice,
                                  onTap: () => context.push(BenefitsRoutes.program(event.notice.id)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                        ],
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
