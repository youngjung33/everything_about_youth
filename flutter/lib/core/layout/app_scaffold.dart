import 'package:flutter/material.dart';

import 'app_top_bar.dart';

/// 앱의 모든 화면이 쓰는 공통 틀. 기기마다 다른 안전 영역(노치, 홈 인디케이터, 갤럭시 내비게이션바, 가로 모드의
/// 카메라 구멍)과 키보드를 **여기서 한 번만** 처리한다. 화면에서 `Scaffold`/`SafeArea` 를 직접 쓰지 않는다.
///
/// 구조 (위에서 아래로):
/// ```
/// ┌ 상태바 영역 ───────────┐  ← 상단바와 같은 색으로 채운다 (색 띠가 생기지 않게)
/// │ SafeArea ▸ [appBar]    │
/// ├────────────────────────┤
/// │ SafeArea ▸ [body]      │  ← 남는 공간. 내용이 길면 body 안에서 스크롤한다
/// ├────────────────────────┤
/// │ SafeArea ▸ [bottomBar] │  ← 배경은 화면 맨 아래(내비게이션바 뒤)까지, 내용은 그 위로
/// └ 홈 인디케이터/내비바 ──┘
/// ```
///
/// - **중첩해도 안전하다.** SafeArea 가 처리한 여백은 아래쪽 위젯에 "이미 처리됨"으로 전달된다. 그래서 공통 틀
///   (헤더·푸터) 안에 페이지가 또 이 위젯을 써도 여백이 두 번 더해지지 않는다.
/// - **키보드**: 올라오면 [bottomBar] 를 숨겨 입력 영역을 확보한다. (키보드가 열린 동안은 하단 안전 영역이 0 이다)
/// - **스크롤**: [body] 는 보통 `ListView`/`SingleChildScrollView` 다. 내용이 짧으면 가운데, 길면 스크롤이어야 하는
///   고정 내용은 [CenteredScrollView] 를 쓴다. 안전 영역 안에서 스크롤하므로 마지막 내용이 가려지지 않는다.
/// - **웹**은 시스템 바가 없어 여백이 0 이므로 자연스럽게 아무 일도 하지 않는다.
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.bottomBar,
    this.bottomBarColor,
    this.drawer,
    this.backgroundColor,
    this.hideBottomBarOnKeyboard = true,
  });

  final AppTopBar? appBar;
  final Widget body;

  /// 화면 아래에 붙는 영역(푸터 등). 안전 영역 처리는 이 위젯이 한다.
  final Widget? bottomBar;

  /// [bottomBar] 배경색. 내비게이션바 뒤까지 이 색으로 칠해진다. 없으면 상단바 색.
  final Color? bottomBarColor;

  /// 왼쪽에서 열리는 서랍 메뉴
  final Widget? drawer;

  final Color? backgroundColor;
  final bool hideBottomBarOnKeyboard;

  /// 테스트에서 영역을 찾는 데 쓴다.
  static const topAreaKey = ValueKey('app-scaffold-top');
  static const bottomAreaKey = ValueKey('app-scaffold-bottom');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final barColor = theme.appBarTheme.backgroundColor ?? theme.colorScheme.surface;
    // Scaffold 바깥에서 읽어야 키보드 높이가 보인다. (Scaffold 안쪽에서는 이미 body 를 줄이고 지운 뒤라 0 이다)
    final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
    final showBottomBar = bottomBar != null && !(hideBottomBarOnKeyboard && keyboardOpen);
    final hasAppBar = appBar != null;

    return Scaffold(
      backgroundColor: backgroundColor,
      drawer: drawer,
      // 키보드가 올라오면 Scaffold 가 body 를 줄여 준다. (resizeToAvoidBottomInset 기본값)
      body: Builder(
        // Scaffold 안쪽의 MediaQuery 를 써야 한다. 바깥 것을 쓰면 Scaffold 가 지운 키보드 높이가 되살아난다.
        builder: (context) => Column(
          children: [
            if (hasAppBar)
              ColoredBox(
                key: topAreaKey,
                color: barColor,
                child: SafeArea(bottom: false, child: appBar!),
              ),
            Expanded(
              child: MediaQuery.removePadding(
                context: context,
                // 위/아래는 위의 상단바·아래의 bottomBar 가 이미 처리했다. 안쪽 화면이 또 더하지 않도록 지운다.
                removeTop: hasAppBar,
                removeBottom: showBottomBar,
                child: SafeArea(child: body),
              ),
            ),
            if (showBottomBar)
              ColoredBox(
                key: bottomAreaKey,
                color: bottomBarColor ?? barColor,
                child: SafeArea(top: false, child: bottomBar!),
              ),
          ],
        ),
      ),
    );
  }
}
