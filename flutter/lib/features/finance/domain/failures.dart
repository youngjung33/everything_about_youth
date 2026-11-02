/// data 레이어가 API 오류를 domain 으로 올릴 때 쓴다.
class FinanceUserMessage implements Exception {
  const FinanceUserMessage(this.message);

  final String message;

  @override
  String toString() => message;
}

class FinanceSchemeNotFound extends FinanceUserMessage {
  const FinanceSchemeNotFound([super.message = '정책을 찾을 수 없습니다.']);
}

String financeErrorMessage(Object error) {
  if (error is FinanceUserMessage) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}
