import '../applicant_profile.dart';
import '../failures.dart';
import '../housing_filters.dart';
import '../notice.dart';
import '../notice_list_state.dart';
import 'search_notices.dart';

/// 목록 1페이지·추가 페이지·늦은 응답 무시를 domain 에서 처리한다.
class PaginatedNoticeListUseCase {
  PaginatedNoticeListUseCase(this._search);

  final SearchNoticesUseCase _search;

  int _queryGeneration = 0;

  int get queryGeneration => _queryGeneration;

  Future<NoticeListState> loadFirstPage({
    required HousingFilters filters,
    required ApplicantProfile profile,
  }) async {
    _queryGeneration++;
    final page = await _search(filters: filters, profile: profile);
    return NoticeListState.fromPage(page);
  }

  Future<NoticeListLoadMoreOutcome> loadNextPage({
    required int capturedGeneration,
    required NoticeListState current,
    required HousingFilters filters,
    required ApplicantProfile profile,
  }) async {
    if (!_isGeneration(capturedGeneration)) return const NoticeListLoadMoreOutcome.stale();
    if (!current.hasMore) return const NoticeListLoadMoreOutcome.stale();

    try {
      final next = await _search(
        filters: filters,
        profile: profile,
        page: current.page + 1,
      );
      if (!_isGeneration(capturedGeneration)) return const NoticeListLoadMoreOutcome.stale();
      return NoticeListLoadMoreOutcome.success(NoticeListState.merged(current, next));
    } catch (error) {
      if (!_isGeneration(capturedGeneration)) return const NoticeListLoadMoreOutcome.stale();
      return NoticeListLoadMoreOutcome.error(housingErrorMessage(error));
    }
  }

  bool _isGeneration(int token) => token == _queryGeneration;
}
