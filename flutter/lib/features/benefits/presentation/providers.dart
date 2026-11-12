import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/benefit_filters.dart';
import '../domain/benefit_meta.dart';
import '../domain/benefit_program.dart';
import '../domain/program_list_state.dart';
import '../benefits_container.dart';

/// 청년 혜택 **유일한 조립 Provider**. data·use case 는 [BenefitsContainer] 에만 있다.
final benefitsContainerProvider = Provider<BenefitsContainer>(
  (ref) => BenefitsContainer.live(
    apiClient: ref.watch(apiClientProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    cipher: ref.watch(fieldCipherProvider),
  ),
);

BenefitsContainer _container(Ref ref) => ref.watch(benefitsContainerProvider);

final benefitsMetaProvider = FutureProvider<BenefitMeta>((ref) => _container(ref).loadBenefitMeta());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(benefitsContainerProvider).profileLocalStore;
    if (!store.isLoaded) {
      ref.read(benefitsContainerProvider).loadProfile().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(benefitsContainerProvider).saveProfile(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

class FiltersNotifier extends Notifier<BenefitFilters> {
  @override
  BenefitFilters build() => BenefitFilters.initial;

  void apply(BenefitFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = BenefitFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, BenefitFilters>(FiltersNotifier.new);

class ProgramListController extends AsyncNotifier<ProgramListState> {
  @override
  Future<ProgramListState> build() async {
    final list = _container(ref).paginatedProgramList;
    return list.loadFirstPage(
      filters: ref.watch(filtersProvider),
      profile: ref.watch(profileProvider),
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final list = ref.read(benefitsContainerProvider).paginatedProgramList;
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

final programListProvider = AsyncNotifierProvider<ProgramListController, ProgramListState>(ProgramListController.new);

final programDetailProvider = FutureProvider.family<ProgramDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return _container(ref).getProgramDetail(id, profile: profile);
});

class SavedProgramsNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return _container(ref).resolveSavedProgramIds(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(benefitsContainerProvider).toggleSavedProgram(
      id: id,
      isMember: mode.isMember,
      currentIds: ids,
    );
    if (result.error != null) return result.error;
    state = AsyncData(result.ids!);
    ref.invalidate(savedProgramListProvider);
    return null;
  }
}

final savedProgramsProvider = AsyncNotifierProvider<SavedProgramsNotifier, List<String>>(SavedProgramsNotifier.new);

final benefitsScheduleProgramsProvider = FutureProvider<({String today, List<ProgramSummary> items})>(
  (ref) => _container(ref).loadSchedulePrograms(profile: ref.watch(profileProvider)),
);

final similarProgramsProvider = FutureProvider.family<List<ProgramSummary>, String>((ref, id) async {
  final detail = await ref.watch(programDetailProvider(id).future);
  return _container(ref).loadSimilarPrograms(
    excludeId: id,
    categoryId: detail.summary.categoryId,
    profile: ref.watch(profileProvider),
  );
});

final savedProgramListProvider = FutureProvider<SavedProgramList>((ref) async {
  final ids = await ref.watch(savedProgramsProvider.future);
  return _container(ref).loadSavedProgramSummaries(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) {
  if (error is ApiException) return apiExceptionUserMessage(error);
  return benefitsErrorMessage(error);
}
