import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/security/field_cipher.dart';
import 'data/api_finance_repository.dart';
import 'data/mapping_finance_repository.dart';
import 'data/profile_store.dart';
import 'data/saved_scheme_store.dart';
import 'data/saved_scheme_reminder_prefs.dart';
import 'domain/finance_repository.dart';
import 'domain/repositories/saved_scheme_reminder_prefs_store.dart';
import 'domain/repositories/profile_local_store.dart';
import 'domain/repositories/saved_scheme_local_store.dart';
import 'domain/use_cases/get_scheme_detail.dart';
import 'domain/use_cases/load_finance_meta.dart';
import 'domain/use_cases/load_profile.dart';
import 'domain/use_cases/load_saved_scheme_summaries.dart';
import 'domain/use_cases/load_schedule_schemes.dart';
import 'domain/use_cases/load_similar_schemes.dart';
import 'domain/use_cases/resolve_saved_scheme_ids.dart';
import 'domain/use_cases/save_profile.dart';
import 'domain/use_cases/paginated_scheme_list.dart';
import 'domain/use_cases/search_schemes.dart';
import 'domain/use_cases/toggle_saved_scheme.dart';

/// 임대주택 섹션의 **조립(composition root)**.
/// 앱 어댑터(`benefits_module.dart`) 아래, domain / data / presentation 을 이어 준다.
class FinanceContainer {
  FinanceContainer({
    required this.repository,
    required this.profileLocalStore,
    required this.savedSchemeLocalStore,
    required this.searchSchemes,
    required this.getSchemeDetail,
    required this.loadFinanceMeta,
    required this.loadScheduleSchemes,
    required this.loadSimilarSchemes,
    required this.resolveSavedSchemeIds,
    required this.loadSavedSchemeSummaries,
    required this.toggleSavedScheme,
    required this.loadProfile,
    required this.saveProfile,
    required this.paginatedSchemeList,
    required this.reminderPrefs,
  });

  final FinanceRepository repository;
  final ProfileLocalStore profileLocalStore;
  final SavedSchemeLocalStore savedSchemeLocalStore;
  final SavedSchemeReminderPrefsStore reminderPrefs;

  final SearchSchemesUseCase searchSchemes;
  final GetSchemeDetailUseCase getSchemeDetail;
  final LoadFinanceMetaUseCase loadFinanceMeta;
  final LoadScheduleSchemesUseCase loadScheduleSchemes;
  final LoadSimilarSchemesUseCase loadSimilarSchemes;
  final ResolveSavedSchemeIdsUseCase resolveSavedSchemeIds;
  final LoadSavedSchemeSummariesUseCase loadSavedSchemeSummaries;
  final ToggleSavedSchemeUseCase toggleSavedScheme;
  final LoadProfileUseCase loadProfile;
  final SaveProfileUseCase saveProfile;
  final PaginatedSchemeListUseCase paginatedSchemeList;

  factory FinanceContainer.live({
    required ApiClient apiClient,
    required SharedPreferences prefs,
    required FieldCipher cipher,
  }) {
    final repository = MappingFinanceRepository(ApiFinanceRepository(apiClient));
    final profileLocalStore = ProfileStore(prefs, cipher);
    final savedSchemeLocalStore = SavedSchemeStore(prefs, cipher);
    return FinanceContainer.fromStores(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedSchemeLocalStore: savedSchemeLocalStore,
      reminderPrefs: SavedSchemeReminderPrefs(prefs),
    );
  }

  factory FinanceContainer.fromStores({
    required FinanceRepository repository,
    required ProfileLocalStore profileLocalStore,
    required SavedSchemeLocalStore savedSchemeLocalStore,
    required SavedSchemeReminderPrefsStore reminderPrefs,
  }) {
    final getSchemeDetail = GetSchemeDetailUseCase(repository);
    final searchSchemes = SearchSchemesUseCase(repository);
    return FinanceContainer(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedSchemeLocalStore: savedSchemeLocalStore,
      searchSchemes: searchSchemes,
      getSchemeDetail: getSchemeDetail,
      loadFinanceMeta: LoadFinanceMetaUseCase(repository),
      loadScheduleSchemes: LoadScheduleSchemesUseCase(repository),
      loadSimilarSchemes: LoadSimilarSchemesUseCase(repository),
      resolveSavedSchemeIds: ResolveSavedSchemeIdsUseCase(repository, savedSchemeLocalStore),
      loadSavedSchemeSummaries: LoadSavedSchemeSummariesUseCase(repository, getSchemeDetail),
      toggleSavedScheme: ToggleSavedSchemeUseCase(repository, savedSchemeLocalStore),
      loadProfile: LoadProfileUseCase(profileLocalStore),
      saveProfile: SaveProfileUseCase(profileLocalStore),
      paginatedSchemeList: PaginatedSchemeListUseCase(searchSchemes),
      reminderPrefs: reminderPrefs,
    );
  }
}
