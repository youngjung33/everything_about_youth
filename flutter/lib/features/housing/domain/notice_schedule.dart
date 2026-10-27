import 'package:meta/meta.dart';

import 'notice.dart';

enum ScheduleEventKind { applicationStart, applicationEnd }

@immutable
class NoticeScheduleEvent {
  const NoticeScheduleEvent({
    required this.date,
    required this.kind,
    required this.notice,
  });

  final String date;
  final ScheduleEventKind kind;
  final NoticeSummary notice;

  String get kindLabel => switch (kind) {
    ScheduleEventKind.applicationStart => '접수 시작',
    ScheduleEventKind.applicationEnd => '접수 마감',
  };
}

enum ScheduleRangeMode { week, month }

/// [today] 는 서버 `YYYY-MM-DD`. [mode] 안의 접수 시작·마감 이벤트를 날짜순으로 모은다.
List<NoticeScheduleEvent> buildNoticeSchedule({
  required String today,
  required ScheduleRangeMode mode,
  required Iterable<NoticeSummary> notices,
}) {
  final anchor = _parseYmd(today);
  if (anchor == null) return const [];

  final (start, end) = switch (mode) {
    ScheduleRangeMode.week => (anchor, anchor.add(const Duration(days: 6))),
    ScheduleRangeMode.month => (_monthStart(anchor), _monthEnd(anchor)),
  };

  final events = <NoticeScheduleEvent>[];
  for (final notice in notices) {
    final startDate = _parseYmd(notice.applicationStart);
    if (startDate != null && !_isBefore(startDate, start) && !_isAfter(startDate, end)) {
      events.add(
        NoticeScheduleEvent(
          date: notice.applicationStart!,
          kind: ScheduleEventKind.applicationStart,
          notice: notice,
        ),
      );
    }
    final endDate = _parseYmd(notice.applicationEnd);
    if (endDate != null && !_isBefore(endDate, start) && !_isAfter(endDate, end)) {
      events.add(
        NoticeScheduleEvent(
          date: notice.applicationEnd!,
          kind: ScheduleEventKind.applicationEnd,
          notice: notice,
        ),
      );
    }
  }

  events.sort((a, b) {
    final byDate = a.date.compareTo(b.date);
    if (byDate != 0) return byDate;
    return a.kind.index.compareTo(b.kind.index);
  });
  return events;
}

DateTime? _parseYmd(String? value) {
  if (value == null || value.length < 10) return null;
  final y = int.tryParse(value.substring(0, 4));
  final m = int.tryParse(value.substring(5, 7));
  final d = int.tryParse(value.substring(8, 10));
  if (y == null || m == null || d == null) return null;
  return DateTime(y, m, d);
}

DateTime _monthStart(DateTime day) => DateTime(day.year, day.month);
DateTime _monthEnd(DateTime day) => DateTime(day.year, day.month + 1, 0);

bool _isBefore(DateTime a, DateTime b) => a.isBefore(b);
bool _isAfter(DateTime a, DateTime b) => a.isAfter(b);
