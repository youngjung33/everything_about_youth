import 'notice.dart';

/// 무한 스크롤 목록 상태. domain use case 가 조합한다.
class NoticeListState {
  const NoticeListState({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.today,
    this.loadingMore = false,
    this.loadMoreError,
  });

  factory NoticeListState.fromPage(NoticePage page) => NoticeListState(
    items: page.items,
    total: page.total,
    page: page.page,
    totalPages: page.totalPages,
    today: page.today,
  );

  final List<NoticeSummary> items;
  final int total;
  final int page;
  final int totalPages;
  final String today;
  final bool loadingMore;
  final String? loadMoreError;

  bool get hasMore => page < totalPages;

  NoticeListState copyWith({
    List<NoticeSummary>? items,
    int? total,
    int? page,
    int? totalPages,
    bool? loadingMore,
    String? loadMoreError,
    bool clearError = false,
  }) {
    return NoticeListState(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      today: today,
      loadingMore: loadingMore ?? this.loadingMore,
      loadMoreError: clearError ? null : (loadMoreError ?? this.loadMoreError),
    );
  }

  /// 다음 페이지를 이어 붙인다. id 중복은 제거한다.
  static NoticeListState merged(NoticeListState current, NoticePage next) {
    final seen = current.items.map((e) => e.id).toSet();
    return NoticeListState(
      items: [...current.items, ...next.items.where((e) => !seen.contains(e.id))],
      total: next.total,
      page: next.page,
      totalPages: next.totalPages,
      today: next.today,
    );
  }
}

/// [PaginatedNoticeListUseCase.loadNextPage] 결과.
class NoticeListLoadMoreOutcome {
  const NoticeListLoadMoreOutcome._({this.state, this.loadMoreError, this.stale = false});

  const NoticeListLoadMoreOutcome.stale() : this._(stale: true);

  const NoticeListLoadMoreOutcome.success(NoticeListState state) : this._(state: state);

  const NoticeListLoadMoreOutcome.error(String message) : this._(loadMoreError: message);

  final NoticeListState? state;
  final String? loadMoreError;
  final bool stale;
}
