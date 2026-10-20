import 'package:flutter/foundation.dart';

/// 앱 실행 설정.
///
/// API 서버(Next.js) 주소는 `--dart-define=API_BASE_URL=https://api.example.com` 으로 지정한다.
/// 지정하지 않으면 개발용 기본값을 쓴다. (웹/iOS 시뮬레이터: localhost, Android 에뮬레이터: 10.0.2.2)
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  final String apiBaseUrl;

  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');

  factory AppConfig.fromEnvironment() {
    final explicit = _envBaseUrl.trim();
    return AppConfig(apiBaseUrl: normalizeBaseUrl(explicit.isNotEmpty ? explicit : _defaultBaseUrl()));
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
