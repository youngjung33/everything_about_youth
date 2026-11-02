import '../../../core/notifications/deadline_notification_service.dart';
import '../domain/finance_scheme.dart';
import '../domain/repositories/saved_scheme_reminder_prefs_store.dart';

Future<void> applySavedSchemeReminders({
  required SavedSchemeReminderPrefsStore prefs,
  required DeadlineNotificationService service,
  required SavedSchemeList list,
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
