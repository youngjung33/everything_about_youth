import 'package:everything_about_youth/core/notifications/deadline_notification_service.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:everything_about_youth/features/living/domain/repositories/saved_guide_reminder_prefs_store.dart';
import 'package:everything_about_youth/features/living/presentation/saved_guide_reminder_logic.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/living_fixtures.dart';

class FakeReminderPrefs implements SavedGuideReminderPrefsStore {
  FakeReminderPrefs({this.enabled = true});

  @override
  bool enabled;

  @override
  Future<void> setEnabled(bool value) async {
    enabled = value;
  }
}

class RecordingNotificationService implements DeadlineNotificationService {
  var cancelAllCalls = 0;
  var permissionCalls = 0;
  List<SavedNoticeReminderTarget> lastTargets = const [];

  @override
  Future<void> cancelAll() async => cancelAllCalls++;

  @override
  Future<void> initialize({void Function(String noticeId)? onOpenNotice}) async {}

  @override
  Future<bool> requestPermission() async {
    permissionCalls++;
    return true;
  }

  @override
  Future<void> syncSavedNotices(Iterable<SavedNoticeReminderTarget> targets) async {
    lastTargets = [...targets];
  }
}

SavedGuideList _list(List<String> ids) => SavedGuideList(
  items: [for (final id in ids) GuideSummary.fromJson(schemeSummaryJson(id: id))],
  total: ids.length,
  today: '2026-10-13',
);

void main() {
  test('알림이 꺼져 있으면 cancelAll 만 하고 sync 하지 않는다', () async {
    final prefs = FakeReminderPrefs(enabled: false);
    final service = RecordingNotificationService();
    await applySavedGuideReminders(prefs: prefs, service: service, list: _list(['b1']));
    expect(service.cancelAllCalls, 1);
    expect(service.permissionCalls, 0);
    expect(service.lastTargets, isEmpty);
  });

  test('켜져 있으면 권한을 요청하고 대상을 sync 한다', () async {
    final service = RecordingNotificationService();
    await applySavedGuideReminders(
      prefs: FakeReminderPrefs(),
      service: service,
      list: _list(['a', 'b']),
    );
    expect(service.cancelAllCalls, 0);
    expect(service.permissionCalls, 1);
    expect(service.lastTargets, hasLength(2));
    expect(service.lastTargets.first.id, 'a');
    expect(service.lastTargets.first.applicationStart, '2026-10-01');
    expect(service.lastTargets.first.applicationEnd, '2026-10-20');
  });

  test('관심 정책이 비어 있으면 빈 targets 로 sync 한다', () async {
    final service = RecordingNotificationService();
    await applySavedGuideReminders(
      prefs: FakeReminderPrefs(),
      service: service,
      list: const SavedGuideList(items: [], total: 0, today: ''),
    );
    expect(service.lastTargets, isEmpty);
    expect(service.permissionCalls, 1);
  });
}
