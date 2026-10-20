import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../data/api_housing_repository.dart';
import '../data/profile_store.dart';
import '../domain/applicant_profile.dart';
import '../domain/housing_filters.dart';
import '../domain/housing_meta.dart';
import '../domain/housing_repository.dart';
import '../domain/notice.dart';

// ---------------------------------------------------------------------------
// 의존성 (main.dart 또는 테스트에서 override)
// ---------------------------------------------------------------------------

final housingRepositoryProvider = Provider<HousingRepository>(
  (ref) => ApiHousingRepository(ref.watch(apiClientProvider)),
);

final profileStoreProvider = Provider<ProfileStore>(
  (ref) => ProfileStore(ref.watch(sharedPreferencesProvider), ref.watch(fieldCipherProvider)),
);

// ---------------------------------------------------------------------------
// 상태
// ---------------------------------------------------------------------------

/// 필터 선택지와 라벨 (서버 제공)
final housingMetaProvider = FutureProvider<HousingMeta>((ref) => ref.watch(housingRepositoryProvider).fetchMeta());

/// '내 조건'. 바뀌면 목록/상세 판정이 다시 조회된다.
class ProfileNotifier extends Notifier<ApplicantProfile> {
  /// 사용자가 이미 저장했는가. 그렇다면 늦게 도착한 복호화 결과로 덮어쓰지 않는다.
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(profileStoreProvider);
    if (!store.isLoaded) {
      // 보통은 시작 작업이 미리 읽어 두어 여기 오지 않는다. 혹시 먼저 불렸다면 읽고 나서 반영한다.
      store.load().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(profileStoreProvider).save(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

/// 목록 검색 조건. 바뀌면 목록이 1페이지부터 다시 조회된다.
class FiltersNotifier extends Notifier<HousingFilters> {
  @override
  HousingFilters build() => HousingFilters.initial;

  void apply(HousingFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = HousingFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, HousingFilters>(FiltersNotifier.new);

/// 지금까지 불러온 목록 (무한 스크롤)
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

  /// 다음 페이지 불러오기 실패 메시지 (목록 자체는 유지)
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

  /// 다음 페이지를 이어 붙인다. 목록이 바뀌어 페이지 경계가 밀린 경우의 중복은 id 로 제거한다.
  NoticeListState appended(NoticePage next) {
    final seen = items.map((e) => e.id).toSet();
    return NoticeListState(
      items: [...items, ...next.items.where((e) => !seen.contains(e.id))],
      total: next.total,
      page: next.page,
      totalPages: next.totalPages,
      today: next.today,
    );
  }
}

class NoticeListController extends AsyncNotifier<NoticeListState> {
  /// 조건이 바뀌어 build 가 다시 실행되면 증가한다. 이전 조건의 늦은 응답을 버리는 데 쓴다.
  int _generation = 0;

  @override
  Future<NoticeListState> build() async {
    _generation++;
    final filters = ref.watch(filtersProvider);
    final profile = ref.watch(profileProvider);
    final page = await ref.watch(housingRepositoryProvider).searchNotices(filters: filters, profile: profile);
    return NoticeListState.fromPage(page);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final generation = _generation;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final next = await ref
          .read(housingRepositoryProvider)
          .searchNotices(
            filters: ref.read(filtersProvider),
            profile: ref.read(profileProvider),
            page: current.page + 1,
          );
      if (generation != _generation) return;
      state = AsyncData(current.appended(next));
    } catch (error) {
      if (generation != _generation) return;
      state = AsyncData(current.copyWith(loadingMore: false, loadMoreError: errorMessage(error)));
    }
  }
}

final noticeListProvider = AsyncNotifierProvider<NoticeListController, NoticeListState>(NoticeListController.new);

/// 공고 상세. '내 조건'이 바뀌면 판정이 다시 계산된다.
final noticeDetailProvider = FutureProvider.family<NoticeDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return ref.watch(housingRepositoryProvider).getNotice(id, profile: profile);
});

/// 사용자에게 보여줄 오류 문장
String errorMessage(Object error) {
  if (error is ApiException) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
