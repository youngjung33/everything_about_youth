import '../applicant_profile.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

/// 혜택 프로그램 상세를 조회한다.
class GetProgramDetailUseCase {
  const GetProgramDetailUseCase(this._repository);

  final BenefitsRepository _repository; // domain 저장소 포트

  Future<ProgramDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getProgram(id, profile: profile);
}
