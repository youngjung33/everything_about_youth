import 'package:everything_about_youth/features/jobs/data/saved_posting_reminder_prefs.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('기본값은 켜짐', () async {
    final prefs = await SharedPreferences.getInstance();
    expect(SavedPostingReminderPrefs(prefs).enabled, isTrue);
  });

  test('setEnabled 로 끄고 켠다', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = SavedPostingReminderPrefs(prefs);
    await store.setEnabled(false);
    expect(store.enabled, isFalse);
    expect(prefs.getBool(SavedPostingReminderPrefs.key), isFalse);

    await store.setEnabled(true);
    expect(store.enabled, isTrue);
  });
}
