import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/finance/domain/failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('financeErrorMessage', () {
    test('FinanceUserMessage 는 message 를 그대로', () {
      expect(financeErrorMessage(const FinanceUserMessage('서버 오류')), '서버 오류');
      expect(financeErrorMessage(const FinanceSchemeNotFound('없음')), '없음');
    });

    test('그 외는 일반 문구', () {
      expect(financeErrorMessage(const ApiException('x')), '알 수 없는 오류가 발생했습니다.');
      expect(financeErrorMessage(Exception('x')), '알 수 없는 오류가 발생했습니다.');
    });
  });
}
