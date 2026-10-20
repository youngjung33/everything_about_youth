import 'package:flutter/material.dart';

import 'system_ui.dart';

/// 앱의 모든 상단바. `AppBar` 를 상속해서 공통 규칙을 한곳에 둔다.
///
/// 평소에는 [AppScaffold] 의 `appBar:` 로만 쓴다. 규칙:
/// - `primary: false` — 상태바(노치) 높이를 AppBar 가 스스로 더하지 않는다. [AppScaffold] 가 SafeArea 안에 넣어서
///   한 번만 처리하므로, 중첩된 화면(헤더 아래 페이지 상단바)에서 상태바 높이가 두 번 더해지지 않는다.
/// - 시스템 UI 스타일을 [AppSystemUi.style] 로 고정 — AppBar 기본값이 안드로이드 내비게이션바를 검게 덮어쓰는 것을 막는다.
/// - 모양(평평하고 아래 구분선만, 왼쪽 정렬)은 `AppTheme` 의 `appBarTheme` 에서 정한다.
///
/// AppBar 의 다른 옵션이 필요해지면 여기에 인자를 추가한다. (화면에서 `AppBar` 를 직접 쓰지 않는다)
class AppTopBar extends AppBar {
  AppTopBar({super.key, super.title, super.leading, super.actions, super.automaticallyImplyLeading, super.titleSpacing})
    : super(primary: false, systemOverlayStyle: AppSystemUi.style);
}
