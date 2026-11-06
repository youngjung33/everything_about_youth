import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/network/api_error_code.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/living_filters.dart';
import '../domain/living_meta.dart';
import '../domain/living_repository.dart';
import '../domain/living_guide.dart';

/// [ApiException] 을 domain 의 [LivingUserMessage] 로 바꾼다.
class MappingLivingRepository implements LivingRepository {
  MappingLivingRepository(this._inner);

  final LivingRepository _inner;

  Future<T> _map<T>(Future<T> run) async {
    try {
      return await run;
    } on ApiException catch (e) {
      if (e.isNotFound || e.code == ApiErrorCode.schemeNotFound || e.code == ApiErrorCode.guideNotFound) {
        throw LivingGuideNotFound(apiExceptionUserMessage(e));
      }
      throw LivingUserMessage(apiExceptionUserMessage(e));
    }
  }

  @override
  Future<LivingMeta> fetchMeta() => _map(_inner.fetchMeta());

  @override
  Future<GuidePage> searchGuides({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _map(
    _inner.searchGuides(filters: filters, profile: profile, page: page, pageSize: pageSize),
  );

  @override
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile}) =>
      _map(_inner.getGuide(id, profile: profile));

  @override
  Future<List<String>> fetchSavedIds() => _map(_inner.fetchSavedIds());

  @override
  Future<SavedGuideList> fetchSaved({required ApplicantProfile profile}) =>
      _map(_inner.fetchSaved(profile: profile));

  @override
  Future<void> saveGuide(String id) => _map(_inner.saveGuide(id));

  @override
  Future<void> unsaveGuide(String id) => _map(_inner.unsaveGuide(id));

  @override
  Future<List<String>> mergeSaved(List<String> ids) => _map(_inner.mergeSaved(ids));
}
