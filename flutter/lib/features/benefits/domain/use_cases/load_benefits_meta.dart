import '../benefit_meta.dart';
import '../benefits_repository.dart';

class LoadBenefitMetaUseCase {
  const LoadBenefitMetaUseCase(this._repository);

  final BenefitsRepository _repository;

  Future<BenefitMeta> call() => _repository.fetchMeta();
}
