import '../living_meta.dart';
import '../living_repository.dart';

/// 필터 선택지·라벨 메타를 서버에서 불러온다.
class LoadLivingMetaUseCase {
  const LoadLivingMetaUseCase(this._repository);

  final LivingRepository _repository; // domain 저장소 포트

  Future<LivingMeta> call() => _repository.fetchMeta();
}
