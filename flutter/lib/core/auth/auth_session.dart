import 'dart:async';

import '../network/api_client.dart';
import '../network/auth_token_source.dart';
import 'auth_tokens.dart';
import 'token_store.dart';

/// 서버 세션(JWT) 관리.
///
/// - 처음에는 `POST /auth/session` 으로 토큰 쌍을 받는다. (서버가 기기 id 를 만들어 토큰에 넣는다)
/// - 액세스 토큰이 만료되면 `POST /auth/refresh` 로 새로 받는다.
/// - 리프레시도 거절되면(만료·폐기·서버 DB 초기화) 새 세션을 시작한다.
/// - 여러 요청이 동시에 갱신을 요구해도 서버 호출은 한 번만 한다.
///
/// 앱은 기기 id 를 직접 다루지 않는다. 서버가 토큰에 넣어 준 값을 서버가 읽을 뿐이다.
class AuthSession implements AuthTokenSource {
  /// [plainApi] 는 토큰을 붙이지 않는 클라이언트여야 한다. (세션을 얻는 호출에 세션이 필요해지면 안 된다)
  AuthSession({required ApiClient plainApi, required TokenStore store, DateTime Function()? clock})
    : _api = plainApi,
      _store = store,
      _clock = clock ?? DateTime.now;

  final ApiClient _api;
  final TokenStore _store;
  final DateTime Function() _clock;

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
    return _adopt(await _api.postJson('/auth/session'));
  }

  Future<String> _adopt(Map<String, dynamic> json) async {
    final tokens = AuthTokens.fromSessionJson(json, now: _clock());
    _tokens = tokens;
    await _store.write(tokens);
    return tokens.accessToken;
  }

  /// 저장된 세션을 지운다. (다음 요청에서 새 세션을 받는다)
  Future<void> clear() async {
    _tokens = null;
    _loaded = true;
    await _store.clear();
  }
}
