import '../applicant_profile.dart';
import '../living_repository.dart';
import '../living_guide.dart';

class GetGuideDetailUseCase {
  const GetGuideDetailUseCase(this._repository);

  final LivingRepository _repository;

  Future<GuideDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getGuide(id, profile: profile);
}
