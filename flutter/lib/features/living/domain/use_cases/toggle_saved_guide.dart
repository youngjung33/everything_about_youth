import '../../../../core/design/service_accent.dart';
import '../failures.dart';
import '../living_repository.dart';
import '../repositories/saved_guide_local_store.dart';

/// 관심 안내 저장/해제. 성공 시 갱신된 id 목록, 실패 시 사용자 문구.
class ToggleSavedGuideUseCase {
  const ToggleSavedGuideUseCase(this._repository, this._local);

  final LivingRepository _repository;
  final SavedGuideLocalStore _local;

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
          await _repository.unsaveGuide(id);
        } on LivingUserMessage catch (e) {
          return (ids: null, error: e.message);
        }
      }
      ids.remove(id);
    } else {
      if (ids.length >= SavedGuideLocalStore.maxCount) {
        return (
          ids: null,
          error: ServiceAccent.living.savedMaxCountError(SavedGuideLocalStore.maxCount),
        );
      }
      if (isMember) {
        try {
          await _repository.saveGuide(id);
        } on LivingUserMessage catch (e) {
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
