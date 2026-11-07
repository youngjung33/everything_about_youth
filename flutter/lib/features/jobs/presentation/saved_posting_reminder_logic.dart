import '../../../core/notifications/deadline_notification_service.dart';
import '../domain/job_posting.dart';
import '../domain/repositories/saved_posting_reminder_prefs_store.dart';

Future<void> applySavedPostingReminders({
  required SavedPostingReminderPrefsStore prefs,
  required DeadlineNotificationService service,
  required SavedPostingList list,
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
