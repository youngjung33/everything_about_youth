import 'package:everything_about_youth/core/config/app_config.dart';
import 'package:everything_about_youth/core/config/app_env.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('개발 모드에서는 API_BASE_URL·APP_ENV 없이 기본값을 쓴다', () {
    final config = AppConfig.resolve(apiBaseUrlRaw: '', appEnvRaw: '', releaseMode: false);
    expect(config.env, AppEnv.dev);
    expect(config.apiBaseUrl, isNotEmpty);
  });

  test('release 에서 API_BASE_URL 이 없으면 실패한다', () {
    expect(
      () => AppConfig.resolve(apiBaseUrlRaw: '', appEnvRaw: 'prod', releaseMode: true),
      throwsStateError,
    );
  });

  test('release 에서 APP_ENV 가 없으면 실패한다', () {
    expect(
      () => AppConfig.resolve(apiBaseUrlRaw: 'https://api.example.com', appEnvRaw: '', releaseMode: true),
      throwsStateError,
    );
  });
}
