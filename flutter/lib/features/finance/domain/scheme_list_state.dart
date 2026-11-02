import 'finance_scheme.dart';

/// 무한 스크롤 목록 상태. domain use case 가 조합한다.
class SchemeListState {
  const SchemeListState({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.today,
    this.loadingMore = false,
    this.loadMoreError,
  });

  factory SchemeListState.fromPage(SchemePage page) => SchemeListState(
    items: page.items,
    total: page.total,
    page: page.page,
    totalPages: page.totalPages,
    today: page.today,
  );

  final List<SchemeSummary> items;
  final int total;
  final int page;
  final int totalPages;
  final String today;
  final bool loadingMore;
  final String? loadMoreError;

  bool get hasMore => page < totalPages;

  SchemeListState copyWith({
    List<SchemeSummary>? items,
    int? total,
    int? page,
    int? totalPages,
    bool? loadingMore,
    String? loadMoreError,
    bool clearError = false,
  }) {
    return SchemeListState(
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
  static SchemeListState merged(SchemeListState current, SchemePage next) {
    final seen = current.items.map((e) => e.id).toSet();
    return SchemeListState(
      items: [...current.items, ...next.items.where((e) => !seen.contains(e.id))],
      total: next.total,
      page: next.page,
      totalPages: next.totalPages,
      today: next.today,
    );
  }
}

/// [PaginatedSchemeListUseCase.loadNextPage] 결과.
class SchemeListLoadMoreOutcome {
  const SchemeListLoadMoreOutcome._({this.state, this.loadMoreError, this.stale = false});

  const SchemeListLoadMoreOutcome.stale() : this._(stale: true);

  const SchemeListLoadMoreOutcome.success(SchemeListState state) : this._(state: state);

  const SchemeListLoadMoreOutcome.error(String message) : this._(loadMoreError: message);

  final SchemeListState? state;
  final String? loadMoreError;
  final bool stale;
}
