import '../../../core/notifications/deadline_notification_service.dart';
import '../domain/living_guide.dart';
import '../domain/repositories/saved_guide_reminder_prefs_store.dart';

Future<void> applySavedGuideReminders({
  required SavedGuideReminderPrefsStore prefs,
  required DeadlineNotificationService service,
  required SavedGuideList list,
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
