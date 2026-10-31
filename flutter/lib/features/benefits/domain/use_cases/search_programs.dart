import '../applicant_profile.dart';
import '../benefit_filters.dart';
import '../benefits_repository.dart';
import '../benefit_program.dart';

class SearchProgramsUseCase {
  const SearchProgramsUseCase(this._repository);

  final BenefitsRepository _repository;

  Future<ProgramPage> call({
    required BenefitFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) => _repository.searchPrograms(filters: filters, profile: profile, page: page, pageSize: pageSize);
}
