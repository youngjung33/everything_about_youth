import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/security/field_cipher.dart';
import '../domain/repositories/saved_notice_local_store.dart';

/// 비회원이 이 기기에만 저장한 관심 공고 id. 암호화해서 둔다.
/// (웹: localStorage, 모바일: 앱 로컬 저장소. 키는 보안 저장소에 따로 있다 — [FieldCipher])
///
/// 로그인한 회원의 목록은 서버에 있고, 로그인할 때 여기 값을 서버에 합친 뒤 비운다.
class SavedNoticeStore implements SavedNoticeLocalStore {
  SavedNoticeStore(this._prefs, this._cipher);

  final SharedPreferences _prefs;
  final FieldCipher _cipher;

  static const storageKey = 'eay.savedNotices.v1';
  static const cipherContext = 'housing.savedNotices';

  /// 서버 `MAX_SAVED_NOTICES` 와 같다. [SavedNoticeLocalStore.maxCount].
  static const maxCount = SavedNoticeLocalStore.maxCount;

  List<String> _current = const [];
  bool _loaded = false;
  int _saves = 0;

  @override
  List<String> get current => _current;
  @override
  bool get isLoaded => _loaded;

  /// 저장된 id 를 읽어 복호화한다. 없거나 읽을 수 없으면 빈 목록. 던지지 않는다.
  @override
  Future<List<String>> load() async {
    final savesBefore = _saves;
    final read = await _read();
    if (_saves != savesBefore) return _current;
    _current = read;
    _loaded = true;
    return _current;
  }

  Future<List<String>> _read() async {
    final raw = _prefs.getString(storageKey);
    if (raw == null) return const [];

    if (AesGcmFieldCipher.looksEncrypted(raw)) {
      final plain = await _cipher.decrypt(raw, context: cipherContext);
      if (plain == null) {
        await _prefs.remove(storageKey);
        return const [];
      }
      return _parse(plain);
    }

    return _parse(raw);
  }

  List<String> _parse(String json) {
    try {
      final decoded = jsonDecode(json);
      if (decoded is! List) return const [];
      final ids = <String>[
        for (final e in decoded)
          if (e is String && e.isNotEmpty) e,
      ];
      final seen = <String>{};
      return [
        for (final id in ids)
          if (seen.add(id)) id,
      ].take(SavedNoticeLocalStore.maxCount).toList();
    } on FormatException {
      return const [];
    }
  }

  /// 목록 전체를 덮어쓴다. 빈 목록이면 키를 지운다.
  @override
  Future<void> replace(List<String> ids) async {
    _saves++;
    final unique = <String>[];
    final seen = <String>{};
    for (final id in ids) {
      if (id.isEmpty || !seen.add(id)) continue;
      unique.add(id);
      if (unique.length >= SavedNoticeLocalStore.maxCount) break;
    }
    _current = unique;
    _loaded = true;
    if (unique.isEmpty) {
      await _prefs.remove(storageKey);
    } else {
      await _prefs.setString(storageKey, await _cipher.encrypt(jsonEncode(unique), context: cipherContext));
    }
  }
}
