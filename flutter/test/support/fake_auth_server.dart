import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 실제 서버의 JWT 규칙과 오류 템플릿을 흉내 내는 가짜 서버.
///
/// - `POST /api/v1/auth/session` : 새 토큰 쌍 발급
/// - `POST /api/v1/auth/refresh` : 유효한 refreshToken 이면 새 쌍, 아니면 401 `AUTH_REFRESH_INVALID`
/// - 그 외 모든 경로                : 유효한 `Authorization: Bearer` 가 없으면 401 `AUTH_REQUIRED`
///
/// 오류 본문은 서버의 통합 템플릿 `{ error: { code, message, requestId } }` 이다.
class FakeAuthServer {
  FakeAuthServer({this.accessExpiresIn = 900, this.refreshExpiresIn = 3600});

  int accessExpiresIn;
  int refreshExpiresIn;

  final validAccess = <String>{};
  final validRefresh = <String>{};

  /// 받은 요청의 "METHOD path" 기록
  final requests = <String>[];

  /// 데이터 요청에 실려 온 Authorization 헤더 기록
  final dataAuthHeaders = <String?>[];

  /// 받은 모든 요청의 헤더 기록 (소문자 키)
  final requestHeaders = <Map<String, String>>[];

  /// 설정하면 모든 요청에 이 상태로 응답한다. (서버 장애 흉내)
  int? failWith;

  int _issued = 0;

  int get sessionCalls => requests.where((r) => r == 'POST /api/v1/auth/session').length;
  int get refreshCalls => requests.where((r) => r == 'POST /api/v1/auth/refresh').length;
  int get dataCalls => dataAuthHeaders.length;

  /// 서버가 발급했던 모든 토큰을 무효로 만든다. (DB 초기화, 키 교체, 폐기)
  void forgetEveryone() {
    validAccess.clear();
    validRefresh.clear();
  }

  /// 액세스 토큰만 무효로 만든다. (만료)
  void expireAccessTokens() => validAccess.clear();

  late final MockClient client = MockClient(_handle);

  Future<http.Response> _handle(http.Request request) async {
    requests.add('${request.method} ${request.url.path}');
    requestHeaders.add({for (final e in request.headers.entries) e.key.toLowerCase(): e.value});
    final failure = failWith;
    if (failure != null) return _json(_error('INTERNAL_ERROR', '서버 오류'), failure);

    switch ((request.method, request.url.path)) {
      case ('POST', '/api/v1/auth/session'):
        return _json(_issue());
      case ('POST', '/api/v1/auth/refresh'):
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        if (!validRefresh.contains(body['refreshToken'])) {
          return _json(_error('AUTH_REFRESH_INVALID', '세션이 유효하지 않습니다.'), 401);
        }
        return _json(_issue());
      default:
        final header = request.headers['Authorization'];
        dataAuthHeaders.add(header);
        final token = header != null && header.startsWith('Bearer ') ? header.substring(7) : null;
        if (token == null || !validAccess.contains(token)) {
          return _json(_error('AUTH_REQUIRED', '인증이 필요합니다.'), 401);
        }
        return _json({'ok': true, 'token': token});
    }
  }

  Map<String, Object?> _error(String code, String message) => {
    'error': {'code': code, 'message': message, 'requestId': 'test-request'},
  };

  Map<String, Object?> _issue() {
    final n = ++_issued;
    validAccess.add('access-$n');
    validRefresh.add('refresh-$n');
    return {
      'tokenType': 'Bearer',
      'accessToken': 'access-$n',
      'accessExpiresIn': accessExpiresIn,
      'refreshToken': 'refresh-$n',
      'refreshExpiresIn': refreshExpiresIn,
    };
  }

  http.Response _json(Object body, [int status = 200]) => http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}
