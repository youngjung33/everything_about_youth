import '../applicant_profile.dart';
import '../repositories/profile_local_store.dart';

class SaveProfileUseCase {
  const SaveProfileUseCase(this._store);

  final ProfileLocalStore _store;

  Future<void> call(ApplicantProfile profile) => _store.save(profile);
}
