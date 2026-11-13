import '../../../../core/design/service_accent.dart';
import '../failures.dart';
import '../jobs_repository.dart';
import '../repositories/saved_posting_local_store.dart';

/// 관심 채용 공고 저장/해제. 성공 시 갱신된 id 목록, 실패 시 사용자 문구.
class ToggleSavedPostingUseCase {
  const ToggleSavedPostingUseCase(this._repository, this._local);

  final JobsRepository _repository;
  final SavedPostingLocalStore _local;

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
          await _repository.unsavePosting(id);
        } on JobsUserMessage catch (e) {
          return (ids: null, error: e.message);
        }
      }
      ids.remove(id);
    } else {
      if (ids.length >= SavedPostingLocalStore.maxCount) {
        return (
          ids: null,
          error: ServiceAccent.jobs.savedMaxCountError(SavedPostingLocalStore.maxCount),
        );
      }
      if (isMember) {
        try {
          await _repository.savePosting(id);
        } on JobsUserMessage catch (e) {
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
