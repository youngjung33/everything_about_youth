import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/security/field_cipher.dart';
import 'data/api_benefits_repository.dart';
import 'data/mapping_benefits_repository.dart';
import 'data/profile_store.dart';
import 'data/saved_program_store.dart';
import 'data/saved_program_reminder_prefs.dart';
import 'domain/benefits_repository.dart';
import 'domain/repositories/saved_program_reminder_prefs_store.dart';
import 'domain/repositories/profile_local_store.dart';
import 'domain/repositories/saved_program_local_store.dart';
import 'domain/use_cases/get_program_detail.dart';
import 'domain/use_cases/load_benefits_meta.dart';
import 'domain/use_cases/load_profile.dart';
import 'domain/use_cases/load_saved_program_summaries.dart';
import 'domain/use_cases/load_schedule_programs.dart';
import 'domain/use_cases/load_similar_programs.dart';
import 'domain/use_cases/resolve_saved_program_ids.dart';
import 'domain/use_cases/save_profile.dart';
import 'domain/use_cases/paginated_program_list.dart';
import 'domain/use_cases/search_programs.dart';
import 'domain/use_cases/toggle_saved_program.dart';

/// 임대주택 섹션의 **조립(composition root)**.
/// 앱 어댑터(`benefits_module.dart`) 아래, domain / data / presentation 을 이어 준다.
class BenefitsContainer {
  BenefitsContainer({
    required this.repository,
    required this.profileLocalStore,
    required this.savedNoticeLocalStore,
    required this.searchPrograms,
    required this.getProgramDetail,
    required this.loadBenefitMeta,
    required this.loadSchedulePrograms,
    required this.loadSimilarPrograms,
    required this.resolveSavedProgramIds,
    required this.loadSavedProgramSummaries,
    required this.toggleSavedProgram,
    required this.loadProfile,
    required this.saveProfile,
    required this.paginatedProgramList,
    required this.reminderPrefs,
  });

  final BenefitsRepository repository;
  final ProfileLocalStore profileLocalStore;
  final SavedProgramLocalStore savedNoticeLocalStore;
  final SavedProgramReminderPrefsStore reminderPrefs;

  final SearchProgramsUseCase searchPrograms;
  final GetProgramDetailUseCase getProgramDetail;
  final LoadBenefitMetaUseCase loadBenefitMeta;
  final LoadScheduleProgramsUseCase loadSchedulePrograms;
  final LoadSimilarProgramsUseCase loadSimilarPrograms;
  final ResolveSavedProgramIdsUseCase resolveSavedProgramIds;
  final LoadSavedProgramSummariesUseCase loadSavedProgramSummaries;
  final ToggleSavedProgramUseCase toggleSavedProgram;
  final LoadProfileUseCase loadProfile;
  final SaveProfileUseCase saveProfile;
  final PaginatedProgramListUseCase paginatedProgramList;

  factory BenefitsContainer.live({
    required ApiClient apiClient,
    required SharedPreferences prefs,
    required FieldCipher cipher,
  }) {
    final repository = MappingBenefitsRepository(ApiBenefitsRepository(apiClient));
    final profileLocalStore = ProfileStore(prefs, cipher);
    final savedNoticeLocalStore = SavedProgramStore(prefs, cipher);
    return BenefitsContainer.fromStores(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedNoticeLocalStore: savedNoticeLocalStore,
      reminderPrefs: SavedProgramReminderPrefs(prefs),
    );
  }

  factory BenefitsContainer.fromStores({
    required BenefitsRepository repository,
    required ProfileLocalStore profileLocalStore,
    required SavedProgramLocalStore savedNoticeLocalStore,
    required SavedProgramReminderPrefsStore reminderPrefs,
  }) {
    final getProgramDetail = GetProgramDetailUseCase(repository);
    final searchPrograms = SearchProgramsUseCase(repository);
    return BenefitsContainer(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedNoticeLocalStore: savedNoticeLocalStore,
      searchPrograms: searchPrograms,
      getProgramDetail: getProgramDetail,
      loadBenefitMeta: LoadBenefitMetaUseCase(repository),
      loadSchedulePrograms: LoadScheduleProgramsUseCase(repository),
      loadSimilarPrograms: LoadSimilarProgramsUseCase(repository),
      resolveSavedProgramIds: ResolveSavedProgramIdsUseCase(repository, savedNoticeLocalStore),
      loadSavedProgramSummaries: LoadSavedProgramSummariesUseCase(repository, getProgramDetail),
      toggleSavedProgram: ToggleSavedProgramUseCase(repository, savedNoticeLocalStore),
      loadProfile: LoadProfileUseCase(profileLocalStore),
      saveProfile: SaveProfileUseCase(profileLocalStore),
      paginatedProgramList: PaginatedProgramListUseCase(searchPrograms),
      reminderPrefs: reminderPrefs,
    );
  }
}
