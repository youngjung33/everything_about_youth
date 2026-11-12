import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/jobs_filters.dart';
import '../domain/jobs_meta.dart';
import '../domain/job_posting.dart';
import '../domain/posting_list_state.dart';
import '../jobs_container.dart';

/// 일자리 **유일한 조립 Provider**. data·use case 는 [JobsContainer] 에만 있다.
final jobsContainerProvider = Provider<JobsContainer>(
  (ref) => JobsContainer.live(
    apiClient: ref.watch(apiClientProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    cipher: ref.watch(fieldCipherProvider),
  ),
);

JobsContainer _container(Ref ref) => ref.watch(jobsContainerProvider);

final jobsMetaProvider = FutureProvider<JobsMeta>((ref) => _container(ref).loadJobsMeta());

class ProfileNotifier extends Notifier<ApplicantProfile> {
  bool _edited = false;

  @override
  ApplicantProfile build() {
    final store = ref.read(jobsContainerProvider).profileLocalStore;
    if (!store.isLoaded) {
      ref.read(jobsContainerProvider).loadProfile().then((loaded) {
        if (!_edited && ref.mounted) state = loaded;
      });
    }
    return store.current;
  }

  Future<void> save(ApplicantProfile profile) async {
    _edited = true;
    state = profile;
    await ref.read(jobsContainerProvider).saveProfile(profile);
  }
}

final profileProvider = NotifierProvider<ProfileNotifier, ApplicantProfile>(ProfileNotifier.new);

class FiltersNotifier extends Notifier<JobsFilters> {
  @override
  JobsFilters build() => JobsFilters.initial;

  void apply(JobsFilters filters) => state = filters;

  void setVerdicts(Set<String> verdicts) => state = state.copyWith(verdicts: verdicts);

  void setSort(String sort) => state = state.copyWith(sort: sort);

  void reset() => state = JobsFilters.initial.copyWith(verdicts: state.verdicts, sort: state.sort);
}

final filtersProvider = NotifierProvider<FiltersNotifier, JobsFilters>(FiltersNotifier.new);

class PostingListController extends AsyncNotifier<PostingListState> {
  @override
  Future<PostingListState> build() async {
    final list = _container(ref).paginatedPostingList;
    return list.loadFirstPage(
      filters: ref.watch(filtersProvider),
      profile: ref.watch(profileProvider),
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final list = ref.read(jobsContainerProvider).paginatedPostingList;
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

final postingListProvider = AsyncNotifierProvider<PostingListController, PostingListState>(PostingListController.new);

final postingDetailProvider = FutureProvider.family<PostingDetail, String>((ref, id) {
  final profile = ref.watch(profileProvider);
  return _container(ref).getPostingDetail(id, profile: profile);
});

class SavedPostingsNotifier extends AsyncNotifier<List<String>> {
  @override
  Future<List<String>> build() async {
    final mode = ref.watch(authModeProvider);
    return _container(ref).resolveSavedPostingIds(isMember: mode.isMember);
  }

  Future<String?> toggle(String id) async {
    final ids = [...(state.value ?? await future)];
    final mode = ref.read(authModeProvider);
    final result = await ref.read(jobsContainerProvider).toggleSavedPosting(
      id: id,
      isMember: mode.isMember,
      currentIds: ids,
    );
    if (result.error != null) return result.error;
    state = AsyncData(result.ids!);
    ref.invalidate(savedPostingListProvider);
    return null;
  }
}

final savedPostingsProvider = AsyncNotifierProvider<SavedPostingsNotifier, List<String>>(SavedPostingsNotifier.new);

final jobsSchedulePostingsProvider = FutureProvider<({String today, List<PostingSummary> items})>(
  (ref) => _container(ref).loadSchedulePostings(profile: ref.watch(profileProvider)),
);

final similarPostingsProvider = FutureProvider.family<List<PostingSummary>, String>((ref, id) async {
  final detail = await ref.watch(postingDetailProvider(id).future);
  return _container(ref).loadSimilarPostings(
    excludeId: id,
    hireTypeId: detail.summary.hireTypeId,
    profile: ref.watch(profileProvider),
  );
});

final savedPostingListProvider = FutureProvider<SavedPostingList>((ref) async {
  final ids = await ref.watch(savedPostingsProvider.future);
  return _container(ref).loadSavedPostingSummaries(
    ids: ids,
    profile: ref.watch(profileProvider),
    isMember: ref.watch(authModeProvider).isMember,
  );
});

String errorMessage(Object error) {
  if (error is ApiException) return apiExceptionUserMessage(error);
  return jobsErrorMessage(error);
}
