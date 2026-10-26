import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/feature/feature_flags.dart';
import '../../core/update/optional_update_banner.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/theme/app_colors.dart';
import 'app_drawer.dart';
import 'app_footer.dart';
import 'app_header.dart';
import 'menu_items.dart';

/// 스플래시를 뺀 모든 화면을 감싸는 공통 틀: 위에 헤더(로고·메뉴), 아래에 푸터.
/// 좁은 화면에서는 헤더의 ☰ 로 왼쪽 서랍 메뉴를 연다.
///
/// 상태바·홈 인디케이터·내비게이션바·키보드 처리는 [AppScaffold] 가 맡는다. 이 틀이 위·아래·좌우 여백을 처리하고
/// 안쪽 화면에는 "이미 처리됨"으로 전달하므로, 안쪽 화면이 [AppScaffold] 를 또 써도 여백이 두 번 더해지지 않는다.
///
/// 각 화면(홈, 서비스, 안내)은 이 틀 안에서 [child] 로 바뀐다. 헤더·푸터는 화면이 바뀌어도 다시 만들어지지 않는다.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.location, required this.child});

  /// 현재 주소의 path. 메뉴에서 지금 항목을 강조하는 데 쓴다.
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = buildMenuItems(ref.watch(enabledFeaturesProvider));
    final inline = MediaQuery.sizeOf(context).width >= kInlineMenuWidth;

    return AppScaffold(
      appBar: AppHeader(items: items, location: location, inlineMenu: inline),
      drawer: inline ? null : AppDrawer(items: items, location: location),
      bottomBar: AppFooter(wide: inline),
      bottomBarColor: AppColors.surface,
      body: OptionalUpdateBanner(child: child),
    );
  }
}
