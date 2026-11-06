import '../../../core/json.dart';
import '../../../core/network/api_client.dart';
import '../domain/applicant_profile.dart';
import '../domain/living_filters.dart';
import '../domain/living_meta.dart';
import '../domain/living_repository.dart';
import '../domain/living_guide.dart';

class ApiLivingRepository implements LivingRepository {
  ApiLivingRepository(this._client);

  final ApiClient _client;

  static const _base = '/living';

  @override
  Future<LivingMeta> fetchMeta() async => LivingMeta.fromJson(await _client.getJson('$_base/meta'));

  @override
  Future<GuidePage> searchGuides({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    final json = await _client.getJson(
      '$_base/guides',
      query: {...filters.toQuery(), 'page': page, 'pageSize': pageSize},
    );
    return GuidePage.fromJson(json);
  }

  @override
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/guides/${Uri.encodeComponent(id)}');
    return GuideDetail.fromJson(json);
  }

  @override
  Future<List<String>> fetchSavedIds() async {
    final json = await _client.getJson('$_base/saved/ids');
    return asStringList(json['ids']);
  }

  @override
  Future<SavedGuideList> fetchSaved({required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/saved');
    return SavedGuideList.fromJson(json);
  }

  @override
  Future<void> saveGuide(String id) async {
    await _client.putJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> unsaveGuide(String id) async {
    await _client.deleteJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    final json = await _client.putJson('$_base/saved', body: {'ids': ids});
    return asStringList(json['ids']);
  }
}
