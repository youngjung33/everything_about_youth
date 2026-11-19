/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class LivingUserMessage implements Exception {
  const LivingUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

/// 삭제·만료된 항목 등. 목록 조합 시 무시한다.
class LivingGuideNotFound extends LivingUserMessage {
  const LivingGuideNotFound([super.message = '안내를 찾을 수 없습니다.']);
}

/// 도메인·기타 예외를 사용자에게 보여 줄 문구로 바꾼다.
String livingErrorMessage(Object error) {
  if (error is LivingUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
