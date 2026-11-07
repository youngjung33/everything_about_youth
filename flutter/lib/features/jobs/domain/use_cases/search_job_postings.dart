import '../applicant_profile.dart';
import '../jobs_filters.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';

class SearchJobPostingsUseCase {
  const SearchJobPostingsUseCase(this._repository);

  final JobsRepository _repository;

  Future<PostingPage> call({
    required JobsFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchPostings(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
