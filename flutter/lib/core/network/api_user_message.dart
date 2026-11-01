import 'api_client.dart';
import 'api_error_code.dart';

/// 사용자에게 보여줄 API 오류 문구. URL·내부 주소·HTTP 코드는 넣지 않는다.
abstract final class ApiUserMessages {
  static const networkUnavailable = '서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';
  static const timeout = '서버 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요.';
  static const badResponse = '서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  static const requestFailed = '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

bool isUserSafeApiMessage(String message) {
  if (message.isEmpty) return false;
  final lower = message.toLowerCase();
  if (lower.contains('http://') || lower.contains('https://') || lower.contains('localhost')) {
    return false;
  }
  if (RegExp(r'\bHTTP\s*\d').hasMatch(message)) return false;
  return true;
}

/// [ApiException] 을 화면·스낵바용 문구로 바꾼다.
String apiExceptionUserMessage(ApiException error) {
  switch (error.code) {
    case ApiErrorCode.networkError:
      return ApiUserMessages.networkUnavailable;
    case ApiErrorCode.timeout:
      return ApiUserMessages.timeout;
    case ApiErrorCode.badResponse:
      return ApiUserMessages.badResponse;
    default:
      break;
  }
  if (ApiErrorCode.serverCodes.contains(error.code) && error.message.isNotEmpty) {
    return error.message;
  }
  if (isUserSafeApiMessage(error.message)) return error.message;
  return ApiUserMessages.requestFailed;
}

/// 개발 로그용. 전체 [ApiException.message] 대신 코드(와 requestId)만 남긴다.
String apiExceptionLogSummary(Object error) {
  if (error is ApiException) {
    final id = error.requestId;
    return id == null ? error.code : '${error.code} requestId=$id';
  }
  return error.runtimeType.toString();
}
