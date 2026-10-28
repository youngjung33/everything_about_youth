import '../housing_meta.dart';
import '../housing_repository.dart';

class LoadHousingMetaUseCase {
  const LoadHousingMetaUseCase(this._repository);

  final HousingRepository _repository;

  Future<HousingMeta> call() => _repository.fetchMeta();
}
