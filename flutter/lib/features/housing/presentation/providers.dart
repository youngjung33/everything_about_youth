import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/core_providers.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/housing_filters.dart';
import '../domain/housing_meta.dart';
import '../domain/notice.dart';
import '../domain/notice_list_state.dart';
import '../housing_container.dart';

/// 임대주택 **유일한 조립 Provider**. data·use case 는 [HousingContainer] 에만 있다.
final housingContainerProvider = Provider<HousingContainer>(
  (ref) => HousingContainer.live(
    apiClient: ref.watch(apiClientProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    cipher: ref.watch(fieldCipherProvider),
  ),
);

HousingContainer _container(Ref ref) => ref.watch(housingContainerProvider);

final housingMetaProvider = FutureProvider<HousingMeta>((ref) => _container(ref).loadHousingMeta());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(housingContainerProvider).profileLocalStore;
    if (!store.isLoaded) {
      ref.read(housingContainerProvider).loadProfile().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(housingContainerProvider).saveProfile(profile);
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

class NoticeListController extends AsyncNotifier<NoticeListState> {
  @override
  Future<NoticeListState> build() async {
    final list = _container(ref).paginatedNoticeList;
    return list.loadFirstPage(
      filters: ref.watch(filtersProvider),
      profile: ref.watch(profileProvider),
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final list = ref.read(housingContainerProvider).paginatedNoticeList;
    final generation = list.queryGeneration;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));

    final outcome = await list.loadNextPage(
      capturedGeneration: generation,
      current: current,
      filters: ref.read(filtersProvider),
      profile: ref.read(profileProvider),
    );
    if (outcome.stale) return;
    if (outcome.loadMoreError != null) {
      state = AsyncData(current.copyWith(loadingMore: false, loadMoreError: outcome.loadMoreError));
      return;
    }
    state = AsyncData(outcome.state!);
  }
}

final noticeListProvider = AsyncNotifierProvider<NoticeListController, NoticeListState>(NoticeListController.new);

final noticeDetailProvider = FutureProvider.family<NoticeDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return _container(ref).getNoticeDetail(id, profile: profile);
});

class SavedNoticesNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return _container(ref).resolveSavedNoticeIds(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(housingContainerProvider).toggleSavedNotice(
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
  (ref) => _container(ref).loadScheduleNotices(profile: ref.watch(profileProvider)),
);

final similarNoticesProvider = FutureProvider.family<List<NoticeSummary>, String>((ref, id) async {
  final detail = await ref.watch(noticeDetailProvider(id).future);
  return _container(ref).loadSimilarNotices(
    excludeId: id,
    supplyType: detail.summary.supplyType,
    profile: ref.watch(profileProvider),
  );
});

final savedNoticeListProvider = FutureProvider<SavedNoticeList>((ref) async {
  final ids = await ref.watch(savedNoticesProvider.future);
  return _container(ref).loadSavedNoticeSummaries(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) => housingErrorMessage(error);
