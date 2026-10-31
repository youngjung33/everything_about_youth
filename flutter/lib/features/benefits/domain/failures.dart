/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class BenefitsUserMessage implements Exception {
  const BenefitsUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

class BenefitsProgramNotFound extends BenefitsUserMessage {
  const BenefitsProgramNotFound([super.message = '정책을 찾을 수 없습니다.']);
}

String benefitsErrorMessage(Object error) {
  if (error is BenefitsUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
