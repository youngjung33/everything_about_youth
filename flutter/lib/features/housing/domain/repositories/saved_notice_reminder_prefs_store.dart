/// 관심 공고 로컬 알림 on/off (기기 저장). 구현은 [data].
abstract interface class SavedNoticeReminderPrefsStore {
  bool get enabled;

  Future<void> setEnabled(bool value);
}
