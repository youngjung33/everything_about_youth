import '../applicant_profile.dart';
import '../failures.dart';
import '../jobs_repository.dart';
import '../job_posting.dart';
import 'get_job_posting_detail.dart';

/// 관심 공고 화면용 요약 목록.
class LoadSavedPostingSummariesUseCase {
  LoadSavedPostingSummariesUseCase(this._repository, this._getDetail);

  final JobsRepository _repository;
  final GetPostingDetailUseCase _getDetail;

  Future<SavedPostingList> call({
    required List<String> ids,
    required ApplicantProfile profile,
    required bool isMember,
  }) async {
    if (ids.isEmpty) return const SavedPostingList(items: [], total: 0, today: '');
    if (isMember) return _repository.fetchSaved(profile: profile);

    final results = await Future.wait(
      ids.map((id) async {
        try {
          return await _getDetail(id, profile: profile);
        } on JobPostingNotFound {
          return null;
        }
      }),
    );
    final items = [for (final d in results) if (d != null) d.summary];
    return SavedPostingList(items: items, total: items.length, today: '');
  }
}
