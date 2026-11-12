/// 관심 안내 로컬 알림 on/off (기기 저장). 구현은 [data].
abstract interface class SavedGuideReminderPrefsStore {
  bool get enabled;

  Future<void> setEnabled(bool value);
}
