import '../../../core/notifications/deadline_notification_service.dart';
import '../domain/benefit_program.dart';
import '../domain/repositories/saved_program_reminder_prefs_store.dart';

Future<void> applySavedProgramReminders({
  required SavedProgramReminderPrefsStore prefs,
  required DeadlineNotificationService service,
  required SavedProgramList list,
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
