import '../../../core/notifications/deadline_notification_service.dart';
import '../domain/notice.dart';
import '../domain/repositories/saved_notice_reminder_prefs_store.dart';

/// 관심 공고 로컬 알림 동기화 규칙 (presentation·테스트 공용).
Future<void> applySavedNoticeReminders({
  required SavedNoticeReminderPrefsStore prefs,
  required DeadlineNotificationService service,
  required SavedNoticeList list,
}) async {
  if (!prefs.enabled) {
    await service.cancelAll();
    return;
  }

  await service.requestPermission();

  final targets = [
    for (final item in list.items)
      SavedNoticeReminderTarget(
        id: item.id,
        title: item.title,
        applicationStart: item.applicationStart,
        applicationEnd: item.applicationEnd,
      ),
  ];
  await service.syncSavedNotices(targets);
}
