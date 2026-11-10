import '../applicant_profile.dart';
import '../failures.dart';
import '../living_filters.dart';
import '../guide_list_state.dart';
import 'search_schemes.dart';

/// 목록 1페이지·추가 페이지·늦은 응답 무시를 domain 에서 처리한다.
class PaginatedGuideListUseCase {
  PaginatedGuideListUseCase(this._search);

  final SearchGuidesUseCase _search;

  int _queryGeneration = 0;

  int get queryGeneration => _queryGeneration;

  Future<GuideListState> loadFirstPage({
    required LivingFilters filters,
    required ApplicantProfile profile,
  }) async {
    _queryGeneration++;
    final page = await _search(filters: filters, profile: profile);
    return GuideListState.fromPage(page);
  }

  Future<GuideListLoadMoreOutcome> loadNextPage({
    required int capturedGeneration,
    required GuideListState current,
    required LivingFilters filters,
    required ApplicantProfile profile,
  }) async {
    if (!_isGeneration(capturedGeneration)) return const GuideListLoadMoreOutcome.stale();
    if (!current.hasMore) return const GuideListLoadMoreOutcome.stale();

    try {
      final next = await _search(
        filters: filters,
        profile: profile,
        page: current.page + 1,
      );
      if (!_isGeneration(capturedGeneration)) return const GuideListLoadMoreOutcome.stale();
      return GuideListLoadMoreOutcome.success(GuideListState.merged(current, next));
    } catch (error) {
      if (!_isGeneration(capturedGeneration)) return const GuideListLoadMoreOutcome.stale();
      return GuideListLoadMoreOutcome.error(livingErrorMessage(error));
    }
  }

  bool _isGeneration(int token) => token == _queryGeneration;
}
