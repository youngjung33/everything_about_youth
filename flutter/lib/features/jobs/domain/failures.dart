/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class JobsUserMessage implements Exception {
  const JobsUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

/// 삭제·만료된 항목 등. 목록 조합 시 무시한다.
class JobPostingNotFound extends JobsUserMessage {
  const JobPostingNotFound([super.message = '채용 공고를 찾을 수 없습니다.']);
}

/// 도메인·기타 예외를 사용자에게 보여 줄 문구로 바꾼다.
String jobsErrorMessage(Object error) {
  if (error is JobsUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
