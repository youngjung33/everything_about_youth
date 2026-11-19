import '../applicant_profile.dart';
import '../housing_filters.dart';
import '../housing_repository.dart';
import '../notice.dart';

/// 현재 공고와 비슷한 임대 공고 후보를 조회한다.
class LoadSimilarNoticesUseCase {
  const LoadSimilarNoticesUseCase(this._repository);

  final HousingRepository _repository; // domain 저장소 포트

  Future<List<NoticeSummary>> call({
    required String excludeId,
    required String supplyType,
    required ApplicantProfile profile,
  }) async {
    final page = await _repository.searchNotices(
      filters: HousingFilters(
        supplyTypes: {supplyType},
        statuses: HousingFilters.defaultStatuses,
        sort: 'deadline',
      ),
      profile: profile,
      pageSize: 15,
    );
    return page.items.where((n) => n.id != excludeId).take(5).toList();
  }
}
