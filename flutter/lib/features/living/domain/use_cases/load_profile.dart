import '../applicant_profile.dart';
import '../repositories/profile_local_store.dart';

/// 기기·서버에서 지원자 프로필을 불러온다.
class LoadProfileUseCase {
  const LoadProfileUseCase(this._store);

  final ProfileLocalStore _store;

  Future<ApplicantProfile> call() => _store.load();
}
