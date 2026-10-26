import 'package:flutter/foundation.dart';

import '../config/app_runtime.dart';
import '../telemetry/crash_reporter.dart';

/// 처리되지 못한 오류가 한 곳에서 걸러지도록 전역 처리기를 설치한다.
///
/// - 위젯 빌드 오류(`FlutterError`): 그 위젯만 오류 표시로 바뀌고 나머지 화면은 그대로다. 기록만 남긴다.
/// - 처리되지 않은 비동기 오류: true 를 돌려줘서 앱이 중단되지 않게 하고, 기록만 남긴다.
///
/// 서비스 하나의 오류가 다른 서비스와 앱 전체로 번지지 않게 하는 마지막 안전망이다.
/// 크래시 수집은 [installCrashReporter] (2차: Firebase Crashlytics) 한 곳만 고친다.
void installGlobalErrorHandlers() {
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    crashReporter.recordFlutterError(details);
    debugPrint('[error:${AppRuntime.env.name}:flutter] ${details.exception}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    reportError(error, stack, source: 'async');
    return true;
  };
}

/// 오류를 기록한다. [crashReporter] 와 콘솔에 남긴다.
void reportError(Object error, StackTrace? stack, {required String source}) {
  debugPrint('[error:${AppRuntime.env.name}:$source] $error');
  crashReporter.recordError(error, stack, reason: source);
}
