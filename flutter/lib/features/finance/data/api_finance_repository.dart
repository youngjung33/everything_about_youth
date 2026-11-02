import '../../../core/json.dart';
import '../../../core/network/api_client.dart';
import '../domain/applicant_profile.dart';
import '../domain/finance_filters.dart';
import '../domain/finance_meta.dart';
import '../domain/finance_repository.dart';
import '../domain/finance_scheme.dart';

/// Next.js 서버 JSON API (`/api/v1` 접두어는 [ApiClient] 가 붙인다)
///  - GET /finance/meta
///  - GET /finance/schemes
///  - GET /finance/schemes/:id
///  - GET/PUT/DELETE /finance/saved …
class ApiFinanceRepository implements FinanceRepository {
  ApiFinanceRepository(this._client);

  final ApiClient _client;

  static const _base = '/finance';

  @override
  Future<FinanceMeta> fetchMeta() async => FinanceMeta.fromJson(await _client.getJson('$_base/meta'));

  @override
  Future<SchemePage> searchSchemes({
    required FinanceFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    final json = await _client.getJson(
      '$_base/schemes',
      query: {...filters.toQuery(), ...profile.toQuery(), 'page': page, 'pageSize': pageSize},
    );
    return SchemePage.fromJson(json);
  }

  @override
  Future<SchemeDetail> getScheme(String id, {required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/schemes/${Uri.encodeComponent(id)}', query: profile.toQuery());
    return SchemeDetail.fromJson(json);
  }

  @override
  Future<List<String>> fetchSavedIds() async {
    final json = await _client.getJson('$_base/saved/ids');
    return asStringList(json['ids']);
  }

  @override
  Future<SavedSchemeList> fetchSaved({required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/saved', query: profile.toQuery());
    return SavedSchemeList.fromJson(json);
  }

  @override
  Future<void> saveScheme(String id) async {
    await _client.putJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> unsaveScheme(String id) async {
    await _client.deleteJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    final json = await _client.putJson('$_base/saved', body: {'ids': ids});
    return asStringList(json['ids']);
  }
}
