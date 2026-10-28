import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import '../../../core/providers/core_providers.dart';
import '../data/saved_notice_reminder_prefs.dart';
import '../domain/notice.dart';
import 'providers.dart';

final deadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

final savedNoticeReminderPrefsProvider = Provider<SavedNoticeReminderPrefs>(
  (ref) => SavedNoticeReminderPrefs(ref.watch(sharedPreferencesProvider)),
);

Future<void> syncSavedNoticeRemindersBootstrap(Ref ref) async {
  await _syncSavedNoticeReminders(
    prefs: ref.read(savedNoticeReminderPrefsProvider),
    service: ref.read(deadlineNotificationServiceProvider),
    list: await ref.read(savedNoticeListProvider.future),
  );
}

Future<void> syncSavedNoticeReminders(WidgetRef ref) async {
  await _syncSavedNoticeReminders(
    prefs: ref.read(savedNoticeReminderPrefsProvider),
    service: ref.read(deadlineNotificationServiceProvider),
    list: await ref.read(savedNoticeListProvider.future),
  );
}

Future<void> _syncSavedNoticeReminders({
  required SavedNoticeReminderPrefs prefs,
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
