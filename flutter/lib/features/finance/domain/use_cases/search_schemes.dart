import '../applicant_profile.dart';
import '../finance_filters.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';

class SearchSchemesUseCase {
  const SearchSchemesUseCase(this._repository);

  final FinanceRepository _repository;

  Future<SchemePage> call({
    required FinanceFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchSchemes(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
