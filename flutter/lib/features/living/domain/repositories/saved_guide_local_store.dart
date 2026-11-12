/// 비회원 관심 안내 id 기기 저장 포트. 구현은 [data] 레이어.
abstract interface class SavedGuideLocalStore {
  static const maxCount = 100;

  List<String> get current;
  bool get isLoaded;

  Future<List<String>> load();
  Future<void> replace(List<String> ids);
}
