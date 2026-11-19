import '../applicant_profile.dart';
import '../benefit_filters.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

/// 필터·프로필로 혜택 프로그램 목록을 검색한다.
class SearchProgramsUseCase {
  const SearchProgramsUseCase(this._repository);

  final BenefitsRepository _repository; // domain 저장소 포트

  Future<ProgramPage> call({
    required BenefitFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchPrograms(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
