import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/security/field_cipher.dart';
import 'data/api_jobs_repository.dart';
import 'data/mapping_jobs_repository.dart';
import 'data/profile_store.dart';
import 'data/saved_posting_store.dart';
import 'data/saved_posting_reminder_prefs.dart';
import 'domain/jobs_repository.dart';
import 'domain/repositories/saved_posting_reminder_prefs_store.dart';
import 'domain/repositories/profile_local_store.dart';
import 'domain/repositories/saved_posting_local_store.dart';
import 'domain/use_cases/get_job_posting_detail.dart';
import 'domain/use_cases/load_jobs_meta.dart';
import 'domain/use_cases/load_profile.dart';
import 'domain/use_cases/load_saved_posting_summaries.dart';
import 'domain/use_cases/load_schedule_postings.dart';
import 'domain/use_cases/load_similar_postings.dart';
import 'domain/use_cases/resolve_saved_posting_ids.dart';
import 'domain/use_cases/save_profile.dart';
import 'domain/use_cases/paginated_posting_list.dart';
import 'domain/use_cases/search_job_postings.dart';
import 'domain/use_cases/toggle_saved_posting.dart';

/// 일자리 섹션의 **조립(composition root)**.
/// 앱 어댑터(`jobs_module.dart`) 아래, domain / data / presentation 을 이어 준다.
class JobsContainer {
  JobsContainer({
    required this.repository,
    required this.profileLocalStore,
    required this.savedPostingLocalStore,
    required this.searchPostings,
    required this.getPostingDetail,
    required this.loadJobsMeta,
    required this.loadSchedulePostings,
    required this.loadSimilarPostings,
    required this.resolveSavedPostingIds,
    required this.loadSavedPostingSummaries,
    required this.toggleSavedPosting,
    required this.loadProfile,
    required this.saveProfile,
    required this.paginatedPostingList,
    required this.reminderPrefs,
  });

  final JobsRepository repository;
  final ProfileLocalStore profileLocalStore;
  final SavedPostingLocalStore savedPostingLocalStore;
  final SavedPostingReminderPrefsStore reminderPrefs;

  final SearchJobPostingsUseCase searchPostings;
  final GetPostingDetailUseCase getPostingDetail;
  final LoadJobsMetaUseCase loadJobsMeta;
  final LoadSchedulePostingsUseCase loadSchedulePostings;
  final LoadSimilarPostingsUseCase loadSimilarPostings;
  final ResolveSavedPostingIdsUseCase resolveSavedPostingIds;
  final LoadSavedPostingSummariesUseCase loadSavedPostingSummaries;
  final ToggleSavedPostingUseCase toggleSavedPosting;
  final LoadProfileUseCase loadProfile;
  final SaveProfileUseCase saveProfile;
  final PaginatedPostingListUseCase paginatedPostingList;

  factory JobsContainer.live({
    required ApiClient apiClient,
    required SharedPreferences prefs,
    required FieldCipher cipher,
  }) {
    final repository = MappingJobsRepository(ApiJobsRepository(apiClient));
    final profileLocalStore = ProfileStore(prefs, cipher);
    final savedPostingLocalStore = SavedPostingStore(prefs, cipher);
    return JobsContainer.fromStores(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedPostingLocalStore: savedPostingLocalStore,
      reminderPrefs: SavedPostingReminderPrefs(prefs),
    );
  }

  factory JobsContainer.fromStores({
    required JobsRepository repository,
    required ProfileLocalStore profileLocalStore,
    required SavedPostingLocalStore savedPostingLocalStore,
    required SavedPostingReminderPrefsStore reminderPrefs,
  }) {
    final getPostingDetail = GetPostingDetailUseCase(repository);
    final searchPostings = SearchJobPostingsUseCase(repository);
    return JobsContainer(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedPostingLocalStore: savedPostingLocalStore,
      searchPostings: searchPostings,
      getPostingDetail: getPostingDetail,
      loadJobsMeta: LoadJobsMetaUseCase(repository),
      loadSchedulePostings: LoadSchedulePostingsUseCase(repository),
      loadSimilarPostings: LoadSimilarPostingsUseCase(repository),
      resolveSavedPostingIds: ResolveSavedPostingIdsUseCase(repository, savedPostingLocalStore),
      loadSavedPostingSummaries: LoadSavedPostingSummariesUseCase(repository, getPostingDetail),
      toggleSavedPosting: ToggleSavedPostingUseCase(repository, savedPostingLocalStore),
      loadProfile: LoadProfileUseCase(profileLocalStore),
      saveProfile: SaveProfileUseCase(profileLocalStore),
      paginatedPostingList: PaginatedPostingListUseCase(searchPostings),
      reminderPrefs: reminderPrefs,
    );
  }
}
