import '../applicant_profile.dart';
import '../failures.dart';
import '../housing_repository.dart';
import '../notice.dart';
import 'get_notice_detail.dart';

/// 관심 공고 화면용 요약 목록.
class LoadSavedNoticeSummariesUseCase {
  LoadSavedNoticeSummariesUseCase(this._repository, this._getDetail);

  final HousingRepository _repository;
  final GetNoticeDetailUseCase _getDetail;

  Future<SavedNoticeList> call({
    required List<String> ids,
    required ApplicantProfile profile,
    required bool isMember,
  }) async {
    if (ids.isEmpty) return const SavedNoticeList(items: [], total: 0, today: '');
    if (isMember) return _repository.fetchSaved(profile: profile);

    final results = await Future.wait(
      ids.map((id) async {
        try {
          return await _getDetail(id, profile: profile);
        } on HousingNoticeNotFound {
          return null;
        }
      }),
    );
    final items = [for (final d in results) if (d != null) d.summary];
    return SavedNoticeList(items: items, total: items.length, today: '');
  }
}
