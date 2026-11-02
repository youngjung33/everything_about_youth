import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/finance_filters.dart';
import '../domain/finance_meta.dart';
import '../domain/finance_scheme.dart';
import '../domain/scheme_list_state.dart';
import '../finance_container.dart';

/// 임대주택 **유일한 조립 Provider**. data·use case 는 [FinanceContainer] 에만 있다.
final financeContainerProvider = Provider<FinanceContainer>(
  (ref) => FinanceContainer.live(
    apiClient: ref.watch(apiClientProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    cipher: ref.watch(fieldCipherProvider),
  ),
);

FinanceContainer _container(Ref ref) => ref.watch(financeContainerProvider);

final financeMetaProvider = FutureProvider<FinanceMeta>((ref) => _container(ref).loadFinanceMeta());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(financeContainerProvider).profileLocalStore;
    if (!store.isLoaded) {
      ref.read(financeContainerProvider).loadProfile().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(financeContainerProvider).saveProfile(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

class FiltersNotifier extends Notifier<FinanceFilters> {
  @override
  FinanceFilters build() => FinanceFilters.initial;

  void apply(FinanceFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = FinanceFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, FinanceFilters>(FiltersNotifier.new);

class SchemeListController extends AsyncNotifier<SchemeListState> {
  @override
  Future<SchemeListState> build() async {
    final list = _container(ref).paginatedSchemeList;
    return list.loadFirstPage(
      filters: ref.watch(filtersProvider),
      profile: ref.watch(profileProvider),
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final list = ref.read(financeContainerProvider).paginatedSchemeList;
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

final schemeListProvider = AsyncNotifierProvider<SchemeListController, SchemeListState>(SchemeListController.new);

final programDetailProvider = FutureProvider.family<SchemeDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return _container(ref).getSchemeDetail(id, profile: profile);
});

class SavedSchemesNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return _container(ref).resolveSavedSchemeIds(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(financeContainerProvider).toggleSavedScheme(
      id: id,
      isMember: mode.isMember,
      currentIds: ids,
    );
    if (result.error != null) return result.error;
    state = AsyncData(result.ids!);
    ref.invalidate(savedSchemeListProvider);
    return null;
  }
}

final savedSchemesProvider = AsyncNotifierProvider<SavedSchemesNotifier, List<String>>(SavedSchemesNotifier.new);

final financeScheduleSchemesProvider = FutureProvider<({String today, List<SchemeSummary> items})>(
  (ref) => _container(ref).loadScheduleSchemes(profile: ref.watch(profileProvider)),
);

final similarSchemesProvider = FutureProvider.family<List<SchemeSummary>, String>((ref, id) async {
  final detail = await ref.watch(programDetailProvider(id).future);
  return _container(ref).loadSimilarSchemes(
    excludeId: id,
    productTypeId: detail.summary.productTypeId,
    profile: ref.watch(profileProvider),
  );
});

final savedSchemeListProvider = FutureProvider<SavedSchemeList>((ref) async {
  final ids = await ref.watch(savedSchemesProvider.future);
  return _container(ref).loadSavedSchemeSummaries(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) {
  if (error is ApiException) return apiExceptionUserMessage(error);
  return financeErrorMessage(error);
}
