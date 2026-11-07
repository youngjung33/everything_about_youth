import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:everything_about_youth/features/jobs/domain/posting_schedule.dart';
import 'package:flutter_test/flutter_test.dart';

PostingSummary _program({required String id, String? start, String? end}) => PostingSummary(
  id: id,
  title: id,
  organization: '서울시',
  hireTypeId: 'housing',
  categoryLabel: '주거',
  tags: const [],
  status: PostingStatus.open,
  statusLabel: '신청중',
  regionLabel: '서울',
  regions: const [],
  sourceLabels: const [],
  applicationStart: start,
  applicationEnd: end,
);

void main() {
  test('이번 주 접수 마감·시작을 날짜순으로 모은다', () {
    final events = buildPostingSchedule(
      today: '2026-10-12',
      mode: ScheduleRangeMode.week,
      notices: [
        _program(id: 'a', end: '2026-10-14'),
        _program(id: 'b', start: '2026-10-12'),
      ],
    );
    expect(events, hasLength(2));
    expect(events.first.date, '2026-10-12');
    expect(events.first.kind, ScheduleEventKind.applicationStart);
    expect(events.last.kind, ScheduleEventKind.applicationEnd);
  });

  test('범위 밖 날짜는 제외한다', () {
    final events = buildPostingSchedule(
      today: '2026-10-12',
      mode: ScheduleRangeMode.week,
      notices: [_program(id: 'a', end: '2026-10-25')],
    );
    expect(events, isEmpty);
  });
}
