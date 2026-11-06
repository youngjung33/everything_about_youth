import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/security/field_cipher.dart';
import 'data/api_living_repository.dart';
import 'data/mapping_living_repository.dart';
import 'data/profile_store.dart';
import 'data/saved_guide_store.dart';
import 'data/saved_guide_reminder_prefs.dart';
import 'domain/living_repository.dart';
import 'domain/repositories/saved_guide_reminder_prefs_store.dart';
import 'domain/repositories/profile_local_store.dart';
import 'domain/repositories/saved_guide_local_store.dart';
import 'domain/use_cases/get_guide_detail.dart';
import 'domain/use_cases/load_living_meta.dart';
import 'domain/use_cases/load_profile.dart';
import 'domain/use_cases/load_saved_guide_summaries.dart';
import 'domain/use_cases/load_schedule_schemes.dart';
import 'domain/use_cases/load_similar_schemes.dart';
import 'domain/use_cases/resolve_saved_guide_ids.dart';
import 'domain/use_cases/save_profile.dart';
import 'domain/use_cases/paginated_guide_list.dart';
import 'domain/use_cases/search_schemes.dart';
import 'domain/use_cases/toggle_saved_guide.dart';

class LivingContainer {
  LivingContainer({
    required this.repository,
    required this.profileLocalStore,
    required this.savedGuideLocalStore,
    required this.searchGuides,
    required this.getGuideDetail,
    required this.loadLivingMeta,
    required this.loadScheduleGuides,
    required this.loadSimilarGuides,
    required this.resolveSavedGuideIds,
    required this.loadSavedGuideSummaries,
    required this.toggleSavedGuide,
    required this.loadProfile,
    required this.saveProfile,
    required this.paginatedGuideList,
    required this.reminderPrefs,
  });

  final LivingRepository repository;
  final ProfileLocalStore profileLocalStore;
  final SavedGuideLocalStore savedGuideLocalStore;
  final SavedGuideReminderPrefsStore reminderPrefs;

  final SearchGuidesUseCase searchGuides;
  final GetGuideDetailUseCase getGuideDetail;
  final LoadLivingMetaUseCase loadLivingMeta;
  final LoadScheduleGuidesUseCase loadScheduleGuides;
  final LoadSimilarGuidesUseCase loadSimilarGuides;
  final ResolveSavedGuideIdsUseCase resolveSavedGuideIds;
  final LoadSavedGuideSummariesUseCase loadSavedGuideSummaries;
  final ToggleSavedGuideUseCase toggleSavedGuide;
  final LoadProfileUseCase loadProfile;
  final SaveProfileUseCase saveProfile;
  final PaginatedGuideListUseCase paginatedGuideList;

  factory LivingContainer.live({
    required ApiClient apiClient,
    required SharedPreferences prefs,
    required FieldCipher cipher,
  }) {
    final repository = MappingLivingRepository(ApiLivingRepository(apiClient));
    final profileLocalStore = ProfileStore(prefs, cipher);
    final savedGuideLocalStore = SavedGuideStore(prefs, cipher);
    return LivingContainer.fromStores(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedGuideLocalStore: savedGuideLocalStore,
      reminderPrefs: SavedGuideReminderPrefs(prefs),
    );
  }

  factory LivingContainer.fromStores({
    required LivingRepository repository,
    required ProfileLocalStore profileLocalStore,
    required SavedGuideLocalStore savedGuideLocalStore,
    required SavedGuideReminderPrefsStore reminderPrefs,
  }) {
    final getGuideDetail = GetGuideDetailUseCase(repository);
    final searchGuides = SearchGuidesUseCase(repository);
    return LivingContainer(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedGuideLocalStore: savedGuideLocalStore,
      searchGuides: searchGuides,
      getGuideDetail: getGuideDetail,
      loadLivingMeta: LoadLivingMetaUseCase(repository),
      loadScheduleGuides: LoadScheduleGuidesUseCase(repository),
      loadSimilarGuides: LoadSimilarGuidesUseCase(repository),
      resolveSavedGuideIds: ResolveSavedGuideIdsUseCase(repository, savedGuideLocalStore),
      loadSavedGuideSummaries: LoadSavedGuideSummariesUseCase(repository, getGuideDetail),
      toggleSavedGuide: ToggleSavedGuideUseCase(repository, savedGuideLocalStore),
      loadProfile: LoadProfileUseCase(profileLocalStore),
      saveProfile: SaveProfileUseCase(profileLocalStore),
      paginatedGuideList: PaginatedGuideListUseCase(searchGuides),
      reminderPrefs: reminderPrefs,
    );
  }
}
