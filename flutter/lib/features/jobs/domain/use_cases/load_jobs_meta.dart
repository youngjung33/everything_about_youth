import '../jobs_meta.dart';
import '../jobs_repository.dart';

class LoadJobsMetaUseCase {
  const LoadJobsMetaUseCase(this._repository);

  final JobsRepository _repository;

  Future<JobsMeta> call() => _repository.fetchMeta();
}
