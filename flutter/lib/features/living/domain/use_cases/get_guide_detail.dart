import '../applicant_profile.dart';
import '../living_repository.dart';
import '../living_guide.dart';

/// 생활·이사 가이드 상세를 조회한다.
class GetGuideDetailUseCase {
  const GetGuideDetailUseCase(this._repository);

  final LivingRepository _repository; // domain 저장소 포트

  Future<GuideDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getGuide(id, profile: profile);
}
