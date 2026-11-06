import '../applicant_profile.dart';
import '../failures.dart';
import '../living_repository.dart';
import '../living_guide.dart';
import 'get_guide_detail.dart';

/// 관심 공고 화면용 요약 목록.
class LoadSavedGuideSummariesUseCase {
  LoadSavedGuideSummariesUseCase(this._repository, this._getDetail);

  final LivingRepository _repository;
  final GetGuideDetailUseCase _getDetail;

  Future<SavedGuideList> call({
    required List<String> ids,
    required ApplicantProfile profile,
    required bool isMember,
  }) async {
    if (ids.isEmpty) return const SavedGuideList(items: [], total: 0, today: '');
    if (isMember) return _repository.fetchSaved(profile: profile);

    final results = await Future.wait(
      ids.map((id) async {
        try {
          return await _getDetail(id, profile: profile);
        } on LivingGuideNotFound {
          return null;
        }
      }),
    );
    final items = [for (final d in results) if (d != null) d.summary];
    return SavedGuideList(items: items, total: items.length, today: '');
  }
}
