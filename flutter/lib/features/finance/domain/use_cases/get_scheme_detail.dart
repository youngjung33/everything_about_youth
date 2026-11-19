import '../applicant_profile.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';

/// 금융·주거 상품 상세를 조회한다.
class GetSchemeDetailUseCase {
  const GetSchemeDetailUseCase(this._repository);

  final FinanceRepository _repository; // domain 저장소 포트

  Future<SchemeDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getScheme(id, profile: profile);
}
