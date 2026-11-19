import '../applicant_profile.dart';
import '../housing_repository.dart';
import '../notice.dart';

/// 임대 공고 상세를 조회한다.
class GetNoticeDetailUseCase {
  const GetNoticeDetailUseCase(this._repository);

  final HousingRepository _repository; // domain 저장소 포트

  Future<NoticeDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getNotice(id, profile: profile);
}
