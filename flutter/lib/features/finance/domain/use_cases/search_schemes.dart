import '../applicant_profile.dart';
import '../finance_filters.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';

/// 필터·프로필로 금융·주거 상품 목록을 검색한다.
class SearchSchemesUseCase {
  const SearchSchemesUseCase(this._repository);

  final FinanceRepository _repository; // domain 저장소 포트

  Future<SchemePage> call({
    required FinanceFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchSchemes(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
