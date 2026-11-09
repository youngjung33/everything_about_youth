/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class JobsUserMessage implements Exception {
  const JobsUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

class JobPostingNotFound extends JobsUserMessage {
  const JobPostingNotFound([super.message = '공고를 찾을 수 없습니다.']);
}

String jobsErrorMessage(Object error) {
  if (error is JobsUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
