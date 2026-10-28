import '../housing_repository.dart';
import '../repositories/saved_notice_local_store.dart';

/// 로그인 시 기기 id 를 서버 목록에 합친다.
class ResolveSavedNoticeIdsUseCase {
  const ResolveSavedNoticeIdsUseCase(this._repository, this._local);

  final HousingRepository _repository;
  final SavedNoticeLocalStore _local;

  Future<List<String>> call({required bool isMember}) async {
    final local = await _local.load();
    if (!isMember) return local;
    if (local.isNotEmpty) {
      final merged = await _repository.mergeSaved(local);
      await _local.replace(const []);
      return merged;
    }
    return _repository.fetchSavedIds();
  }
}
