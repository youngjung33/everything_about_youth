import '../applicant_profile.dart';
import '../failures.dart';
import '../finance_filters.dart';
import '../finance_scheme.dart';
import '../scheme_list_state.dart';
import 'search_schemes.dart';

/// 목록 1페이지·추가 페이지·늦은 응답 무시를 domain 에서 처리한다.
class PaginatedSchemeListUseCase {
  PaginatedSchemeListUseCase(this._search);

  final SearchSchemesUseCase _search;

  int _queryGeneration = 0;

  int get queryGeneration => _queryGeneration;

  Future<SchemeListState> loadFirstPage({
    required FinanceFilters filters,
    required ApplicantProfile profile,
  }) async {
    _queryGeneration++;
    final page = await _search(filters: filters, profile: profile);
    return SchemeListState.fromPage(page);
  }

  Future<SchemeListLoadMoreOutcome> loadNextPage({
    required int capturedGeneration,
    required SchemeListState current,
    required FinanceFilters filters,
    required ApplicantProfile profile,
  }) async {
    if (!_isGeneration(capturedGeneration)) return const SchemeListLoadMoreOutcome.stale();
    if (!current.hasMore) return const SchemeListLoadMoreOutcome.stale();

    try {
      final next = await _search(
        filters: filters,
        profile: profile,
        page: current.page + 1,
      );
      if (!_isGeneration(capturedGeneration)) return const SchemeListLoadMoreOutcome.stale();
      return SchemeListLoadMoreOutcome.success(SchemeListState.merged(current, next));
    } catch (error) {
      if (!_isGeneration(capturedGeneration)) return const SchemeListLoadMoreOutcome.stale();
      return SchemeListLoadMoreOutcome.error(financeErrorMessage(error));
    }
  }

  bool _isGeneration(int token) => token == _queryGeneration;
}
