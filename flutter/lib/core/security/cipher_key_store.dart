import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 암호화 키를 보관하는 곳.
abstract interface class CipherKeyStore {
  /// 32바이트(AES-256) 키. 처음 부르면 만들어서 보관한다.
  Future<List<int>> key();
}

const _keyBytes = 32;

List<int> _randomKey(Random random) => List<int>.generate(_keyBytes, (_) => random.nextInt(256));

/// 메모리에만 두는 키. 테스트용이고, 앱을 끄면 사라진다.
class MemoryCipherKeyStore implements CipherKeyStore {
  MemoryCipherKeyStore([List<int>? key]) : _key = key;

  List<int>? _key;

  @override
  Future<List<int>> key() async => _key ??= _randomKey(Random.secure());
}

/// 플랫폼 보안 저장소(iOS Keychain, Android Keystore)에 키를 둔다.
///
/// - 암호문(SharedPreferences)과 키(보안 저장소)를 **다른 곳에** 두는 것이 핵심이다. 앱 저장소 파일만 유출돼도 읽을 수 없다.
/// - 보안 저장소를 쓸 수 없으면(기기 문제) 이번 실행에서만 쓰는 메모리 키로 계속한다. 이때 이전에 암호화한 값은
///   읽을 수 없어 "없는 값"이 되고(앱은 정상), 사용자는 다시 입력하면 된다. **키를 평문 파일에 두는 대체는 하지 않는다.**
/// - 웹은 브라우저 저장소(WebCrypto + localStorage)에 키를 두므로, 같은 브라우저 프로필에 접근할 수 있는 사람에게는
///   막지 못한다. (웹의 한계. 모바일에서만 기기 보안 저장소의 보호를 받는다)
class SecureCipherKeyStore implements CipherKeyStore {
  SecureCipherKeyStore({FlutterSecureStorage? storage, Random? random})
    : _storage = storage ?? const FlutterSecureStorage(),
      _random = random ?? Random.secure();

  static const storageKey = 'eay.cipher.key.v1';

  final FlutterSecureStorage _storage;
  final Random _random;
  Future<List<int>>? _loading;

  @override
  Future<List<int>> key() => _loading ??= _load();

  Future<List<int>> _load() async {
    String? saved;
    try {
      saved = await _storage.read(key: storageKey);
    } catch (e) {
      // 읽기 오류는 일시적일 수 있다. 저장된 키를 덮어쓰면 다음 실행에 읽혔을 데이터까지 영영 잃으므로,
      // 이번 실행에서만 쓰는 키로 계속하고 저장소는 건드리지 않는다.
      debugPrint('[security] 암호화 키를 읽지 못해 이번 실행에서만 임시 키를 씁니다: $e');
      return _randomKey(_random);
    }

    if (saved != null) {
      try {
        final bytes = base64Decode(saved);
        if (bytes.length == _keyBytes) return bytes;
      } catch (_) {
        // 아래에서 새로 만든다.
      }
      debugPrint('[security] 저장된 암호화 키가 올바르지 않아 새로 만듭니다.');
    }

    final created = _randomKey(_random);
    try {
      await _storage.write(key: storageKey, value: base64Encode(created));
    } catch (e) {
      debugPrint('[security] 암호화 키를 저장하지 못해 이번 실행에서만 사용합니다: $e');
    }
    return created;
  }
}
