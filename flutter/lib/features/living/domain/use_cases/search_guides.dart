import '../applicant_profile.dart';
import '../living_filters.dart';
import '../living_repository.dart';
import '../living_guide.dart';

/// 필터·프로필로 생활·이사 가이드 목록을 검색한다.
class SearchGuidesUseCase {
  const SearchGuidesUseCase(this._repository);

  final LivingRepository _repository; // domain 저장소 포트

  Future<GuidePage> call({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchGuides(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
