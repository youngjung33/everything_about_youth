import '../applicant_profile.dart';
import '../living_filters.dart';
import '../living_repository.dart';
import '../living_guide.dart';

class SearchGuidesUseCase {
  const SearchGuidesUseCase(this._repository);

  final LivingRepository _repository;

  Future<GuidePage> call({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchGuides(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
