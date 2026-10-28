import '../../../core/network/api_client.dart';
import '../../../core/network/api_error_code.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/housing_filters.dart';
import '../domain/housing_meta.dart';
import '../domain/housing_repository.dart';
import '../domain/notice.dart';

/// [ApiException] 을 domain 의 [HousingUserMessage] 로 바꾼다.
class MappingHousingRepository implements HousingRepository {
  MappingHousingRepository(this._inner);

  final HousingRepository _inner;

  Future<T> _map<T>(Future<T> run) async {
    try {
      return await run;
    } on ApiException catch (e) {
      if (e.isNotFound || e.code == ApiErrorCode.noticeNotFound) {
        throw HousingNoticeNotFound(e.message);
      }
      throw HousingUserMessage(e.message);
    }
  }

  @override
  Future<HousingMeta> fetchMeta() => _map(_inner.fetchMeta());

  @override
  Future<NoticePage> searchNotices({
    required HousingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _map(
    _inner.searchNotices(filters: filters, profile: profile, page: page, pageSize: pageSize),
  );

  @override
  Future<NoticeDetail> getNotice(String id, {required ApplicantProfile profile}) =>
      _map(_inner.getNotice(id, profile: profile));

  @override
  Future<List<String>> fetchSavedIds() => _map(_inner.fetchSavedIds());

  @override
  Future<SavedNoticeList> fetchSaved({required ApplicantProfile profile}) =>
      _map(_inner.fetchSaved(profile: profile));

  @override
  Future<void> saveNotice(String id) => _map(_inner.saveNotice(id));

  @override
  Future<void> unsaveNotice(String id) => _map(_inner.unsaveNotice(id));

  @override
  Future<List<String>> mergeSaved(List<String> ids) => _map(_inner.mergeSaved(ids));
}
