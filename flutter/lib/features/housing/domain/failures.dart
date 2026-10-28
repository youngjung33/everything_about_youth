/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다. presentation 은 [message] 를 그대로 보여준다.
class HousingUserMessage implements Exception {
  const HousingUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

/// 삭제·만료된 공고 등. 목록 조합 시 무시한다.
class HousingNoticeNotFound extends HousingUserMessage {
  const HousingNoticeNotFound([super.message = '공고를 찾을 수 없습니다.']);
}

String housingErrorMessage(Object error) {
  if (error is HousingUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
