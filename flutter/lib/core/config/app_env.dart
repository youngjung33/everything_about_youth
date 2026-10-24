/// 배포·개발 환경 이름. `--dart-define=APP_ENV=dev|stage|prod`
enum AppEnv {
  dev,
  stage,
  prod;

  static AppEnv parse(String raw, {required bool releaseMode}) {
    final value = raw.trim().toLowerCase();
    if (value.isEmpty) {
      if (releaseMode) {
        throw StateError('release 빌드에는 --dart-define=APP_ENV=dev|stage|prod 가 필요합니다.');
      }
      return AppEnv.dev;
    }
    return AppEnv.values.firstWhere(
      (e) => e.name == value,
      orElse: () => throw StateError('APP_ENV 값이 올바르지 않습니다: "$raw" (dev, stage, prod)'),
    );
  }
}
