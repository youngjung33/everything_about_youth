import 'package:flutter/foundation.dart';

import 'app_env.dart';

/// 앱 실행 설정.
///
/// - API 서버: `--dart-define=API_BASE_URL=https://api.example.com`
/// - 환경 이름: `--dart-define=APP_ENV=dev|stage|prod` (release 에서 필수)
///
/// 지정하지 않으면 개발용 기본값을 쓴다. (웹/iOS 시뮬레이터: localhost, Android 에뮬레이터: 10.0.2.2)
class AppConfig {
  const AppConfig({required this.apiBaseUrl, required this.env});

  final String apiBaseUrl;
  final AppEnv env;

  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _appEnv = String.fromEnvironment('APP_ENV');

  factory AppConfig.fromEnvironment() {
    return AppConfig.resolve(apiBaseUrlRaw: _envBaseUrl, appEnvRaw: _appEnv, releaseMode: kReleaseMode);
  }

  @visibleForTesting
  factory AppConfig.resolve({required String apiBaseUrlRaw, required String appEnvRaw, required bool releaseMode}) {
    final env = AppEnv.parse(appEnvRaw, releaseMode: releaseMode);
    final explicit = apiBaseUrlRaw.trim();
    if (releaseMode && explicit.isEmpty) {
      throw StateError('release 빌드에는 --dart-define=API_BASE_URL=https://api.example.com 가 필요합니다.');
    }
    return AppConfig(
      apiBaseUrl: normalizeBaseUrl(explicit.isNotEmpty ? explicit : _defaultBaseUrl()),
      env: env,
    );
  }

  /// 끝의 `/` 를 제거한다.
  static String normalizeBaseUrl(String url) {
    var result = url.trim();
    while (result.endsWith('/')) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }

  static String _defaultBaseUrl() {
    if (kIsWeb) return 'http://localhost:3000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}
