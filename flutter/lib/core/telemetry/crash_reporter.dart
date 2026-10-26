import 'package:flutter/foundation.dart';

/// 크래시·비정상 오류 수집. 2차에 Firebase Crashlytics 구현을 여기에 연결한다.
abstract interface class CrashReporter {
  void recordFlutterError(FlutterErrorDetails details);
  void recordError(Object error, StackTrace? stack, {String? reason});
}

/// 1차: 콘솔만. [installCrashReporter] 로 교체한다.
class NoopCrashReporter implements CrashReporter {
  @override
  void recordFlutterError(FlutterErrorDetails details) {
    debugPrint('[crash] ${details.exception}');
  }

  @override
  void recordError(Object error, StackTrace? stack, {String? reason}) {
    debugPrint('[crash${reason == null ? '' : ':$reason'}] $error');
  }
}

CrashReporter _crashReporter = NoopCrashReporter();

CrashReporter get crashReporter => _crashReporter;

void installCrashReporter(CrashReporter reporter) {
  _crashReporter = reporter;
}
