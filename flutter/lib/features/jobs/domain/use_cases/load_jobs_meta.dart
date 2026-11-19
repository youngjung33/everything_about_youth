import '../jobs_meta.dart';
import '../jobs_repository.dart';

/// 필터 선택지·라벨 메타를 서버에서 불러온다.
class LoadJobsMetaUseCase {
  const LoadJobsMetaUseCase(this._repository);

  final JobsRepository _repository; // domain 저장소 포트

  Future<JobsMeta> call() => _repository.fetchMeta();
}
