import '../housing_meta.dart';
import '../housing_repository.dart';

/// 필터 선택지·라벨 메타를 서버에서 불러온다.
class LoadHousingMetaUseCase {
  const LoadHousingMetaUseCase(this._repository);

  final HousingRepository _repository; // domain 저장소 포트

  Future<HousingMeta> call() => _repository.fetchMeta();
}
