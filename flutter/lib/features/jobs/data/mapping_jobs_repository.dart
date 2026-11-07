import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/network/api_error_code.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/jobs_filters.dart';
import '../domain/jobs_meta.dart';
import '../domain/jobs_repository.dart';
import '../domain/job_posting.dart';

/// [ApiException] 을 domain 의 [JobsUserMessage] 로 바꾼다.
class MappingJobsRepository implements JobsRepository {
  MappingJobsRepository(this._inner);

  final JobsRepository _inner;

  Future<T> _map<T>(Future<T> run) async {
    try {
      return await run;
    } on ApiException catch (e) {
      if (e.isNotFound || e.code == ApiErrorCode.postingNotFound) {
        throw JobPostingNotFound(apiExceptionUserMessage(e));
      }
      throw JobsUserMessage(apiExceptionUserMessage(e));
    }
  }

  @override
  Future<JobsMeta> fetchMeta() => _map(_inner.fetchMeta());

  @override
  Future<PostingPage> searchPostings({
    required JobsFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _map(
    _inner.searchPostings(filters: filters, profile: profile, page: page, pageSize: pageSize),
  );

  @override
  Future<PostingDetail> getPosting(String id, {required ApplicantProfile profile}) =>
      _map(_inner.getPosting(id, profile: profile));

  @override
  Future<List<String>> fetchSavedIds() => _map(_inner.fetchSavedIds());

  @override
  Future<SavedPostingList> fetchSaved({required ApplicantProfile profile}) =>
      _map(_inner.fetchSaved(profile: profile));

  @override
  Future<void> savePosting(String id) => _map(_inner.savePosting(id));

  @override
  Future<void> unsavePosting(String id) => _map(_inner.unsavePosting(id));

  @override
  Future<List<String>> mergeSaved(List<String> ids) => _map(_inner.mergeSaved(ids));
}
