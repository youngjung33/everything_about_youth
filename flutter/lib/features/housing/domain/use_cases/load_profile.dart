import '../applicant_profile.dart';
import '../repositories/profile_local_store.dart';

class LoadProfileUseCase {
  const LoadProfileUseCase(this._store);

  final ProfileLocalStore _store;

  Future<ApplicantProfile> call() => _store.load();
}
