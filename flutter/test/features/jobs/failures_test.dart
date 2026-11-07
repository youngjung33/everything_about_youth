import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/jobs/domain/failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('jobsErrorMessage', () {
    test('JobsUserMessage 는 message 를 그대로', () {
      expect(jobsErrorMessage(const JobsUserMessage('서버 오류')), '서버 오류');
      expect(jobsErrorMessage(const JobPostingNotFound('없음')), '없음');
    });

    test('그 외는 일반 문구', () {
      expect(jobsErrorMessage(const ApiException('x')), '알 수 없는 오류가 발생했습니다.');
      expect(jobsErrorMessage(Exception('x')), '알 수 없는 오류가 발생했습니다.');
    });
  });
}
