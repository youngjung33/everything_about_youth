import '../living_meta.dart';
import '../living_repository.dart';

class LoadLivingMetaUseCase {
  const LoadLivingMetaUseCase(this._repository);

  final LivingRepository _repository;

  Future<LivingMeta> call() => _repository.fetchMeta();
}
