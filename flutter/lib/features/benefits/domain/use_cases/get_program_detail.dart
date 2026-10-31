import '../applicant_profile.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

class GetProgramDetailUseCase {
  const GetProgramDetailUseCase(this._repository);

  final BenefitsRepository _repository;

  Future<ProgramDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getProgram(id, profile: profile);
}
