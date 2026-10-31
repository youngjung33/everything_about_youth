import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/benefits/domain/failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('benefitsErrorMessage', () {
    test('BenefitsUserMessage 는 message 를 그대로', () {
      expect(benefitsErrorMessage(const BenefitsUserMessage('서버 오류')), '서버 오류');
      expect(benefitsErrorMessage(const BenefitsProgramNotFound('없음')), '없음');
    });

    test('그 외는 일반 문구', () {
      expect(benefitsErrorMessage(const ApiException('x')), '알 수 없는 오류가 발생했습니다.');
      expect(benefitsErrorMessage(Exception('x')), '알 수 없는 오류가 발생했습니다.');
    });
  });
}
