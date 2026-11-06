import 'living_guide.dart';

/// 무한 스크롤 목록 상태. domain use case 가 조합한다.
class GuideListState {
  const GuideListState({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.today,
    this.loadingMore = false,
    this.loadMoreError,
  });

  factory GuideListState.fromPage(GuidePage page) => GuideListState(
    items: page.items,
    total: page.total,
    page: page.page,
    totalPages: page.totalPages,
    today: page.today,
  );

  final List<GuideSummary> items;
  final int total;
  final int page;
  final int totalPages;
  final String today;
  final bool loadingMore;
  final String? loadMoreError;

  bool get hasMore => page < totalPages;

  GuideListState copyWith({
    List<GuideSummary>? items,
    int? total,
    int? page,
    int? totalPages,
    bool? loadingMore,
    String? loadMoreError,
    bool clearError = false,
  }) {
    return GuideListState(
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
  static GuideListState merged(GuideListState current, GuidePage next) {
    final seen = current.items.map((e) => e.id).toSet();
    return GuideListState(
      items: [...current.items, ...next.items.where((e) => !seen.contains(e.id))],
      total: next.total,
      page: next.page,
      totalPages: next.totalPages,
      today: next.today,
    );
  }
}

/// [PaginatedGuideListUseCase.loadNextPage] 결과.
class GuideListLoadMoreOutcome {
  const GuideListLoadMoreOutcome._({this.state, this.loadMoreError, this.stale = false});

  const GuideListLoadMoreOutcome.stale() : this._(stale: true);

  const GuideListLoadMoreOutcome.success(GuideListState state) : this._(state: state);

  const GuideListLoadMoreOutcome.error(String message) : this._(loadMoreError: message);

  final GuideListState? state;
  final String? loadMoreError;
  final bool stale;
}
