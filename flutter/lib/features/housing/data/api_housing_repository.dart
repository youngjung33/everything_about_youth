import '../../../core/json.dart';
import '../../../core/network/api_client.dart';
import '../domain/applicant_profile.dart';
import '../domain/housing_filters.dart';
import '../domain/housing_meta.dart';
import '../domain/housing_repository.dart';
import '../domain/notice.dart';

/// Next.js 서버의 JSON API 로 공고를 조회·저장한다. (`/api/v1` 접두어는 [ApiClient] 가 붙인다)
///  - GET /housing/meta
///  - GET /housing/notices
///  - GET /housing/notices/:id
///  - GET/PUT/DELETE /housing/saved …
class ApiHousingRepository implements HousingRepository {
  ApiHousingRepository(this._client);

  final ApiClient _client;

  static const _base = '/housing';

  @override
  Future<HousingMeta> fetchMeta() async => HousingMeta.fromJson(await _client.getJson('$_base/meta'));

  @override
  Future<NoticePage> searchNotices({
    required HousingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    final json = await _client.getJson(
      '$_base/notices',
      query: {...filters.toQuery(), ...profile.toQuery(), 'page': page, 'pageSize': pageSize},
    );
    return NoticePage.fromJson(json);
  }

  @override
  Future<NoticeDetail> getNotice(String id, {required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/notices/${Uri.encodeComponent(id)}', query: profile.toQuery());
    return NoticeDetail.fromJson(json);
  }

  @override
  Future<List<String>> fetchSavedIds() async {
    final json = await _client.getJson('$_base/saved/ids');
    return asStringList(json['ids']);
  }

  @override
  Future<SavedNoticeList> fetchSaved({required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/saved', query: profile.toQuery());
    return SavedNoticeList.fromJson(json);
  }

  @override
  Future<void> saveNotice(String id) async {
    await _client.putJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> unsaveNotice(String id) async {
    await _client.deleteJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    final json = await _client.putJson('$_base/saved', body: {'ids': ids});
    return asStringList(json['ids']);
  }
}
