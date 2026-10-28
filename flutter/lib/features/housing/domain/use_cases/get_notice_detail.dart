import '../applicant_profile.dart';
import '../housing_repository.dart';
import '../notice.dart';

class GetNoticeDetailUseCase {
  const GetNoticeDetailUseCase(this._repository);

  final HousingRepository _repository;

  Future<NoticeDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getNotice(id, profile: profile);
}
