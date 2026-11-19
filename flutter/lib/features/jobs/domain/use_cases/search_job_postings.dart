import '../applicant_profile.dart';
import '../jobs_filters.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';

/// 필터·프로필로 일자리 공고 목록을 검색한다.
class SearchJobPostingsUseCase {
  const SearchJobPostingsUseCase(this._repository);

  final JobsRepository _repository; // domain 저장소 포트

  Future<PostingPage> call({
    required JobsFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchPostings(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
