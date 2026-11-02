import '../failures.dart';
import '../finance_repository.dart';
import '../repositories/saved_scheme_local_store.dart';

/// 관심 공고 저장/해제. 성공 시 갱신된 id 목록, 실패 시 사용자 문구.
class ToggleSavedSchemeUseCase {
  const ToggleSavedSchemeUseCase(this._repository, this._local);

  final FinanceRepository _repository;
  final SavedSchemeLocalStore _local;

  Future<({List<String>? ids, String? error})> call({
    required String id,
    required bool isMember,
    required List<String> currentIds,
  }) async {
    final ids = [...currentIds];
    final exists = ids.contains(id);
    if (exists) {
      if (isMember) {
        try {
          await _repository.unsaveScheme(id);
        } on FinanceUserMessage catch (e) {
          return (ids: null, error: e.message);
        }
      }
      ids.remove(id);
    } else {
      if (ids.length >= SavedSchemeLocalStore.maxCount) {
        return (ids: null, error: '관심 공고는 ${SavedSchemeLocalStore.maxCount}개까지 저장할 수 있습니다.');
      }
      if (isMember) {
        try {
          await _repository.saveScheme(id);
        } on FinanceUserMessage catch (e) {
          return (ids: null, error: e.message);
        }
      }
      ids.insert(0, id);
    }
    if (!isMember) {
      await _local.replace(ids);
    }
    return (ids: ids, error: null);
  }
}
