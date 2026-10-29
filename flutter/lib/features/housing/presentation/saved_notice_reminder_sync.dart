import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import 'providers.dart';
import 'saved_notice_reminder_logic.dart';

final deadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

Future<void> syncSavedNoticeRemindersBootstrap(Ref ref) async {
  await applySavedNoticeReminders(
    prefs: ref.read(housingContainerProvider).reminderPrefs,
    service: ref.read(deadlineNotificationServiceProvider),
    list: await ref.read(savedNoticeListProvider.future),
  );
}

Future<void> syncSavedNoticeReminders(WidgetRef ref) async {
  await applySavedNoticeReminders(
    prefs: ref.read(housingContainerProvider).reminderPrefs,
    service: ref.read(deadlineNotificationServiceProvider),
    list: await ref.read(savedNoticeListProvider.future),
  );
}
