import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_tokens.dart';

/// 토큰을 기기에 보관하는 곳. 저장이 안 돼도 앱은 동작해야 하므로 구현은 실패를 던지지 않는다.
/// (저장 실패 = 다음 실행 때 세션을 새로 발급받을 뿐)
abstract interface class TokenStore {
  Future<AuthTokens?> read();
  Future<void> write(AuthTokens tokens);
  Future<void> clear();
}

/// 메모리에만 두는 저장소. 테스트와 보안 저장소를 쓸 수 없을 때의 대체.
class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this._tokens]);

  AuthTokens? _tokens;

  @override
  Future<AuthTokens?> read() async => _tokens;

  @override
  Future<void> write(AuthTokens tokens) async => _tokens = tokens;

  @override
  Future<void> clear() async => _tokens = null;
}

/// 플랫폼 보안 저장소(iOS Keychain, Android Keystore 로 암호화, 웹은 WebCrypto 로 암호화한 localStorage).
/// 평문 SharedPreferences 에는 토큰을 두지 않는다.
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const key = 'eay.auth.tokens.v1';

  final FlutterSecureStorage _storage;

  @override
  Future<AuthTokens?> read() async {
    try {
      return AuthTokens.decode(await _storage.read(key: key));
    } catch (e) {
      debugPrint('[auth] 저장된 토큰을 읽지 못했습니다: $e');
      return null;
    }
  }

  @override
  Future<void> write(AuthTokens tokens) async {
    try {
      await _storage.write(key: key, value: tokens.encode());
    } catch (e) {
      debugPrint('[auth] 토큰을 저장하지 못했습니다: $e');
    }
  }

  @override
  Future<void> clear() async {
    try {
      await _storage.delete(key: key);
    } catch (e) {
      debugPrint('[auth] 저장된 토큰을 지우지 못했습니다: $e');
    }
  }
}
