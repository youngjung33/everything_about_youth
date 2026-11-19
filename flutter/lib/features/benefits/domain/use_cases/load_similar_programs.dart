import '../applicant_profile.dart';
import '../benefit_filters.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

/// 현재 프로그램과 비슷한 혜택 후보를 조회한다.
class LoadSimilarProgramsUseCase {
  const LoadSimilarProgramsUseCase(this._repository);

  final BenefitsRepository _repository; // domain 저장소 포트

  Future<List<ProgramSummary>> call({
    required String excludeId,
    required String categoryId,
    required ApplicantProfile profile,
  }) async {
    final page = await _repository.searchPrograms(
      filters: BenefitFilters(
        categoryIds: {categoryId},
        statuses: BenefitFilters.defaultStatuses,
        sort: 'deadline',
      ),
      profile: profile,
      pageSize: 15,
    );
    return page.items.where((n) => n.id != excludeId).take(5).toList();
  }
}
