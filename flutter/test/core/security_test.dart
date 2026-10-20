import 'dart:convert';

import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

/// 읽기/쓰기를 마음대로 실패시킬 수 있는 보안 저장소 가짜
class _FlakyStorage extends FlutterSecureStorage {
  _FlakyStorage({this.failRead = false, this.failWrite = false, String? initial}) {
    if (initial != null) values[SecureCipherKeyStore.storageKey] = initial;
  }

  bool failRead;
  bool failWrite;
  final values = <String, String>{};
  int writes = 0;

  @override
  Future<String?> read({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (failRead) throw Exception('keystore unavailable');
    return values[key];
  }

  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (failWrite) throw Exception('keystore unavailable');
    writes++;
    values[key] = value!;
  }
}

void main() {
  group('AesGcmFieldCipher', () {
    late AesGcmFieldCipher cipher;
    setUp(() => cipher = AesGcmFieldCipher(MemoryCipherKeyStore()));

    test('암호화했다가 복호화하면 원래 값 (한글, 이모지, 빈 문자열 포함)', () async {
      for (final plain in ['hello', '{"age":29,"home":"y"}', '청년의 모든 것 🏠', '']) {
        final token = await cipher.encrypt(plain, context: 'ctx');
        expect(await cipher.decrypt(token, context: 'ctx'), plain, reason: plain);
      }
    });

    test('형식은 v1.<base64url> 이고 평문이 보이지 않는다', () async {
      final token = await cipher.encrypt('secret-value', context: 'ctx');
      expect(token, startsWith('v1.'));
      expect(token, matches(RegExp(r'^v1\.[A-Za-z0-9_-]+$')));
      expect(token, isNot(contains('secret')));
      expect(AesGcmFieldCipher.looksEncrypted(token), isTrue);
      expect(AesGcmFieldCipher.looksEncrypted('{"a":1}'), isFalse);
    });

    test('같은 값도 매번 다른 암호문이 된다 (무작위 nonce)', () async {
      final tokens = {for (var i = 0; i < 20; i++) await cipher.encrypt('same', context: 'ctx')};
      expect(tokens, hasLength(20));
    });

    test('다른 키로는 풀리지 않는다', () async {
      final token = await cipher.encrypt('secret', context: 'ctx');
      final other = AesGcmFieldCipher(MemoryCipherKeyStore());
      expect(await other.decrypt(token, context: 'ctx'), isNull);
    });

    test('같은 키를 쓰는 다른 인스턴스는 푼다 (앱을 다시 켠 경우)', () async {
      final key = List<int>.generate(32, (i) => i);
      final token = await AesGcmFieldCipher(MemoryCipherKeyStore(key)).encrypt('secret', context: 'ctx');
      expect(await AesGcmFieldCipher(MemoryCipherKeyStore(key)).decrypt(token, context: 'ctx'), 'secret');
    });

    test('용도(context)가 다르면 풀리지 않는다', () async {
      final token = await cipher.encrypt('secret', context: 'housing.profile');
      expect(await cipher.decrypt(token, context: 'other'), isNull);
    });

    test('한 글자라도 바뀌면 풀리지 않는다 (변조 검사)', () async {
      final token = await cipher.encrypt('secret', context: 'ctx');
      final body = token.substring(3);
      for (final index in [0, body.length ~/ 2, body.length - 1]) {
        final chars = body.split('');
        chars[index] = chars[index] == 'A' ? 'B' : 'A';
        expect(await cipher.decrypt('v1.${chars.join()}', context: 'ctx'), isNull, reason: 'index $index');
      }
    });

    test('이상한 입력은 던지지 않고 null', () async {
      for (final bad in [
        '',
        'v1.',
        'v1.짧음',
        'v1.!!!',
        'v2.AAAA',
        'plain text',
        'v1.${base64Url.encode([1, 2, 3])}',
      ]) {
        expect(await cipher.decrypt(bad, context: 'ctx'), isNull, reason: bad);
      }
    });
  });

  group('SecureCipherKeyStore', () {
    test('처음에는 32바이트 키를 만들어 저장하고, 이후에는 같은 키를 쓴다', () async {
      final storage = _FlakyStorage();
      final first = await SecureCipherKeyStore(storage: storage).key();
      expect(first, hasLength(32));
      expect(storage.writes, 1);

      final second = await SecureCipherKeyStore(storage: storage).key();
      expect(second, first);
      expect(storage.writes, 1);
    });

    test('동시에 여러 번 불러도 키는 하나', () async {
      final storage = _FlakyStorage();
      final store = SecureCipherKeyStore(storage: storage);
      final keys = await Future.wait(List.generate(10, (_) => store.key()));
      expect(keys.map((k) => base64Encode(k)).toSet(), hasLength(1));
      expect(storage.writes, 1);
    });

    test('저장된 키가 깨져 있으면 새로 만들어 덮어쓴다', () async {
      final storage = _FlakyStorage(initial: base64Encode([1, 2, 3]));
      final key = await SecureCipherKeyStore(storage: storage).key();
      expect(key, hasLength(32));
      expect(base64Decode(storage.values[SecureCipherKeyStore.storageKey]!), key);
    });

    test('저장소를 읽지 못하면 이번 실행에서만 임시 키를 쓰고, 저장된 키를 덮어쓰지 않는다', () async {
      final saved = base64Encode(List<int>.generate(32, (i) => i));
      final storage = _FlakyStorage(failRead: true, initial: saved);

      final key = await SecureCipherKeyStore(storage: storage).key();
      expect(key, hasLength(32));
      expect(storage.values[SecureCipherKeyStore.storageKey], saved, reason: '일시적 오류로 진짜 키를 잃으면 안 된다');
      expect(storage.writes, 0);

      // 저장소가 복구되면 원래 키로 돌아온다
      storage.failRead = false;
      expect(await SecureCipherKeyStore(storage: storage).key(), List<int>.generate(32, (i) => i));
    });

    test('저장소에 쓰지 못해도 이번 실행에서는 쓸 수 있다', () async {
      final storage = _FlakyStorage(failWrite: true);
      final store = SecureCipherKeyStore(storage: storage);
      final key = await store.key();
      expect(key, hasLength(32));
      expect(await store.key(), key, reason: '한 실행 안에서는 같은 키');
    });
  });
}
