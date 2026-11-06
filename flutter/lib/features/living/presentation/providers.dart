import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/living_filters.dart';
import '../domain/living_meta.dart';
import '../domain/living_guide.dart';
import '../domain/guide_list_state.dart';
import '../living_container.dart';

/// 임대주택 **유일한 조립 Provider**. data·use case 는 [LivingContainer] 에만 있다.
final livingContainerProvider = Provider<LivingContainer>(
  (ref) => LivingContainer.live(
    apiClient: ref.watch(apiClientProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    cipher: ref.watch(fieldCipherProvider),
  ),
);

LivingContainer _container(Ref ref) => ref.watch(livingContainerProvider);

final livingMetaProvider = FutureProvider<LivingMeta>((ref) => _container(ref).loadLivingMeta());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(livingContainerProvider).profileLocalStore;
    if (!store.isLoaded) {
      ref.read(livingContainerProvider).loadProfile().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(livingContainerProvider).saveProfile(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

class FiltersNotifier extends Notifier<LivingFilters> {
  @override
  LivingFilters build() => LivingFilters.initial;

  void apply(LivingFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = LivingFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, LivingFilters>(FiltersNotifier.new);

class GuideListController extends AsyncNotifier<GuideListState> {
  @override
  Future<GuideListState> build() async {
    final list = _container(ref).paginatedGuideList;
    return list.loadFirstPage(
      filters: ref.watch(filtersProvider),
      profile: ref.watch(profileProvider),
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final list = ref.read(livingContainerProvider).paginatedGuideList;
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

final guideListProvider = AsyncNotifierProvider<GuideListController, GuideListState>(GuideListController.new);

final guideDetailProvider = FutureProvider.family<GuideDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return _container(ref).getGuideDetail(id, profile: profile);
});

class SavedGuidesNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return _container(ref).resolveSavedGuideIds(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(livingContainerProvider).toggleSavedGuide(
      id: id,
      isMember: mode.isMember,
      currentIds: ids,
    );
    if (result.error != null) return result.error;
    state = AsyncData(result.ids!);
    ref.invalidate(savedGuideListProvider);
    return null;
  }
}

final savedGuidesProvider = AsyncNotifierProvider<SavedGuidesNotifier, List<String>>(SavedGuidesNotifier.new);

final livingScheduleGuidesProvider = FutureProvider<({String today, List<GuideSummary> items})>(
  (ref) => _container(ref).loadScheduleGuides(profile: ref.watch(profileProvider)),
);

final similarGuidesProvider = FutureProvider.family<List<GuideSummary>, String>((ref, id) async {
  final detail = await ref.watch(guideDetailProvider(id).future);
  return _container(ref).loadSimilarGuides(
    excludeId: id,
    procedureTypeId: detail.summary.procedureTypeId,
    profile: ref.watch(profileProvider),
  );
});

final savedGuideListProvider = FutureProvider<SavedGuideList>((ref) async {
  final ids = await ref.watch(savedGuidesProvider.future);
  return _container(ref).loadSavedGuideSummaries(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) {
  if (error is ApiException) return apiExceptionUserMessage(error);
  return livingErrorMessage(error);
}
