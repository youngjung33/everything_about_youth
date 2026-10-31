import '../../../core/network/api_client.dart';
import '../../../core/network/api_error_code.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/benefit_filters.dart';
import '../domain/benefit_meta.dart';
import '../domain/benefits_repository.dart';
import '../domain/benefit_program.dart';

/// [ApiException] 을 domain 의 [BenefitsUserMessage] 로 바꾼다.
class MappingBenefitsRepository implements BenefitsRepository {
  MappingBenefitsRepository(this._inner);

  final BenefitsRepository _inner;

  Future<T> _map<T>(Future<T> run) async {
    try {
      return await run;
    } on ApiException catch (e) {
      if (e.isNotFound || e.code == ApiErrorCode.programNotFound) {
        throw BenefitsProgramNotFound(e.message);
      }
      throw BenefitsUserMessage(e.message);
    }
  }

  @override
  Future<BenefitMeta> fetchMeta() => _map(_inner.fetchMeta());

  @override
  Future<ProgramPage> searchPrograms({
    required BenefitFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _map(
    _inner.searchPrograms(filters: filters, profile: profile, page: page, pageSize: pageSize),
  );

  @override
  Future<ProgramDetail> getProgram(String id, {required ApplicantProfile profile}) =>
      _map(_inner.getProgram(id, profile: profile));

  @override
  Future<List<String>> fetchSavedIds() => _map(_inner.fetchSavedIds());

  @override
  Future<SavedProgramList> fetchSaved({required ApplicantProfile profile}) =>
      _map(_inner.fetchSaved(profile: profile));

  @override
  Future<void> saveProgram(String id) => _map(_inner.saveProgram(id));

  @override
  Future<void> unsaveProgram(String id) => _map(_inner.unsaveProgram(id));

  @override
  Future<List<String>> mergeSaved(List<String> ids) => _map(_inner.mergeSaved(ids));
}
