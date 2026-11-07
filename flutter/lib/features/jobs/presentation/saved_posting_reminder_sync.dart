import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import 'providers.dart';
import 'saved_posting_reminder_logic.dart';

final jobsDeadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

Future<void> syncSavedPostingRemindersBootstrap(Ref ref) async {
  final list = await ref.read(savedPostingListProvider.future);
  await applySavedPostingReminders(
    prefs: ref.read(jobsContainerProvider).reminderPrefs,
    service: ref.read(jobsDeadlineNotificationServiceProvider),
    list: list,
  );
}

Future<void> syncSavedPostingReminders(WidgetRef ref) async {
  final list = await ref.read(savedPostingListProvider.future);
  await applySavedPostingReminders(
    prefs: ref.read(jobsContainerProvider).reminderPrefs,
    service: ref.read(jobsDeadlineNotificationServiceProvider),
    list: list,
  );
}
