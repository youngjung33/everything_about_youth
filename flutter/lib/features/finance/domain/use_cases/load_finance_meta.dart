import '../finance_meta.dart';
import '../finance_repository.dart';

class LoadFinanceMetaUseCase {
  const LoadFinanceMetaUseCase(this._repository);

  final FinanceRepository _repository;

  Future<FinanceMeta> call() => _repository.fetchMeta();
}
