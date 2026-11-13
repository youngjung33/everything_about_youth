import '../applicant_profile.dart';
import '../living_filters.dart';
import '../living_repository.dart';
import '../living_guide.dart';

class LoadSimilarGuidesUseCase {
  const LoadSimilarGuidesUseCase(this._repository);

  final LivingRepository _repository;

  Future<List<GuideSummary>> call({
    required String excludeId,
    required String procedureTypeId,
    required ApplicantProfile profile,
  }) async {
    final page = await _repository.searchGuides(
      filters: LivingFilters(
        procedureTypeIds: {procedureTypeId},
        statuses: LivingFilters.defaultStatuses,
        sort: 'deadline',
      ),
      profile: profile,
      pageSize: 15,
    );
    return page.items.where((n) => n.id != excludeId).take(5).toList();
  }
}
