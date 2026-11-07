import '../applicant_profile.dart';
import '../jobs_filters.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';

class LoadSimilarPostingsUseCase {
  const LoadSimilarPostingsUseCase(this._repository);

  final JobsRepository _repository;

  Future<List<PostingSummary>> call({
    required String excludeId,
    required String hireTypeId,
    required ApplicantProfile profile,
  }) async {
    final page = await _repository.searchPostings(
      filters: JobsFilters(
        hireTypeIds: {hireTypeId},
        statuses: JobsFilters.defaultStatuses,
        sort: 'deadline',
      ),
      profile: profile,
      pageSize: 15,
    );
    return page.items.where((n) => n.id != excludeId).take(5).toList();
  }
}
