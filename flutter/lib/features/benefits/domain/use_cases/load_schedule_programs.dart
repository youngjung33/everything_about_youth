import '../applicant_profile.dart';
import '../benefit_filters.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

/// 접수중·예정 공고를 일정 화면용으로 넉넉히 불러 온다.
class LoadScheduleProgramsUseCase {
  const LoadScheduleProgramsUseCase(this._repository);

  final BenefitsRepository _repository;

  static const pageSize = 80;
  static const maxPages = 5;

  Future<({String today, List<ProgramSummary> items})> call({required ApplicantProfile profile}) async {
    const filters = BenefitFilters(statuses: {'open', 'upcoming'}, sort: 'deadline');
    final first = await _repository.searchPrograms(
      filters: filters,
      profile: profile,
      pageSize: pageSize,
    );
    var items = [...first.items];
    var page = first.page;
    while (page < first.totalPages && page < maxPages) {
      page++;
      final next = await _repository.searchPrograms(
        filters: filters,
        profile: profile,
        page: page,
        pageSize: pageSize,
      );
      final seen = items.map((e) => e.id).toSet();
      items.addAll(next.items.where((e) => !seen.contains(e.id)));
    }
    return (today: first.today, items: items);
  }
}
