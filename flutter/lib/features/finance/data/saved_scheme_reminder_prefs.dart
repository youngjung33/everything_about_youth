import 'package:shared_preferences/shared_preferences.dart';

import '../domain/repositories/saved_scheme_reminder_prefs_store.dart';

/// 관심 제도 마감·접수 로컬 알림 켜짐 여부 (기본 켜짐, 웹에서는 사용하지 않음).
class SavedSchemeReminderPrefs implements SavedSchemeReminderPrefsStore {
  SavedSchemeReminderPrefs(this._prefs);

  static const key = 'finance.savedSchemeReminders.enabled';

  final SharedPreferences _prefs;

  @override
  bool get enabled => _prefs.getBool(key) ?? true;

  @override
  Future<void> setEnabled(bool value) => _prefs.setBool(key, value);
}
