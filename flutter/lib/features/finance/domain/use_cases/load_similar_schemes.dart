import '../applicant_profile.dart';
import '../finance_filters.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';

class LoadSimilarSchemesUseCase {
  const LoadSimilarSchemesUseCase(this._repository);

  final FinanceRepository _repository;

  Future<List<SchemeSummary>> call({
    required String excludeId,
    required String productTypeId,
    required ApplicantProfile profile,
  }) async {
    final page = await _repository.searchSchemes(
      filters: FinanceFilters(
        productTypeIds: {productTypeId},
        statuses: FinanceFilters.defaultStatuses,
        sort: 'deadline',
      ),
      profile: profile,
      pageSize: 15,
    );
    return page.items.where((n) => n.id != excludeId).take(5).toList();
  }
}
