import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/security/field_cipher.dart';
import 'data/api_housing_repository.dart';
import 'data/mapping_housing_repository.dart';
import 'data/profile_store.dart';
import 'data/saved_notice_store.dart';
import 'domain/housing_repository.dart';
import 'domain/repositories/profile_local_store.dart';
import 'domain/repositories/saved_notice_local_store.dart';
import 'domain/use_cases/get_notice_detail.dart';
import 'domain/use_cases/load_housing_meta.dart';
import 'domain/use_cases/load_profile.dart';
import 'domain/use_cases/load_saved_notice_summaries.dart';
import 'domain/use_cases/load_schedule_notices.dart';
import 'domain/use_cases/load_similar_notices.dart';
import 'domain/use_cases/resolve_saved_notice_ids.dart';
import 'domain/use_cases/save_profile.dart';
import 'domain/use_cases/search_notices.dart';
import 'domain/use_cases/toggle_saved_notice.dart';

/// 임대주택 섹션의 **조립(composition root)**.
/// 앱 어댑터(`housing_module.dart`) 아래, domain / data / presentation 을 이어 준다.
class HousingContainer {
  HousingContainer({
    required this.repository,
    required this.profileLocalStore,
    required this.savedNoticeLocalStore,
    required this.searchNotices,
    required this.getNoticeDetail,
    required this.loadHousingMeta,
    required this.loadScheduleNotices,
    required this.loadSimilarNotices,
    required this.resolveSavedNoticeIds,
    required this.loadSavedNoticeSummaries,
    required this.toggleSavedNotice,
    required this.loadProfile,
    required this.saveProfile,
  });

  final HousingRepository repository;
  final ProfileLocalStore profileLocalStore;
  final SavedNoticeLocalStore savedNoticeLocalStore;

  final SearchNoticesUseCase searchNotices;
  final GetNoticeDetailUseCase getNoticeDetail;
  final LoadHousingMetaUseCase loadHousingMeta;
  final LoadScheduleNoticesUseCase loadScheduleNotices;
  final LoadSimilarNoticesUseCase loadSimilarNotices;
  final ResolveSavedNoticeIdsUseCase resolveSavedNoticeIds;
  final LoadSavedNoticeSummariesUseCase loadSavedNoticeSummaries;
  final ToggleSavedNoticeUseCase toggleSavedNotice;
  final LoadProfileUseCase loadProfile;
  final SaveProfileUseCase saveProfile;

  factory HousingContainer.live({
    required ApiClient apiClient,
    required SharedPreferences prefs,
    required FieldCipher cipher,
  }) {
    final repository = MappingHousingRepository(ApiHousingRepository(apiClient));
    final profileLocalStore = ProfileStore(prefs, cipher);
    final savedNoticeLocalStore = SavedNoticeStore(prefs, cipher);
    return HousingContainer.fromStores(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedNoticeLocalStore: savedNoticeLocalStore,
    );
  }

  factory HousingContainer.fromStores({
    required HousingRepository repository,
    required ProfileLocalStore profileLocalStore,
    required SavedNoticeLocalStore savedNoticeLocalStore,
  }) {
    final getNoticeDetail = GetNoticeDetailUseCase(repository);
    return HousingContainer(
      repository: repository,
      profileLocalStore: profileLocalStore,
      savedNoticeLocalStore: savedNoticeLocalStore,
      searchNotices: SearchNoticesUseCase(repository),
      getNoticeDetail: getNoticeDetail,
      loadHousingMeta: LoadHousingMetaUseCase(repository),
      loadScheduleNotices: LoadScheduleNoticesUseCase(repository),
      loadSimilarNotices: LoadSimilarNoticesUseCase(repository),
      resolveSavedNoticeIds: ResolveSavedNoticeIdsUseCase(repository, savedNoticeLocalStore),
      loadSavedNoticeSummaries: LoadSavedNoticeSummariesUseCase(repository, getNoticeDetail),
      toggleSavedNotice: ToggleSavedNoticeUseCase(repository, savedNoticeLocalStore),
      loadProfile: LoadProfileUseCase(profileLocalStore),
      saveProfile: SaveProfileUseCase(profileLocalStore),
    );
  }
}
