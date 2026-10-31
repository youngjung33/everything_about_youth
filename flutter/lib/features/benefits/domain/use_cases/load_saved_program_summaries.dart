import '../applicant_profile.dart';
import '../failures.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';
import 'get_program_detail.dart';

/// 관심 공고 화면용 요약 목록.
class LoadSavedProgramSummariesUseCase {
  LoadSavedProgramSummariesUseCase(this._repository, this._getDetail);

  final BenefitsRepository _repository;
  final GetProgramDetailUseCase _getDetail;

  Future<SavedProgramList> call({
    required List<String> ids,
    required ApplicantProfile profile,
    required bool isMember,
  }) async {
    if (ids.isEmpty) return const SavedProgramList(items: [], total: 0, today: '');
    if (isMember) return _repository.fetchSaved(profile: profile);

    final results = await Future.wait(
      ids.map((id) async {
        try {
          return await _getDetail(id, profile: profile);
        } on BenefitsProgramNotFound {
          return null;
        }
      }),
    );
    final items = [for (final d in results) if (d != null) d.summary];
    return SavedProgramList(items: items, total: items.length, today: '');
  }
}
