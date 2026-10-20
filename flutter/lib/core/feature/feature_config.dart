import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../network/api_client.dart';
import '../network/api_error_code.dart';

/// 서버가 관리하는 서비스 켜짐/꺼짐을 받아 온다. (id → 켜짐 여부)
///
/// 서버 응답에 없는 서비스는 앱의 기본값([FeatureModule.defaultEnabled])을 쓰므로 이 맵에는 서버가 말한 것만 들어 있다.
abstract interface class FeatureConfigRemote {
  Future<Map<String, bool>> fetch();
}

/// 서버 JSON API(`GET /features`)로 받아 온다.
class ApiFeatureConfigRemote implements FeatureConfigRemote {
  ApiFeatureConfigRemote(this._api);

  final ApiClient _api;

  @override
  Future<Map<String, bool>> fetch() async => parseFeatureConfig(await _api.getJson('/features'));
}

/// `{"features": [{"id": "housing", "enabled": true}]}` 를 읽는다. 형식이 맞지 않는 항목은 건너뛴다.
Map<String, bool> parseFeatureConfig(Map<String, dynamic> json) {
  final list = json['features'];
  if (list is! List) throw const ApiException('서비스 설정 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
  return {
    for (final item in list)
      if (item is Map && item['id'] is String && item['enabled'] is bool) item['id'] as String: item['enabled'] as bool,
  };
}

/// 마지막으로 받은 서버 설정. 다음에 서버에 닿지 못해도 직전 설정으로 시작하려고 기기에 남긴다.
abstract interface class FeatureConfigCache {
  Map<String, bool> read();
  Future<void> write(Map<String, bool> config);
}

class SharedPrefsFeatureConfigCache implements FeatureConfigCache {
  SharedPrefsFeatureConfigCache(this._prefs);

  static const key = 'eay.features.v1';

  final SharedPreferences _prefs;

  @override
  Map<String, bool> read() {
    final raw = _prefs.getString(key);
    if (raw == null) return const {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const {};
      return {
        for (final entry in decoded.entries)
          if (entry.key is String && entry.value is bool) entry.key as String: entry.value as bool,
      };
    } on FormatException {
      return const {}; // 깨진 값은 없는 것으로 본다
    }
  }

  @override
  Future<void> write(Map<String, bool> config) => _prefs.setString(key, jsonEncode(config));
}
