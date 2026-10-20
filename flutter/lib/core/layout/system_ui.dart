import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 상태바·내비게이션바(시스템 UI) 설정. 앱 전체에서 하나만 쓴다.
///
/// - **edge-to-edge**: 앱 화면이 상태바·내비게이션바 뒤까지 그려진다. 그 영역을 피하는 일은 [AppScaffold] 의 SafeArea 가 맡는다.
///   Android 15 이상은 시스템이 이걸 강제하고, 그 아래 버전(갤럭시 구형 포함)은 이 설정으로 맞춘다. 그래야 기기마다 같게 동작한다.
/// - **투명 바 + 어두운 아이콘**: 앱 배경이 밝으므로 아이콘은 어둡게. iOS 는 `statusBarBrightness` 가 반대 의미라서 light 로 둔다.
/// - **대비 강제 끄기**: Android 가 3버튼 내비게이션바 뒤에 반투명 막을 덧씌우는 것을 막는다. (갤럭시에서 아래쪽이 이상하게 어두워지는 원인)
///
/// [AppTopBar] 와 [AppTheme] 도 같은 값을 쓴다. AppBar 가 자기 기본 스타일(내비게이션바를 검게)로 덮어쓰지 못하게 하려는 것.
class AppSystemUi {
  const AppSystemUi._();

  static const _transparent = Color(0x00000000);

  static const style = SystemUiOverlayStyle(
    statusBarColor: _transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemStatusBarContrastEnforced: false,
    systemNavigationBarColor: _transparent,
    systemNavigationBarDividerColor: _transparent,
    systemNavigationBarIconBrightness: Brightness.dark,
    systemNavigationBarContrastEnforced: false,
  );

  /// 앱 시작 때 한 번 부른다. 웹에는 시스템 바가 없으므로 아무것도 하지 않는다.
  static Future<void> apply() async {
    if (kIsWeb) return;
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setSystemUIOverlayStyle(style);
  }
}
