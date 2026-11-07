import '../../../core/json.dart';
import '../../../core/network/api_client.dart';
import '../domain/applicant_profile.dart';
import '../domain/jobs_filters.dart';
import '../domain/jobs_meta.dart';
import '../domain/jobs_repository.dart';
import '../domain/job_posting.dart';

/// Next.js 서버 JSON API (`/api/v1` 접두어는 [ApiClient] 가 붙인다)
///  - GET /jobs/meta
///  - GET /jobs/postings
///  - GET /jobs/postings/:id
///  - GET/PUT/DELETE /jobs/saved …
class ApiJobsRepository implements JobsRepository {
  ApiJobsRepository(this._client);

  final ApiClient _client;

  static const _base = '/jobs';

  @override
  Future<JobsMeta> fetchMeta() async => JobsMeta.fromJson(await _client.getJson('$_base/meta'));

  @override
  Future<PostingPage> searchPostings({
    required JobsFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    final json = await _client.getJson(
      '$_base/postings',
      query: {...filters.toQuery(), ...profile.toQuery(), 'page': page, 'pageSize': pageSize},
    );
    return PostingPage.fromJson(json);
  }

  @override
  Future<PostingDetail> getPosting(String id, {required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/postings/${Uri.encodeComponent(id)}', query: profile.toQuery());
    return PostingDetail.fromJson(json);
  }

  @override
  Future<List<String>> fetchSavedIds() async {
    final json = await _client.getJson('$_base/saved/ids');
    return asStringList(json['ids']);
  }

  @override
  Future<SavedPostingList> fetchSaved({required ApplicantProfile profile}) async {
    final json = await _client.getJson('$_base/saved', query: profile.toQuery());
    return SavedPostingList.fromJson(json);
  }

  @override
  Future<void> savePosting(String id) async {
    await _client.putJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<void> unsavePosting(String id) async {
    await _client.deleteJson('$_base/saved/${Uri.encodeComponent(id)}');
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    final json = await _client.putJson('$_base/saved', body: {'ids': ids});
    return asStringList(json['ids']);
  }
}
