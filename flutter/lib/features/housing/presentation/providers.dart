import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/core_providers.dart';
import '../data/api_housing_repository.dart';
import '../data/mapping_housing_repository.dart';
import '../data/profile_store.dart';
import '../data/saved_notice_store.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/housing_filters.dart';
import '../domain/housing_meta.dart';
import '../domain/housing_repository.dart';
import '../domain/notice.dart';
import '../domain/repositories/profile_local_store.dart';
import '../domain/repositories/saved_notice_local_store.dart';
import '../housing_container.dart';

// ---------------------------------------------------------------------------
// data (테스트에서 repository / store 를 override 할 수 있게 분리)
// ---------------------------------------------------------------------------

final housingRepositoryProvider = Provider<HousingRepository>(
  (ref) => MappingHousingRepository(ApiHousingRepository(ref.watch(apiClientProvider))),
);

final profileLocalStoreProvider = Provider<ProfileLocalStore>(
  (ref) => ProfileStore(ref.watch(sharedPreferencesProvider), ref.watch(fieldCipherProvider)),
);

final savedNoticeLocalStoreProvider = Provider<SavedNoticeLocalStore>(
  (ref) => SavedNoticeStore(ref.watch(sharedPreferencesProvider), ref.watch(fieldCipherProvider)),
);

/// domain use case 조립. 구현체는 [housing_container.dart].
final housingContainerProvider = Provider<HousingContainer>(
  (ref) => HousingContainer.fromStores(
    repository: ref.watch(housingRepositoryProvider),
    profileLocalStore: ref.watch(profileLocalStoreProvider),
    savedNoticeLocalStore: ref.watch(savedNoticeLocalStoreProvider),
  ),
);

final searchNoticesUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).searchNotices);

final getNoticeDetailUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).getNoticeDetail);

final loadHousingMetaUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).loadHousingMeta);

final loadScheduleNoticesUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).loadScheduleNotices);

final loadSimilarNoticesUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).loadSimilarNotices);

final resolveSavedNoticeIdsUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).resolveSavedNoticeIds);

final loadSavedNoticeSummariesUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).loadSavedNoticeSummaries);

final toggleSavedNoticeUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).toggleSavedNotice);

final loadProfileUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).loadProfile);

final saveProfileUseCaseProvider = Provider((ref) => ref.watch(housingContainerProvider).saveProfile);

// ---------------------------------------------------------------------------
// presentation 상태 (use case 호출만)
// ---------------------------------------------------------------------------

final housingMetaProvider = FutureProvider<HousingMeta>((ref) => ref.watch(loadHousingMetaUseCaseProvider)());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(profileLocalStoreProvider);
    if (!store.isLoaded) {
      ref.read(loadProfileUseCaseProvider)().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(saveProfileUseCaseProvider)(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

class FiltersNotifier extends Notifier<HousingFilters> {
  @override
  HousingFilters build() => HousingFilters.initial;

  void apply(HousingFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = HousingFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, HousingFilters>(FiltersNotifier.new);

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
  int _generation = 0;

  @override
  Future<NoticeListState> build() async {
    _generation++;
    final filters = ref.watch(filtersProvider);
    final profile = ref.watch(profileProvider);
    final page = await ref.watch(searchNoticesUseCaseProvider)(filters: filters, profile: profile);
    return NoticeListState.fromPage(page);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final generation = _generation;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final next = await ref.read(searchNoticesUseCaseProvider)(
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

final noticeDetailProvider = FutureProvider.family<NoticeDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return ref.watch(getNoticeDetailUseCaseProvider)(id, profile: profile);
});

class SavedNoticesNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return ref.watch(resolveSavedNoticeIdsUseCaseProvider)(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(toggleSavedNoticeUseCaseProvider)(
      id: id,
      isMember: mode.isMember,
      currentIds: ids,
    );
    if (result.error != null) return result.error;
    state = AsyncData(result.ids!);
    ref.invalidate(savedNoticeListProvider);
    return null;
  }
}

final savedNoticesProvider = AsyncNotifierProvider<SavedNoticesNotifier, List<String>>(SavedNoticesNotifier.new);

final housingScheduleNoticesProvider = FutureProvider<({String today, List<NoticeSummary> items})>(
  (ref) => ref.watch(loadScheduleNoticesUseCaseProvider)(profile: ref.watch(profileProvider)),
);

final similarNoticesProvider = FutureProvider.family<List<NoticeSummary>, String>((ref, id) async {
  final detail = await ref.watch(noticeDetailProvider(id).future);
  return ref.watch(loadSimilarNoticesUseCaseProvider)(
    excludeId: id,
    supplyType: detail.summary.supplyType,
    profile: ref.watch(profileProvider),
  );
});

final savedNoticeListProvider = FutureProvider<SavedNoticeList>((ref) async {
  final ids = await ref.watch(savedNoticesProvider.future);
  return ref.watch(loadSavedNoticeSummariesUseCaseProvider)(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) => housingErrorMessage(error);

@Deprecated('Use profileLocalStoreProvider')
final profileStoreProvider = profileLocalStoreProvider;

@Deprecated('Use savedNoticeLocalStoreProvider')
final savedNoticeStoreProvider = savedNoticeLocalStoreProvider;
