import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/security/field_cipher.dart';
import '../domain/applicant_profile.dart';
import '../domain/repositories/profile_local_store.dart';

/// '내 조건'(나이, 소득, 무주택 여부 등 개인정보)을 이 기기에만 **암호화해서** 저장한다.
/// (웹: localStorage, 모바일: 앱 로컬 저장소. 키는 보안 저장소에 따로 있다 — [FieldCipher])
///
/// 복호화는 비동기라서 사용하기 전에 [load] 로 한 번 읽어 둬야 한다. 읽은 값은 메모리에 두고 [current] 로 바로 쓴다.
/// (앱 시작 때 임대주택의 시작 작업이 [load] 를 부른다)
class ProfileStore implements ProfileLocalStore {
  ProfileStore(this._prefs, this._cipher);

  final SharedPreferences _prefs;
  final FieldCipher _cipher;

  static const storageKey = 'eay.profile.v1';

  /// 암호문을 이 용도에 묶는다. 다른 값의 암호문을 여기에 끼워 넣어도 읽히지 않는다.
  static const cipherContext = 'housing.profile';

  ApplicantProfile _current = ApplicantProfile.empty;
  bool _loaded = false;
  int _saves = 0;

  /// [load] 가 끝난 뒤의 값. 그 전에는 빈 조건이다.
  @override
  ApplicantProfile get current => _current;
  @override
  bool get isLoaded => _loaded;

  /// 저장된 값을 읽어 복호화한다. 값이 없거나 읽을 수 없으면(손상, 변조, 키 분실) 빈 조건이다. 던지지 않는다.
  @override
  Future<ApplicantProfile> load() async {
    final savesBefore = _saves;
    final read = await _read();
    // 읽는 사이에 사용자가 저장했다면 그 값이 더 새롭다. 늦게 끝난 읽기가 덮어쓰면 안 된다.
    if (_saves != savesBefore) return _current;
    _current = read;
    _loaded = true;
    return _current;
  }

  Future<ApplicantProfile> _read() async {
    final raw = _prefs.getString(storageKey);
    if (raw == null) return ApplicantProfile.empty;

    if (AesGcmFieldCipher.looksEncrypted(raw)) {
      final plain = await _cipher.decrypt(raw, context: cipherContext);
      if (plain == null) {
        // 키를 잃었거나(앱 재설치 등) 변조된 값이다. 영영 못 읽으니 지우고, 사용자가 다시 입력하게 한다.
        await _prefs.remove(storageKey);
        return ApplicantProfile.empty;
      }
      return _parse(plain) ?? ApplicantProfile.empty;
    }

    // 암호화 이전 버전이 평문으로 저장한 값. 읽을 수 있으면 지금 암호화해서 다시 저장한다. (한 번만 일어난다)
    final legacy = _parse(raw);
    if (legacy == null) return ApplicantProfile.empty;
    await save(legacy);
    return legacy;
  }

  ApplicantProfile? _parse(String json) {
    try {
      final decoded = jsonDecode(json);
      if (decoded is Map<String, dynamic>) return ApplicantProfile.fromQuery(decoded);
    } on FormatException {
      // 손상된 값은 무시한다.
    }
    return null;
  }

  @override
  Future<void> save(ApplicantProfile profile) async {
    _saves++;
    _current = profile;
    _loaded = true;
    if (profile.isEmpty) {
      await _prefs.remove(storageKey);
    } else {
      await _prefs.setString(storageKey, await _cipher.encrypt(jsonEncode(profile.toQuery()), context: cipherContext));
    }
  }
}
