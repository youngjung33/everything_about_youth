import '../../../core/json.dart';
import '../../../core/network/api_client.dart';
import '../domain/applicant_profile.dart';
import '../domain/benefit_filters.dart';
import '../domain/benefit_meta.dart';
import '../domain/benefits_repository.dart';
import '../domain/benefit_program.dart';

/// Next.js 서버 JSON API (`/api/v1` 접두어는 [ApiClient] 가 붙인다)
///  - GET /benefits/meta
///  - GET /benefits/programs
///  - GET /benefits/programs/:id
///  - GET/PUT/DELETE /benefits/saved …
class ApiBenefitsRepository implements BenefitsRepository {
  ApiBenefitsRepository(this._client);

  final ApiClient _client;

  static const _base = '/benefits';

  @override
  Future<BenefitMeta> fetchMeta() async => BenefitMeta.fromJson(await _client.getJson('$_base/meta'));

  @override
  Future<ProgramPage> searchPrograms({
    required BenefitFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    final json = await _client.getJson(
      '$_base/programs',
      query: {...filters.toQuery(), ...profile.toQuery(), 'page': page, 'pageSize': pageSize},
    );
    return ProgramPage.fromJson(json);
  }

  @override
  Future<ProgramDetail> getProgram(String id, {required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/programs/${Uri.encodeComponent(id)}', query: profile.toQuery());
    return ProgramDetail.fromJson(json);
  }

  @override
  Future<List<String>> fetchSavedIds() async {
    final json = await _client.getJson('$_base/saved/ids');
    return asStringList(json['ids']);
  }

  @override
  Future<SavedProgramList> fetchSaved({required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/saved', query: profile.toQuery());
    return SavedProgramList.fromJson(json);
  }

  @override
  Future<void> saveProgram(String id) async {
    await _client.putJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> unsaveProgram(String id) async {
    await _client.deleteJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    final json = await _client.putJson('$_base/saved', body: {'ids': ids});
    return asStringList(json['ids']);
  }
}
