/// 관심 제도 로컬 알림 on/off (기기 저장). 구현은 [data].
abstract interface class SavedSchemeReminderPrefsStore {
  bool get enabled;

  Future<void> setEnabled(bool value);
}
