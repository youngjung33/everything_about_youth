import '../applicant_profile.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';

class GetPostingDetailUseCase {
  const GetPostingDetailUseCase(this._repository);

  final JobsRepository _repository;

  Future<PostingDetail> call(String id, {required ApplicantProfile profile}) =>
      _repository.getPosting(id, profile: profile);
}
