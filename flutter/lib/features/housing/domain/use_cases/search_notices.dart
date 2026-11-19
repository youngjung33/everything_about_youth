import '../applicant_profile.dart';
import '../housing_filters.dart';
import '../housing_repository.dart';
import '../notice.dart';

/// 필터·프로필로 임대 공고 목록을 검색한다.
class SearchNoticesUseCase {
  const SearchNoticesUseCase(this._repository);

  final HousingRepository _repository; // domain 저장소 포트

  Future<NoticePage> call({
    required HousingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchNotices(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
