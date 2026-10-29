import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/housing/domain/failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('housingErrorMessage', () {
    test('HousingUserMessage 는 message 를 그대로', () {
      expect(housingErrorMessage(const HousingUserMessage('서버 오류')), '서버 오류');
      expect(housingErrorMessage(const HousingNoticeNotFound('없음')), '없음');
    });

    test('그 외는 일반 문구', () {
      expect(housingErrorMessage(const ApiException('x')), '알 수 없는 오류가 발생했습니다.');
      expect(housingErrorMessage(Exception('x')), '알 수 없는 오류가 발생했습니다.');
    });
  });
}
