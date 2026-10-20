import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/app_logo.dart';
import 'menu_items.dart';

/// 좁은 화면(모바일)의 메뉴. 헤더의 ☰ 를 누르면 **왼쪽에서** 열린다.
/// 항목을 고르면 서랍을 닫고 그 화면으로 이동한다.
class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key, required this.items, required this.location});

  final List<AppMenuItem> items;
  final String location;

  @override
  Widget build(BuildContext context) {
    final selected = items.indexWhere((item) => item.matches(location));

    return NavigationDrawer(
      selectedIndex: selected < 0 ? null : selected,
      onDestinationSelected: (index) {
        // 이 위젯은 Scaffold 아래에 붙으므로 바깥 Scaffold 의 서랍을 닫을 수 있다.
        Scaffold.of(context).closeDrawer();
        context.go(items[index].path);
      },
      children: [
        const Padding(padding: EdgeInsets.fromLTRB(28, 20, 16, 16), child: AppLogo()),
        for (final item in items) NavigationDrawerDestination(icon: Icon(item.icon), label: Text(item.label)),
        // 서랍은 body 바깥이라 AppScaffold 의 SafeArea 가 닿지 않는다. 마지막 항목이 홈 인디케이터/내비게이션바에
        // 가려지지 않도록 아래 여백을 직접 더한다.
        SizedBox(height: MediaQuery.paddingOf(context).bottom),
      ],
    );
  }
}
