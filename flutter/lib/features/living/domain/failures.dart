/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class LivingUserMessage implements Exception {
  const LivingUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

class LivingGuideNotFound extends LivingUserMessage {
  const LivingGuideNotFound([super.message = '정책을 찾을 수 없습니다.']);
}

String livingErrorMessage(Object error) {
  if (error is LivingUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
