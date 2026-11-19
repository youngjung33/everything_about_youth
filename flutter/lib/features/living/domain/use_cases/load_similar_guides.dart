import '../applicant_profile.dart';
import '../living_filters.dart';
import '../living_repository.dart';
import '../living_guide.dart';

/// 현재 가이드와 비슷한 생활·이사 후보를 조회한다.
class LoadSimilarGuidesUseCase {
  const LoadSimilarGuidesUseCase(this._repository);

  final LivingRepository _repository; // domain 저장소 포트

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
