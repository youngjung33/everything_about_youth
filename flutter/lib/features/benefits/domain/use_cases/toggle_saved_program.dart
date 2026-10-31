import '../failures.dart';
import '../benefits_repository.dart';
import '../repositories/saved_program_local_store.dart';

/// 관심 공고 저장/해제. 성공 시 갱신된 id 목록, 실패 시 사용자 문구.
class ToggleSavedProgramUseCase {
  const ToggleSavedProgramUseCase(this._repository, this._local);

  final BenefitsRepository _repository;
  final SavedProgramLocalStore _local;

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
          await _repository.unsaveProgram(id);
        } on BenefitsUserMessage catch (e) {
          return (ids: null, error: e.message);
        }
      }
      ids.remove(id);
    } else {
      if (ids.length >= SavedProgramLocalStore.maxCount) {
        return (ids: null, error: '관심 공고는 ${SavedProgramLocalStore.maxCount}개까지 저장할 수 있습니다.');
      }
      if (isMember) {
        try {
          await _repository.saveProgram(id);
        } on BenefitsUserMessage catch (e) {
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
