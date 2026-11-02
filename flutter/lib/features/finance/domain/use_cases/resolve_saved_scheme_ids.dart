import '../finance_repository.dart';
import '../repositories/saved_scheme_local_store.dart';

/// 로그인 시 기기 id 를 서버 목록에 합친다.
class ResolveSavedSchemeIdsUseCase {
  const ResolveSavedSchemeIdsUseCase(this._repository, this._local);

  final FinanceRepository _repository;
  final SavedSchemeLocalStore _local;

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
