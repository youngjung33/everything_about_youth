import '../../../core/network/api_client.dart';
import '../../../core/network/api_user_message.dart';
import '../../../core/network/api_error_code.dart';
import '../domain/applicant_profile.dart';
import '../domain/failures.dart';
import '../domain/finance_filters.dart';
import '../domain/finance_meta.dart';
import '../domain/finance_repository.dart';
import '../domain/finance_scheme.dart';

/// [ApiException] 을 domain 의 [FinanceUserMessage] 로 바꾼다.
class MappingFinanceRepository implements FinanceRepository {
  MappingFinanceRepository(this._inner);

  final FinanceRepository _inner;

  Future<T> _map<T>(Future<T> run) async {
    try {
      return await run;
    } on ApiException catch (e) {
      if (e.isNotFound || e.code == ApiErrorCode.schemeNotFound) {
        throw FinanceSchemeNotFound(apiExceptionUserMessage(e));
      }
      throw FinanceUserMessage(apiExceptionUserMessage(e));
    }
  }

  @override
  Future<FinanceMeta> fetchMeta() => _map(_inner.fetchMeta());

  @override
  Future<SchemePage> searchSchemes({
    required FinanceFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _map(
    _inner.searchSchemes(filters: filters, profile: profile, page: page, pageSize: pageSize),
  );

  @override
  Future<SchemeDetail> getScheme(String id, {required ApplicantProfile profile}) =>
      _map(_inner.getScheme(id, profile: profile));

  @override
  Future<List<String>> fetchSavedIds() => _map(_inner.fetchSavedIds());

  @override
  Future<SavedSchemeList> fetchSaved({required ApplicantProfile profile}) =>
      _map(_inner.fetchSaved(profile: profile));

  @override
  Future<void> saveScheme(String id) => _map(_inner.saveScheme(id));

  @override
  Future<void> unsaveScheme(String id) => _map(_inner.unsaveScheme(id));

  @override
  Future<List<String>> mergeSaved(List<String> ids) => _map(_inner.mergeSaved(ids));
}
