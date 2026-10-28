import '../applicant_profile.dart';
import '../housing_filters.dart';
import '../housing_repository.dart';
import '../notice.dart';

class SearchNoticesUseCase {
  const SearchNoticesUseCase(this._repository);

  final HousingRepository _repository;

  Future<NoticePage> call({
    required HousingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchNotices(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
