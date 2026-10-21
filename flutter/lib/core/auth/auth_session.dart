import 'dart:async';

import '../network/api_client.dart';
import '../network/api_error_code.dart';
import '../network/auth_token_source.dart';
import 'auth_tokens.dart';
import 'token_store.dart';

/// 서버 세션(JWT) 관리.
///
/// - 처음에는 `POST /auth/session` 으로 **비회원** 토큰 쌍을 받는다. (서버가 세션 id 를 만들어 토큰에 넣는다)
/// - 소셜 로그인에 성공하면 [signIn] 으로 **회원** 토큰 쌍으로 바꾼다.
/// - 액세스 토큰이 만료되면 `POST /auth/refresh` 로 새로 받는다.
/// - 리프레시도 거절되면(만료·폐기·서버 DB 초기화):
///   - 비회원이면 새 비회원 세션을 시작한다.
///   - 회원이면 **조용히 비회원이 되지 않는다.** 저장된 세션을 지우고 [onMemberLost] 로 알린다. (다시 로그인 화면으로)
/// - 여러 요청이 동시에 갱신을 요구해도 서버 호출은 한 번만 한다.
///
/// 앱은 세션 id 를 직접 다루지 않는다. 서버가 토큰에 넣어 준 값을 서버가 읽을 뿐이다.
class AuthSession implements AuthTokenSource {
  /// [plainApi] 는 토큰을 붙이지 않는 클라이언트여야 한다. (세션을 얻는 호출에 세션이 필요해지면 안 된다)
  ///
  /// [isMember] 는 지금 회원으로 로그인한 상태인지, [onMemberLost] 는 회원 세션을 되살리지 못했을 때 불린다.
  AuthSession({
    required ApiClient plainApi,
    required TokenStore store,
    DateTime Function()? clock,
    bool Function()? isMember,
    void Function()? onMemberLost,
  }) : _api = plainApi,
       _store = store,
       _clock = clock ?? DateTime.now,
       _isMember = isMember ?? _never,
       _onMemberLost = onMemberLost ?? _ignore;

  static bool _never() => false;
  static void _ignore() {}

  final ApiClient _api;
  final TokenStore _store;
  final DateTime Function() _clock;
  final bool Function() _isMember;
  final void Function() _onMemberLost;

  AuthTokens? _tokens;
  bool _loaded = false;
  Future<String>? _renewing;

  @override
  Future<String> accessToken({String? rejected}) async {
    await _load();
    final tokens = _tokens;
    if (tokens != null && tokens.accessUsable(_clock()) && tokens.accessToken != rejected) {
      return tokens.accessToken;
    }
    // 이미 갱신 중이면 그 결과를 같이 기다린다.
    return _renewing ??= _renew().whenComplete(() => _renewing = null);
  }

  Future<void> _load() async {
    if (_loaded) return;
    _tokens = await _store.read();
    _loaded = true;
  }

  Future<String> _renew() async {
    final current = _tokens;
    if (current != null && current.refreshUsable(_clock())) {
      try {
        return await _adopt(await _api.postJson('/auth/refresh', body: {'refreshToken': current.refreshToken}));
      } on ApiException catch (e) {
        // 401 = 서버가 이 세션을 인정하지 않는다. 새로 시작한다. 그 외(네트워크/서버 오류)는 그대로 알린다.
        if (!e.isUnauthorized) rethrow;
      }
    }
    if (_isMember()) {
      // 회원이던 사람을 비회원 세션으로 바꿔 놓으면, 로그인 상태인 줄 알고 쓰다가 내 정보가 사라진 것처럼 보인다.
      await clear();
      _onMemberLost();
      throw const ApiException('로그인이 만료되었습니다. 다시 로그인해 주세요.', statusCode: 401, code: ApiErrorCode.authRefreshInvalid);
    }
    return _adopt(await _api.postJson('/auth/session'));
  }

  Future<String> _adopt(Map<String, dynamic> json) async {
    final tokens = AuthTokens.fromSessionJson(json, now: _clock());
    _tokens = tokens;
    _loaded = true;
    await _store.write(tokens);
    return tokens.accessToken;
  }

  /// 소셜 로그인 교환(`/auth/sso/exchange`)으로 받은 회원 세션으로 바꾼다.
  Future<void> signIn(Map<String, dynamic> sessionJson) async {
    await _adopt(sessionJson);
  }

  /// 저장된 세션을 지운다. (다음 요청에서 새 비회원 세션을 받는다)
  Future<void> clear() async {
    _tokens = null;
    _loaded = true;
    await _store.clear();
  }
}
