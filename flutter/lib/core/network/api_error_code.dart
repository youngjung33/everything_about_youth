/// 서버가 돌려주는 오류 코드와 앱이 스스로 붙이는 코드.
///
/// 서버 응답은 항상 `{ "error": { "code", "message", "requestId", "details" } }` 형태이고,
/// 서버 코드는 `next/src/common/presentation/api/errors.ts` 와 `contracts/api/error-codes.json` 과 같다.
/// 화면은 문자열을 직접 비교하지 말고 이 상수나 [ApiException] 의 `isXxx` 를 쓴다.
abstract final class ApiErrorCode {
  // ----- 서버 코드 (contracts/api/error-codes.json · server) -----
  static const badRequest = 'BAD_REQUEST';
  static const notFound = 'NOT_FOUND';
  static const noticeNotFound = 'NOTICE_NOT_FOUND';

  static const authRequired = 'AUTH_REQUIRED';
  static const authTokenExpired = 'AUTH_TOKEN_EXPIRED';
  static const authTokenInvalid = 'AUTH_TOKEN_INVALID';
  static const authRefreshInvalid = 'AUTH_REFRESH_INVALID';
  static const ssoTicketInvalid = 'SSO_TICKET_INVALID';
  static const loginRequired = 'LOGIN_REQUIRED';
  static const forbidden = 'FORBIDDEN';
  static const operatorDisabled = 'OPERATOR_DISABLED';

  static const apiVersionUnsupported = 'API_VERSION_UNSUPPORTED';
  static const appUpdateRequired = 'APP_UPDATE_REQUIRED';

  static const rateLimited = 'RATE_LIMITED';
  static const serviceDisabled = 'SERVICE_DISABLED';
  static const ssoProviderUnavailable = 'SSO_PROVIDER_UNAVAILABLE';
  static const internalError = 'INTERNAL_ERROR';

  /// 서버 JSON 에 나오는 모든 코드. [error_code_contract_test] 와 맞춘다.
  static const serverCodes = {
    badRequest,
    notFound,
    noticeNotFound,
    authRequired,
    authTokenExpired,
    authTokenInvalid,
    authRefreshInvalid,
    ssoTicketInvalid,
    loginRequired,
    forbidden,
    operatorDisabled,
    apiVersionUnsupported,
    appUpdateRequired,
    rateLimited,
    serviceDisabled,
    ssoProviderUnavailable,
    internalError,
  };

  // ----- 앱만 쓰는 코드 (서버까지 가지 못했거나 응답을 읽을 수 없을 때) -----
  static const networkError = 'NETWORK_ERROR';
  static const timeout = 'TIMEOUT';
  static const badResponse = 'BAD_RESPONSE';
  static const unknown = 'UNKNOWN';

  static const clientOnlyCodes = {networkError, timeout, badResponse, unknown};
}
