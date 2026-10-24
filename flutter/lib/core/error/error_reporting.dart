import 'package:flutter/foundation.dart';

import '../config/app_runtime.dart';

/// 처리되지 못한 오류가 한 곳에서 걸러지도록 전역 처리기를 설치한다.
///
/// - 위젯 빌드 오류(`FlutterError`): 그 위젯만 오류 표시로 바뀌고 나머지 화면은 그대로다. 기록만 남긴다.
/// - 처리되지 않은 비동기 오류: true 를 돌려줘서 앱이 중단되지 않게 하고, 기록만 남긴다.
///
/// 서비스 하나의 오류가 다른 서비스와 앱 전체로 번지지 않게 하는 마지막 안전망이다.
/// 오류 수집 도구(Crashlytics, Sentry 등)를 붙일 때는 [reportError] 한 곳만 고치면 된다.
void installGlobalErrorHandlers() {
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    reportError(details.exception, details.stack, source: 'flutter');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    reportError(error, stack, source: 'async');
    return true;
  };
}

/// 오류를 기록한다. 지금은 콘솔에만 남긴다.
void reportError(Object error, StackTrace? stack, {required String source}) {
  debugPrint('[error:${AppRuntime.env.name}:$source] $error');
}
