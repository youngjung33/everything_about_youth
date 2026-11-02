import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/notifications/deadline_notification_service.dart';
import 'providers.dart';
import 'saved_scheme_reminder_logic.dart';

final financeDeadlineNotificationServiceProvider = Provider<DeadlineNotificationService>((ref) {
  if (kIsWeb) return NoopDeadlineNotificationService();
  return LocalDeadlineNotificationService();
});

Future<void> syncSavedSchemeRemindersBootstrap(Ref ref) async {
  final list = await ref.read(savedSchemeListProvider.future);
  await applySavedSchemeReminders(
    prefs: ref.read(financeContainerProvider).reminderPrefs,
    service: ref.read(financeDeadlineNotificationServiceProvider),
    list: list,
  );
}

Future<void> syncSavedSchemeReminders(WidgetRef ref) async {
  final list = await ref.read(savedSchemeListProvider.future);
  await applySavedSchemeReminders(
    prefs: ref.read(financeContainerProvider).reminderPrefs,
    service: ref.read(financeDeadlineNotificationServiceProvider),
    list: list,
  );
}
