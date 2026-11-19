import '../benefit_meta.dart';
import '../benefits_repository.dart';

/// LoadBenefitMetaUseCase
class LoadBenefitMetaUseCase {
  const LoadBenefitMetaUseCase(this._repository);

  final BenefitsRepository _repository; // domain 저장소 포트

  Future<BenefitMeta> call() => _repository.fetchMeta();
}
