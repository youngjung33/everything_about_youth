import '../applicant_profile.dart';
import '../benefit_filters.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

class LoadSimilarProgramsUseCase {
  const LoadSimilarProgramsUseCase(this._repository);

  final BenefitsRepository _repository;

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
