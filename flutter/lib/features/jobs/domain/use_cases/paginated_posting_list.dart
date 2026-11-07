import '../applicant_profile.dart';
import '../failures.dart';
import '../jobs_filters.dart';
import '../job_posting.dart';
import '../posting_list_state.dart';
import 'search_job_postings.dart';

/// 목록 1페이지·추가 페이지·늦은 응답 무시를 domain 에서 처리한다.
class PaginatedPostingListUseCase {
  PaginatedPostingListUseCase(this._search);

  final SearchJobPostingsUseCase _search;

  int _queryGeneration = 0;

  int get queryGeneration => _queryGeneration;

  Future<PostingListState> loadFirstPage({
    required JobsFilters filters,
    required ApplicantProfile profile,
  }) async {
    _queryGeneration++;
    final page = await _search(filters: filters, profile: profile);
    return PostingListState.fromPage(page);
  }

  Future<PostingListLoadMoreOutcome> loadNextPage({
    required int capturedGeneration,
    required PostingListState current,
    required JobsFilters filters,
    required ApplicantProfile profile,
  }) async {
    if (!_isGeneration(capturedGeneration)) return const PostingListLoadMoreOutcome.stale();
    if (!current.hasMore) return const PostingListLoadMoreOutcome.stale();

    try {
      final next = await _search(
        filters: filters,
        profile: profile,
        page: current.page + 1,
      );
      if (!_isGeneration(capturedGeneration)) return const PostingListLoadMoreOutcome.stale();
      return PostingListLoadMoreOutcome.success(PostingListState.merged(current, next));
    } catch (error) {
      if (!_isGeneration(capturedGeneration)) return const PostingListLoadMoreOutcome.stale();
      return PostingListLoadMoreOutcome.error(jobsErrorMessage(error));
    }
  }

  bool _isGeneration(int token) => token == _queryGeneration;
}
