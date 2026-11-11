import 'applicant_profile.dart';
import 'living_filters.dart';
import 'living_meta.dart';
import 'living_guide.dart';

/// 이사·생활 안내 조회 포트. 구현체(HTTP API)는 data 레이어에 있다.
abstract class LivingRepository {
  Future<LivingMeta> fetchMeta();

  Future<GuidePage> searchGuides({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  });

  /// 안내가 없으면 `ApiException(isNotFound)` 를 던진다.
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile});

  /// 로그인한 회원의 관심 안내 id (목록 하트 표시용)
  Future<List<String>> fetchSavedIds();

  /// 로그인한 회원의 관심 안내 목록
  Future<SavedGuideList> fetchSaved({required ApplicantProfile profile});

  Future<void> saveGuide(String id);

  Future<void> unsaveGuide(String id);

  /// 비회원 기기에서 가져온 id 를 회원 목록에 합친다. 합친 뒤의 id 목록.
  Future<List<String>> mergeSaved(List<String> ids);
}
