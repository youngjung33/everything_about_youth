import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import '../../../core/providers/core_providers.dart';
import 'providers.dart';
import 'saved_program_reminder_logic.dart';

Future<void> syncSavedProgramRemindersBootstrap(Ref ref) async {
  final list = await ref.read(savedProgramListProvider.future);
  await applySavedProgramReminders(
    prefs: ref.read(benefitsContainerProvider).reminderPrefs,
    service: ref.read(deadlineNotificationServiceProvider),
    list: list,
  );
}

Future<void> syncSavedProgramReminders(WidgetRef ref) async {
  final list = await ref.read(savedProgramListProvider.future);
  await applySavedProgramReminders(
    prefs: ref.read(benefitsContainerProvider).reminderPrefs,
    service: ref.read(deadlineNotificationServiceProvider),
    list: list,
  );
}
