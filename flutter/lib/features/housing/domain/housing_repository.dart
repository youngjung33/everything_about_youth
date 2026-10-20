import 'applicant_profile.dart';
import 'housing_filters.dart';
import 'housing_meta.dart';
import 'notice.dart';

/// 임대주택 공고 조회 포트. 구현체(HTTP API)는 data 레이어에 있다.
abstract class HousingRepository {
  Future<HousingMeta> fetchMeta();

  Future<NoticePage> searchNotices({
    required HousingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  });

  /// 공고가 없으면 `ApiException(isNotFound)` 를 던진다.
  Future<NoticeDetail> getNotice(String id, {required ApplicantProfile profile});
}
