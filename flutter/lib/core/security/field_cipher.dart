import 'dart:convert';

import 'package:cryptography/cryptography.dart';

import 'cipher_key_store.dart';

/// 개인정보 같은 민감한 값을 문자열 하나로 암호화/복호화하는 규격.
///
/// [context] 는 "이 값이 어디에 쓰이는지"(예: `housing.profile`)를 적은 문자열이다. 암호문에 묶여 있어서
/// 다른 용도의 암호문을 바꿔치기해서 읽게 만드는 일을 막는다. 암호화와 복호화에 같은 값을 줘야 한다.
abstract interface class FieldCipher {
  Future<String> encrypt(String plain, {required String context});

  /// 복호화한다. 키가 다르거나(앱 재설치로 키를 잃음) 값이 변조됐거나 [context] 가 다르면 **null** 이다.
  /// 예외로 앱이 죽는 대신 "없는 값"으로 다루고, 호출하는 쪽이 새로 받게 한다.
  Future<String?> decrypt(String token, {required String context});
}

/// AES-256-GCM (암호화와 변조 검사를 함께 하는 방식).
///
/// 암호문 형식: `v1.<base64url(nonce 12바이트 | 암호문 | 인증 태그 16바이트)>` (패딩 `=` 없음)
/// - 암호화할 때마다 새 무작위 nonce 를 쓰므로 같은 값도 매번 다른 암호문이 된다.
/// - 서버의 `AesGcmFieldCipher`(next/src/common/infrastructure/crypto)와 같은 형식이다.
class AesGcmFieldCipher implements FieldCipher {
  AesGcmFieldCipher(this._keys, {AesGcm? algorithm}) : _algorithm = algorithm ?? AesGcm.with256bits();

  final CipherKeyStore _keys;
  final AesGcm _algorithm;

  static const version = 'v1';
  static const _prefix = '$version.';
  static const _nonceBytes = 12;
  static const _macBytes = 16;

  @override
  Future<String> encrypt(String plain, {required String context}) async {
    final key = SecretKey(await _keys.key());
    final box = await _algorithm.encrypt(utf8.encode(plain), secretKey: key, aad: utf8.encode(context));
    return '$_prefix${base64Url.encode(box.concatenation()).replaceAll('=', '')}';
  }

  @override
  Future<String?> decrypt(String token, {required String context}) async {
    if (!token.startsWith(_prefix)) return null;
    try {
      final bytes = base64Url.decode(base64Url.normalize(token.substring(_prefix.length)));
      if (bytes.length < _nonceBytes + _macBytes) return null;

      final box = SecretBox.fromConcatenation(bytes, nonceLength: _nonceBytes, macLength: _macBytes);
      final clear = await _algorithm.decrypt(box, secretKey: SecretKey(await _keys.key()), aad: utf8.encode(context));
      return utf8.decode(clear);
    } catch (_) {
      // 인증 실패(변조/다른 키/다른 context), 깨진 base64, 깨진 UTF-8 모두 "읽을 수 없음"이다.
      return null;
    }
  }

  /// [encrypt] 가 만든 형식인지 (복호화 가능 여부와는 무관)
  static bool looksEncrypted(String value) => value.startsWith(_prefix);
}
