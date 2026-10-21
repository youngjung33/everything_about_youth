import 'dart:convert';

import 'package:everything_about_youth/core/auth/pkce.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 실제 서버의 JWT 규칙과 오류 템플릿을 흉내 내는 가짜 서버.
///
/// - `POST /api/v1/auth/session` : 새 비회원 토큰 쌍 발급
/// - `POST /api/v1/auth/refresh` : 유효한 refreshToken 이면 새 쌍(회원은 회원으로 유지), 아니면 401 `AUTH_REFRESH_INVALID`
/// - `GET  /api/v1/auth/providers` : 로그인 방법 4개와 [enabledProviders]
/// - `POST /api/v1/auth/sso/start` : 인증 주소 발급 (받은 값은 [lastStart] 에 남긴다)
/// - `POST /api/v1/auth/sso/exchange` : 티켓 [ticket] 과 PKCE verifier 가 맞으면 회원 세션 발급 (한 번만)
/// - `POST /api/v1/auth/logout`, `/account/delete` : 유효한 `Authorization: Bearer` 필요. 탈퇴는 회원만.
/// - 그 외 모든 경로                : 유효한 `Authorization: Bearer` 가 없으면 401 `AUTH_REQUIRED`
///
/// 오류 본문은 서버의 통합 템플릿 `{ error: { code, message, requestId } }` 이다.
class FakeAuthServer {
  FakeAuthServer({this.accessExpiresIn = 900, this.refreshExpiresIn = 3600});

  int accessExpiresIn;
  int refreshExpiresIn;

  final validAccess = <String>{};
  final validRefresh = <String>{};

  /// 회원 세션의 토큰들 (validAccess/validRefresh 의 부분집합)
  final memberAccess = <String>{};
  final memberRefresh = <String>{};

  /// 지금 쓸 수 있는(설정이 있는) 로그인 방법
  Set<String> enabledProviders = {'google', 'apple', 'naver', 'kakao'};

  /// 로그인 창이 끝나고 앱으로 돌려주는 티켓. 이 값으로 교환할 수 있다.
  static const ticket = 'ticket-1';

  /// 마지막 `/auth/sso/start` 의 본문. (provider, redirectUri, codeChallenge)
  Map<String, dynamic>? lastStart;
  bool _ticketUsed = false;

  /// 받은 요청의 "METHOD path" 기록
  final requests = <String>[];

  /// 데이터 요청에 실려 온 Authorization 헤더 기록
  final dataAuthHeaders = <String?>[];

  /// 받은 모든 요청의 헤더 기록 (소문자 키)
  final requestHeaders = <Map<String, String>>[];

  /// 설정하면 모든 요청에 이 상태로 응답한다. (서버 장애 흉내)
  int? failWith;

  /// 설정하면 `/auth/providers` 만 이 상태로 실패한다.
  int? failProvidersWith;

  int _issued = 0;

  int get sessionCalls => requests.where((r) => r == 'POST /api/v1/auth/session').length;
  int get refreshCalls => requests.where((r) => r == 'POST /api/v1/auth/refresh').length;
  int count(String request) => requests.where((r) => r == request).length;
  int get dataCalls => dataAuthHeaders.length;

  /// 서버가 발급했던 모든 토큰을 무효로 만든다. (DB 초기화, 키 교체, 폐기)
  void forgetEveryone() {
    validAccess.clear();
    validRefresh.clear();
    memberAccess.clear();
    memberRefresh.clear();
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
        return _json(_issue(member: memberRefresh.contains(body['refreshToken'])));
      case ('GET', '/api/v1/auth/providers'):
        final failProviders = failProvidersWith;
        if (failProviders != null) return _json(_error('INTERNAL_ERROR', '서버 오류'), failProviders);
        return _json({
          'providers': [
            for (final (id, name) in [('google', 'Google'), ('apple', 'Apple'), ('naver', '네이버'), ('kakao', '카카오')])
              {'id': id, 'name': name, 'enabled': enabledProviders.contains(id)},
          ],
        });
      case ('POST', '/api/v1/auth/sso/start'):
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        if (!enabledProviders.contains(body['provider'])) {
          return _json(_error('SSO_PROVIDER_UNAVAILABLE', '이 로그인 방법은 아직 준비 중입니다.'), 503);
        }
        lastStart = body;
        _ticketUsed = false;
        return _json({'authorizationUrl': 'https://login.test/${body['provider']}?state=s'});
      case ('POST', '/api/v1/auth/sso/exchange'):
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final challenge = lastStart?['codeChallenge'];
        final verifier = body['verifier'];
        final valid =
            !_ticketUsed &&
            body['ticket'] == ticket &&
            verifier is String &&
            challenge == await Pkce.challengeOf(verifier);
        _ticketUsed = true; // 틀려도 소모된다 (서버와 같다)
        if (!valid) return _json(_error('SSO_TICKET_INVALID', '로그인 시간이 지났습니다. 처음부터 다시 시도해 주세요.'), 401);
        return _json(_issue(member: true));
      case ('POST', '/api/v1/auth/logout'):
        final token = _bearer(request);
        if (token == null || !validAccess.contains(token)) {
          return _json(_error('AUTH_REQUIRED', '인증이 필요합니다.'), 401);
        }
        _revokeSessionOf(token);
        return _json({'ok': true});
      case ('POST', '/api/v1/auth/account/delete'):
        final token = _bearer(request);
        if (token == null || !validAccess.contains(token)) {
          return _json(_error('AUTH_REQUIRED', '인증이 필요합니다.'), 401);
        }
        if (!memberAccess.contains(token)) {
          return _json(_error('LOGIN_REQUIRED', '로그인한 회원만 할 수 있습니다.'), 403);
        }
        // 회원의 모든 세션을 없앤다. (이 가짜 서버에는 회원이 한 명뿐이다)
        validAccess.removeAll(memberAccess);
        validRefresh.removeAll(memberRefresh);
        memberAccess.clear();
        memberRefresh.clear();
        return _json({'ok': true});
      default:
        final header = request.headers['Authorization'];
        dataAuthHeaders.add(header);
        final token = _bearer(request);
        if (token == null || !validAccess.contains(token)) {
          return _json(_error('AUTH_REQUIRED', '인증이 필요합니다.'), 401);
        }
        return _json({'ok': true, 'token': token});
    }
  }

  String? _bearer(http.Request request) {
    final header = request.headers['Authorization'];
    return header != null && header.startsWith('Bearer ') ? header.substring(7) : null;
  }

  void _revokeSessionOf(String accessToken) {
    final n = accessToken.split('-').last;
    validAccess.remove(accessToken);
    memberAccess.remove(accessToken);
    validRefresh.remove('refresh-$n');
    memberRefresh.remove('refresh-$n');
  }

  Map<String, Object?> _error(String code, String message) => {
    'error': {'code': code, 'message': message, 'requestId': 'test-request'},
  };

  Map<String, Object?> _issue({bool member = false}) {
    final n = ++_issued;
    validAccess.add('access-$n');
    validRefresh.add('refresh-$n');
    if (member) {
      memberAccess.add('access-$n');
      memberRefresh.add('refresh-$n');
    }
    return {
      'tokenType': 'Bearer',
      'accessToken': 'access-$n',
      'accessExpiresIn': accessExpiresIn,
      'refreshToken': 'refresh-$n',
      'refreshExpiresIn': refreshExpiresIn,
      'member': member,
    };
  }

  http.Response _json(Object body, [int status = 200]) => http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}
