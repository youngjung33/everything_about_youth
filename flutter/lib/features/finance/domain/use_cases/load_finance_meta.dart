import '../finance_meta.dart';
import '../finance_repository.dart';

/// 필터 선택지·라벨 메타를 서버에서 불러온다.
class LoadFinanceMetaUseCase {
  const LoadFinanceMetaUseCase(this._repository);

  final FinanceRepository _repository; // domain 저장소 포트

  Future<FinanceMeta> call() => _repository.fetchMeta();
}
