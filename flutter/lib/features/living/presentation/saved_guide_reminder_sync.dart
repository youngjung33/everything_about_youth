import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import 'providers.dart';
import 'saved_guide_reminder_logic.dart';

final livingDeadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

Future<void> syncSavedGuideRemindersBootstrap(Ref ref) async {
  final list = await ref.read(savedGuideListProvider.future);
  await applySavedGuideReminders(
    prefs: ref.read(livingContainerProvider).reminderPrefs,
    service: ref.read(livingDeadlineNotificationServiceProvider),
    list: list,
  );
}

Future<void> syncSavedGuideReminders(WidgetRef ref) async {
  final list = await ref.read(savedGuideListProvider.future);
  await applySavedGuideReminders(
    prefs: ref.read(livingContainerProvider).reminderPrefs,
    service: ref.read(livingDeadlineNotificationServiceProvider),
    list: list,
  );
}
