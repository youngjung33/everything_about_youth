import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('apiExceptionUserMessage', () {
    test('NETWORK_ERROR 는 URL 없이 네트워크 안내만', () {
      const raw = ApiException(
        'dev only http://localhost:3000',
        code: ApiErrorCode.networkError,
      );
      final text = apiExceptionUserMessage(raw);
      expect(text, ApiUserMessages.networkUnavailable);
      expect(text, isNot(contains('http')));
      expect(text, isNot(contains('localhost')));
    });

    test('서버 코드는 서버 message 를 그대로', () {
      const e = ApiException('서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.', code: ApiErrorCode.internalError);
      expect(apiExceptionUserMessage(e), e.message);
    });

    test('알 수 없는 code 도 사용자용 문장이면 그대로', () {
      const e = ApiException('한도', statusCode: 400);
      expect(apiExceptionUserMessage(e), '한도');
    });

    test('HTTP 코드가 들어간 문장은 일반 안내로', () {
      const e = ApiException('요청에 실패했습니다. (HTTP 500)', statusCode: 500);
      expect(apiExceptionUserMessage(e), ApiUserMessages.requestFailed);
    });

    test('BAD_RESPONSE 는 HTTP 코드를 노출하지 않는다', () {
      const e = ApiException('ignored', statusCode: 502, code: ApiErrorCode.badResponse);
      expect(apiExceptionUserMessage(e), ApiUserMessages.badResponse);
      expect(apiExceptionUserMessage(e), isNot(contains('502')));
    });
  });

  group('apiExceptionLogSummary', () {
    test('ApiException 은 code 만', () {
      expect(
        apiExceptionLogSummary(const ApiException('secret url', code: ApiErrorCode.networkError)),
        ApiErrorCode.networkError,
      );
    });

    test('requestId 가 있으면 함께', () {
      expect(
        apiExceptionLogSummary(
          const ApiException('x', code: ApiErrorCode.rateLimited, requestId: 'req-1'),
        ),
        '${ApiErrorCode.rateLimited} requestId=req-1',
      );
    });
  });
}
