import '../applicant_profile.dart';
import '../failures.dart';
import '../finance_repository.dart';
import '../finance_scheme.dart';
import 'get_scheme_detail.dart';

/// 관심 제도 화면용 요약 목록.
class LoadSavedSchemeSummariesUseCase {
  LoadSavedSchemeSummariesUseCase(this._repository, this._getDetail);

  final FinanceRepository _repository;
  final GetSchemeDetailUseCase _getDetail;

  Future<SavedSchemeList> call({
    required List<String> ids,
    required ApplicantProfile profile,
    required bool isMember,
  }) async {
    if (ids.isEmpty) return const SavedSchemeList(items: [], total: 0, today: '');
    if (isMember) return _repository.fetchSaved(profile: profile);

    final results = await Future.wait(
      ids.map((id) async {
        try {
          return await _getDetail(id, profile: profile);
        } on FinanceSchemeNotFound {
          return null;
        }
      }),
    );
    final items = [for (final d in results) if (d != null) d.summary];
    return SavedSchemeList(items: items, total: items.length, today: '');
  }
}
