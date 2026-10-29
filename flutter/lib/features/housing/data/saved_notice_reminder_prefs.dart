import 'package:shared_preferences/shared_preferences.dart';

import '../domain/repositories/saved_notice_reminder_prefs_store.dart';

/// 관심 공고 마감·접수 로컬 알림 켜짐 여부 (기본 켜짐, 웹에서는 사용하지 않음).
class SavedNoticeReminderPrefs implements SavedNoticeReminderPrefsStore {
  SavedNoticeReminderPrefs(this._prefs);

  static const key = 'housing.savedNoticeReminders.enabled';

  final SharedPreferences _prefs;

  bool get enabled => _prefs.getBool(key) ?? true;

  Future<void> setEnabled(bool value) => _prefs.setBool(key, value);
}
