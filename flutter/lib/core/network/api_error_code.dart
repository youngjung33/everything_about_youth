/// 서버가 돌려주는 오류 코드와 앱이 스스로 붙이는 코드.
///
/// 서버 응답은 항상 `{ "error": { "code", "message", "requestId", "details" } }` 형태이고,
/// 서버 코드는 `next/src/common/presentation/api/errors.ts` 의 `ERROR_CODES` 와 같은 이름이다.
/// 화면은 문자열을 직접 비교하지 말고 이 상수나 [ApiException] 의 `isXxx` 를 쓴다.
abstract final class ApiErrorCode {
  // ----- 서버 코드 -----
  static const badRequest = 'BAD_REQUEST';
  static const notFound = 'NOT_FOUND';
  static const noticeNotFound = 'NOTICE_NOT_FOUND';

  static const authRequired = 'AUTH_REQUIRED';
  static const authTokenExpired = 'AUTH_TOKEN_EXPIRED';
  static const authTokenInvalid = 'AUTH_TOKEN_INVALID';
  static const authRefreshInvalid = 'AUTH_REFRESH_INVALID';

  /// 일회용 로그인 티켓이 없거나 만료됐거나 이미 썼다. (처음부터 다시 로그인)
  static const ssoTicketInvalid = 'SSO_TICKET_INVALID';

  /// 회원만 할 수 있는 일을 비회원 세션으로 요청했다. (회원 탈퇴)
  static const loginRequired = 'LOGIN_REQUIRED';

  /// 서버에 이 로그인 방법의 설정이 아직 없다.
  static const ssoProviderUnavailable = 'SSO_PROVIDER_UNAVAILABLE';

  static const forbidden = 'FORBIDDEN';
  static const operatorDisabled = 'OPERATOR_DISABLED';

  /// 앱이 너무 오래됐다. 업데이트 화면으로 막는다.
  static const appUpdateRequired = 'APP_UPDATE_REQUIRED';

  /// 서버가 이 앱이 쓰는 API 버전을 더 이상 지원하지 않는다. 업데이트 화면으로 막는다.
  static const apiVersionUnsupported = 'API_VERSION_UNSUPPORTED';

  static const rateLimited = 'RATE_LIMITED';
  static const serviceDisabled = 'SERVICE_DISABLED';
  static const internalError = 'INTERNAL_ERROR';

  // ----- 앱이 붙이는 코드 (서버까지 가지 못했거나 응답을 읽을 수 없을 때) -----
  static const networkError = 'NETWORK_ERROR';
  static const timeout = 'TIMEOUT';
  static const badResponse = 'BAD_RESPONSE';

  /// 코드가 없는 응답 (예전 형식이나 프록시가 만든 오류 등)
  static const unknown = 'UNKNOWN';
}
