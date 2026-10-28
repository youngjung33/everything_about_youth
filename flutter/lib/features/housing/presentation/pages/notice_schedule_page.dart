import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/format.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/theme/app_fonts.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/notice_schedule.dart';
import '../housing_routes.dart';
import '../widgets/notice_card.dart';

class NoticeSchedulePage extends ConsumerStatefulWidget {
  const NoticeSchedulePage({super.key});

  @override
  ConsumerState<NoticeSchedulePage> createState() => _NoticeSchedulePageState();
}

class _NoticeSchedulePageState extends ConsumerState<NoticeSchedulePage> {
  ScheduleRangeMode _mode = ScheduleRangeMode.week;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(housingScheduleNoticesProvider);
    final textTheme = Theme.of(context).textTheme;

    return AppScaffold(
      appBar: AppTopBar(title: const Text('접수 일정')),
      body: async.when(
        loading: () => const LoadingView(message: '일정을 불러오는 중…'),
        error: (e, _) => ErrorView(
          message: errorMessage(e),
          onRetry: () => ref.invalidate(housingScheduleNoticesProvider),
        ),
        data: (data) {
          final events = buildNoticeSchedule(today: data.today, mode: _mode, notices: data.items);
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
                const Expanded(
                  child: EmptyView(
                    message: '이 기간에 접수 시작·마감이 있는 공고가 없습니다.',
                    hint: '필터를 넓히거나 나중에 다시 확인해 보세요.',
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
                                child: NoticeCard(
                                  notice: event.notice,
                                  onTap: () => context.push(HousingRoutes.notice(event.notice.id)),
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
