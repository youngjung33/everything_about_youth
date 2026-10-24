import 'app_env.dart';

/// 오류 로그 등에 붙는 실행 환경. [main] 에서 한 번 설정한다.
class AppRuntime {
  AppRuntime._();

  static AppEnv env = AppEnv.dev;

  static void install(AppEnv value) {
    env = value;
  }
}
