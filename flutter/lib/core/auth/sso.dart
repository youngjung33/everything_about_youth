import '../network/api_client.dart';
import '../network/api_error_code.dart';
import 'pkce.dart';

/// 지원하는 소셜 로그인. 로그인 화면은 이 네 가지를 **항상** 보여주고, 서버에 설정이 있는 것만 누를 수 있다.
/// (서버의 `SSO_PROVIDER_IDS` 와 같은 순서·같은 이름)
enum SsoProvider {
  google('google', 'Google'),
  apple('apple', 'Apple'),
  naver('naver', '네이버'),
  kakao('kakao', '카카오');

  const SsoProvider(this.id, this.label);

  /// 서버 API 에서 쓰는 이름
  final String id;

  /// 화면에 보이는 이름
  final String label;
}

/// 사용자가 로그인 창을 닫거나 로그인 업체에서 "취소"를 눌렀다. 오류가 아니므로 조용히 넘어간다.
class SsoCancelledException implements Exception {
  const SsoCancelledException();

  @override
  String toString() => '로그인을 취소했습니다.';
}

/// 로그인 창은 끝났지만 로그인에 실패했다. [message] 는 사용자에게 그대로 보여줘도 된다.
class SsoFailedException implements Exception {
  const SsoFailedException([this.message = '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.']);

  final String message;

  @override
  String toString() => message;
}

/// 로그인 창(시스템 브라우저)을 열고, 서버가 앱으로 돌려보낼 때까지 기다린다.
/// 실제 구현은 `flutter_web_auth_2` 이고, 테스트에서는 가짜로 바꾼다.
abstract interface class SsoLauncher {
  /// [url] 을 열고, 로그인이 끝나 앱 주소로 돌아온 **전체 주소**를 돌려준다.
  /// 사용자가 창을 닫으면 [SsoCancelledException] 을 던진다.
  Future<Uri> authenticate(Uri url);
}

/// 로그인 관련 서버 API (`/auth/providers`, `/auth/sso/*`). 토큰을 붙이지 않는 클라이언트로 부른다.
class SsoClient {
  const SsoClient(this._api);

  final ApiClient _api;

  /// 지금 쓸 수 있는(서버에 설정이 있는) 로그인 방법의 id 들.
  Future<Set<String>> enabledProviders() async {
    final json = await _api.getJson('/auth/providers');
    final list = json['providers'];
    if (list is! List) {
      throw const ApiException('서버 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
    }
    return {
      for (final item in list)
        if (item is Map && item['enabled'] == true && item['id'] is String) item['id'] as String,
    };
  }

  /// 로그인 업체의 인증 주소를 받는다.
  Future<Uri> start({required SsoProvider provider, required String redirectUri, required String codeChallenge}) async {
    final json = await _api.postJson(
      '/auth/sso/start',
      body: {'provider': provider.id, 'redirectUri': redirectUri, 'codeChallenge': codeChallenge},
    );
    final url = json['authorizationUrl'];
    final uri = url is String ? Uri.tryParse(url) : null;
    // 서버가 준 주소라도 https 가 아니면 열지 않는다. (잘못된 설정이나 중간자 공격으로 이상한 주소가 오는 경우)
    if (uri == null || uri.scheme != 'https') {
      throw const ApiException('서버 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
    }
    return uri;
  }

  /// 일회용 티켓을 회원 세션(토큰 쌍)으로 바꾼다.
  Future<Map<String, dynamic>> exchange({required String ticket, required String verifier}) =>
      _api.postJson('/auth/sso/exchange', body: {'ticket': ticket, 'verifier': verifier});
}

/// 소셜 로그인 한 번의 전체 흐름: 시작 → 로그인 창 → 티켓 교환.
///
/// ```
/// 앱                           서버                         로그인 업체
///  │ start(provider, challenge)  │                              │
///  │────────────────────────────▶│  (state 서명, 인증 주소 만듦)   │
///  │◀──── authorizationUrl ──────│                              │
///  │ 시스템 브라우저로 열기 ──────────────────────────────────────▶│ 사용자가 로그인
///  │                             │◀──── code, state ────────────│
///  │                             │  (코드를 토큰으로 바꿔 고유 번호 확인)
///  │◀──── 앱 주소?ticket=… ───────│
///  │ exchange(ticket, verifier)  │
///  │────────────────────────────▶│  (verifier 가 challenge 와 맞는지 확인)
///  │◀──── 회원 세션(JWT) ─────────│
/// ```
///
/// 앱은 로그인 업체의 토큰이나 코드를 **보지 않는다.** 앱이 받는 것은 서버의 일회용 티켓뿐이다.
class SsoSignInFlow {
  const SsoSignInFlow({required this.client, required this.launcher, required this.redirectUri});

  final SsoClient client;
  final SsoLauncher launcher;

  /// 로그인이 끝나고 서버가 앱으로 돌려보낼 주소. 서버의 허용 목록에 있어야 한다.
  final String redirectUri;

  /// 성공하면 회원 세션 JSON 을 돌려준다.
  /// 취소하면 [SsoCancelledException], 실패하면 [SsoFailedException] 또는 [ApiException] 을 던진다.
  Future<Map<String, dynamic>> run(SsoProvider provider) async {
    final pkce = await Pkce.generate();
    final url = await client.start(provider: provider, redirectUri: redirectUri, codeChallenge: pkce.challenge);

    final callback = await launcher.authenticate(url);
    final ticket = ticketFromCallback(callback);

    return client.exchange(ticket: ticket, verifier: pkce.verifier);
  }

  /// 앱으로 돌아온 주소에서 티켓을 꺼낸다. (`?ticket=…`, 취소는 `?error=cancelled`, 그 밖의 실패는 `?error=failed`)
  static String ticketFromCallback(Uri callback) {
    final params = callback.queryParameters;
    final ticket = params['ticket'];
    if (ticket != null && ticket.isNotEmpty) return ticket;
    if (params['error'] == 'cancelled') throw const SsoCancelledException();
    throw const SsoFailedException();
  }
}
