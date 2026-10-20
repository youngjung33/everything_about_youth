import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/layout/app_top_bar.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_fonts.dart';
import '../../core/widgets/app_logo.dart';
import 'menu_items.dart';

/// 이 너비 이상이면 메뉴를 헤더에 펼쳐 보여주고, 그보다 좁으면 왼쪽에서 열리는 서랍 메뉴로 보여준다.
const double kInlineMenuWidth = 760;

/// 왼쪽 위의 로고와 메뉴. 앱의 공통 상단바([AppTopBar])를 상속한다.
/// 상태바(노치) 영역은 [AppScaffold] 가 처리하므로 여기서는 신경 쓰지 않는다.
///
/// - 넓은 화면: `[로고] [홈] [임대주택] …`
/// - 좁은 화면: `[☰] [로고]` — ☰ 를 누르면 왼쪽에서 서랍 메뉴가 열린다. ([AppDrawer])
class AppHeader extends AppTopBar {
  AppHeader({super.key, required List<AppMenuItem> items, required String location, required bool inlineMenu})
    : super(
        automaticallyImplyLeading: false,
        titleSpacing: inlineMenu ? 24 : 0,
        leading: inlineMenu ? null : const _DrawerToggle(),
        title: _HeaderTitle(items: items, location: location, inlineMenu: inlineMenu),
      );
}

class _DrawerToggle extends StatelessWidget {
  const _DrawerToggle();

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: '메뉴',
      icon: const Icon(Icons.menu),
      // 이 위젯은 AppScaffold 의 body 안에 있으므로 바깥 Scaffold 의 서랍을 연다.
      onPressed: () => Scaffold.of(context).openDrawer(),
    );
  }
}

class _HeaderTitle extends StatelessWidget {
  const _HeaderTitle({required this.items, required this.location, required this.inlineMenu});

  final List<AppMenuItem> items;
  final String location;
  final bool inlineMenu;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // 로고를 누르면 홈으로
        InkWell(
          key: const ValueKey('header-logo'),
          borderRadius: BorderRadius.circular(8),
          onTap: () => context.go(AppMenuItem.homePath),
          child: const Padding(padding: EdgeInsets.symmetric(vertical: 6, horizontal: 2), child: AppLogo()),
        ),
        if (inlineMenu) ...[
          const SizedBox(width: 24),
          // 서비스가 많아져 좁아져도 넘치지 않고 가로로 밀린다.
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final item in items)
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: _MenuButton(item: item, selected: item.matches(location)),
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _MenuButton extends StatelessWidget {
  const _MenuButton({required this.item, required this.selected});

  final AppMenuItem item;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Semantics(
      selected: selected,
      child: TextButton.icon(
        key: ValueKey('menu:${item.path}'),
        onPressed: () => context.go(item.path),
        icon: Icon(item.icon, size: 20),
        label: Text(item.label),
        style: TextButton.styleFrom(
          foregroundColor: selected ? scheme.primary : AppColors.textSecondary,
          backgroundColor: selected ? scheme.primaryContainer.withValues(alpha: 0.5) : null,
          textStyle: TextStyle(fontWeight: selected ? AppFonts.bold : AppFonts.regular),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }
}
