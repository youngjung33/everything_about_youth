import '../applicant_profile.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';

class GetSchemeDetailUseCase {
  const GetSchemeDetailUseCase(this._repository);

  final FinanceRepository _repository;

  Future<SchemeDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getScheme(id, profile: profile);
}
