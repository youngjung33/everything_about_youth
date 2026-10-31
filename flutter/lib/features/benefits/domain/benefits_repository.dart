import 'applicant_profile.dart';
import 'benefit_filters.dart';
import 'benefit_meta.dart';
import 'benefit_program.dart';

/// 임대주택 공고 조회 포트. 구현체(HTTP API)는 data 레이어에 있다.
abstract class BenefitsRepository {
  Future<BenefitMeta> fetchMeta();

  Future<ProgramPage> searchPrograms({
    required BenefitFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  });

  /// 공고가 없으면 `ApiException(isNotFound)` 를 던진다.
  Future<ProgramDetail> getProgram(String id, {required ApplicantProfile profile});

  /// 로그인한 회원의 관심 공고 id (목록 하트 표시용)
  Future<List<String>> fetchSavedIds();

  /// 로그인한 회원의 관심 공고 목록. '내 조건'이 있으면 자격 판정 포함
  Future<SavedProgramList> fetchSaved({required ApplicantProfile profile});

  Future<void> saveProgram(String id);

  Future<void> unsaveProgram(String id);

  /// 비회원 기기에서 가져온 id 를 회원 목록에 합친다. 합친 뒤의 id 목록.
  Future<List<String>> mergeSaved(List<String> ids);
}
