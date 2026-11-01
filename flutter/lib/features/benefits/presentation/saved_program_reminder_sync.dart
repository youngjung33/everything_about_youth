import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import 'providers.dart';
import 'saved_program_reminder_logic.dart';

final benefitsDeadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

Future<void> syncSavedProgramRemindersBootstrap(Ref ref) async {
  final list = await ref.read(savedProgramListProvider.future);
  await applySavedProgramReminders(
    prefs: ref.read(benefitsContainerProvider).reminderPrefs,
    service: ref.read(benefitsDeadlineNotificationServiceProvider),
    list: list,
  );
}

Future<void> syncSavedProgramReminders(WidgetRef ref) async {
  final list = await ref.read(savedProgramListProvider.future);
  await applySavedProgramReminders(
    prefs: ref.read(benefitsContainerProvider).reminderPrefs,
    service: ref.read(benefitsDeadlineNotificationServiceProvider),
    list: list,
  );
}
