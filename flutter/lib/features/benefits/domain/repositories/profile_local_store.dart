import '../applicant_profile.dart';

/// '내 조건' 기기 저장 포트. 구현은 [data] 레이어.
abstract interface class ProfileLocalStore {
  ApplicantProfile get current;
  bool get isLoaded;

  Future<ApplicantProfile> load();
  Future<void> save(ApplicantProfile profile);
}
