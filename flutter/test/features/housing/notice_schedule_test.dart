import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:everything_about_youth/features/housing/domain/notice_schedule.dart';
import 'package:flutter_test/flutter_test.dart';

NoticeSummary _notice({required String id, String? start, String? end}) => NoticeSummary(
  id: id,
  title: id,
  organization: 'LH',
  supplyType: 'happy_housing',
  supplyTypeLabel: '행복주택',
  housingTypeLabels: const [],
  status: NoticeStatus.open,
  statusLabel: '접수중',
  regionLabel: '서울',
  regions: const [],
  sourceLabels: const [],
  applicationStart: start,
  applicationEnd: end,
);

void main() {
  test('이번 주 접수 마감·시작을 날짜순으로 모은다', () {
    final events = buildNoticeSchedule(
      today: '2026-10-12',
      mode: ScheduleRangeMode.week,
      notices: [
        _notice(id: 'a', end: '2026-10-14'),
        _notice(id: 'b', start: '2026-10-12'),
      ],
    );
    expect(events, hasLength(2));
    expect(events.first.date, '2026-10-12');
    expect(events.first.kind, ScheduleEventKind.applicationStart);
    expect(events.last.kind, ScheduleEventKind.applicationEnd);
  });

  test('범위 밖 날짜는 제외한다', () {
    final events = buildNoticeSchedule(
      today: '2026-10-12',
      mode: ScheduleRangeMode.week,
      notices: [_notice(id: 'a', end: '2026-10-25')],
    );
    expect(events, isEmpty);
  });
}
