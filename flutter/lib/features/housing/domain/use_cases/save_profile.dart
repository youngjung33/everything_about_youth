import '../applicant_profile.dart';
import '../repositories/profile_local_store.dart';

/// 서비스별 지원자 프로필을 기기·서버에 저장한다.
class SaveProfileUseCase {
  const SaveProfileUseCase(this._store);

  final ProfileLocalStore _store;

  Future<void> call(ApplicantProfile profile) => _store.save(profile);
}
