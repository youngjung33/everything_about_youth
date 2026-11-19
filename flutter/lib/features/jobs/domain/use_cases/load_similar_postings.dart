import '../applicant_profile.dart';
import '../jobs_filters.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';

/// 현재 공고와 비슷한 일자리 후보를 조회한다.
class LoadSimilarPostingsUseCase {
  const LoadSimilarPostingsUseCase(this._repository);

  final JobsRepository _repository; // domain 저장소 포트

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
