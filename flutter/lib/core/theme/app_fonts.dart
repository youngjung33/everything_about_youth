import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

/// 앱에서 쓰는 글꼴과 굵기. 글꼴 파일은 `assets/fonts`, 추가 방법은 `assets/fonts/README.md`.
class AppFonts {
  const AppFonts._();

  static const pretendard = 'Pretendard';

  /// Android 에서 쓸 글꼴 family. 글꼴을 `pubspec.yaml` 에 등록한 뒤 그 이름을 넣는다.
  /// null 이면 Android 에서도 Pretendard 를 쓴다.
  static const String? android = null;

  /// 굵기는 두 가지만 쓴다. (Android 글꼴이 400/700 만 있어도 모양이 같도록)
  /// 위젯에서 `FontWeight.w500`, `w800` 같은 값을 직접 쓰지 말고 이 상수를 쓴다.
  static const regular = FontWeight.w400;
  static const bold = FontWeight.w700;

  /// 선택한 글꼴에 없는 글자가 나올 때 대신 쓸 글꼴
  static const fallback = [pretendard];

  /// 현재 플랫폼에서 쓸 family.
  /// 웹은 브라우저가 Android 여도 항상 Pretendard 를 쓴다. (웹에는 Android 글꼴을 싣지 않으므로)
  static String get family => familyFor(defaultTargetPlatform, isWeb: kIsWeb);

  @visibleForTesting
  static String familyFor(TargetPlatform platform, {required bool isWeb, String? androidFamily = android}) {
    if (!isWeb && platform == TargetPlatform.android && androidFamily != null) return androidFamily;
    return pretendard;
  }
}
