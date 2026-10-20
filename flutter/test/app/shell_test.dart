import 'dart:async';

import 'package:everything_about_youth/app/shell/app_footer.dart';
import 'package:everything_about_youth/app/shell/app_header.dart';
import 'package:everything_about_youth/app/shell/menu_items.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_flags.dart';
import 'package:everything_about_youth/core/widgets/app_logo.dart';
import 'package:everything_about_youth/features/home/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_feature.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

const _modules = [FakeFeature('a', title: '서비스A'), FakeFeature('b', title: '서비스B')];
const _wide = Size(1200, 900);
const _narrow = Size(400, 800);

Finder inHeader(Finder f) => find.descendant(of: find.byType(AppHeader), matching: f);
Finder inFooter(Finder f) => find.descendant(of: find.byType(AppFooter), matching: f);
Finder menuButton(String path) => find.byKey(ValueKey('menu:$path'));

/// 메뉴 버튼이 "지금 위치" 색(테마의 primary)으로 칠해졌는지
bool isSelected(WidgetTester tester, String path) {
  final button = tester.widget<TextButton>(menuButton(path));
  final primary = Theme.of(tester.element(menuButton(path))).colorScheme.primary;
  return button.style!.foregroundColor!.resolve({}) == primary;
}

void main() {
  final repo = FakeHousingRepository();

  group('메뉴 항목', () {
    test('홈 + 켜진 서비스로 만든다', () {
      final items = buildMenuItems(_modules);
      expect(items.map((i) => i.label), ['홈', '서비스A', '서비스B']);
      expect(items.map((i) => i.path), ['/', '/a', '/b']);
    });

    test('서비스가 없으면 홈만 남는다', () {
      expect(buildMenuItems(const []).map((i) => i.label), ['홈']);
    });

    test('현재 위치 판정: 홈은 정확히 / 일 때만, 서비스는 그 아래 모든 경로', () {
      final home = buildMenuItems(const []).first;
      expect(home.matches('/'), isTrue);
      expect(home.matches('/housing'), isFalse);

      const housing = AppMenuItem(label: '임대주택', icon: Icons.apartment, path: '/housing');
      expect(housing.matches('/housing'), isTrue);
      expect(housing.matches('/housing/notices/n1'), isTrue);
      expect(housing.matches('/housing2'), isFalse, reason: '이름이 겹치는 다른 경로는 제외');
      expect(housing.matches('/'), isFalse);
    });
  });

  group('넓은 화면', () {
    testWidgets('왼쪽 위에 로고, 그 옆에 메뉴가 펼쳐지고 ☰ 는 없다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide);

      expect(inHeader(find.byType(AppLogo)), findsOneWidget);
      expect(inHeader(find.text('홈')), findsOneWidget);
      expect(inHeader(find.text('서비스A')), findsOneWidget);
      expect(inHeader(find.text('서비스B')), findsOneWidget);
      expect(find.byTooltip('메뉴'), findsNothing);
      expect(find.byType(Drawer), findsNothing);

      // 로고가 메뉴보다 왼쪽에 있고, 헤더의 맨 왼쪽 가까이 있다.
      final logoLeft = tester.getTopLeft(find.byType(AppLogo).first).dx;
      expect(logoLeft, lessThan(60));
      expect(logoLeft, lessThan(tester.getTopLeft(menuButton('/')).dx));
    });

    testWidgets('아래에 푸터(저작권, 안내 문구)가 보인다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide);

      expect(inFooter(find.textContaining('© ')), findsOneWidget);
      expect(inFooter(find.text(AppFooter.disclaimer)), findsOneWidget);
      // 푸터는 화면 맨 아래에 붙어 있다.
      expect(tester.getBottomLeft(find.byType(AppFooter)).dy, tester.view.physicalSize.height);
    });

    testWidgets('메뉴를 누르면 이동하고, 지금 위치가 강조된다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide);
      expect(isSelected(tester, '/'), isTrue);
      expect(isSelected(tester, '/b'), isFalse);

      await tester.tap(menuButton('/b'));
      await tester.pumpAndSettle();
      expect(find.text('b 첫 화면'), findsOneWidget);
      expect(isSelected(tester, '/b'), isTrue);
      expect(isSelected(tester, '/'), isFalse);

      await tester.tap(menuButton('/'));
      await tester.pumpAndSettle();
      expect(find.byType(HomePage), findsOneWidget);
      expect(isSelected(tester, '/'), isTrue);
    });

    testWidgets('로고를 누르면 홈으로 간다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide, location: '/a');
      expect(find.text('a 첫 화면'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('header-logo')));
      await tester.pumpAndSettle();
      expect(find.byType(HomePage), findsOneWidget);
    });

    testWidgets('서버가 끈 서비스는 메뉴에서도 사라지고, 다시 켜면 돌아온다', (tester) async {
      final container = await pumpApp(tester, repo, modules: _modules, size: _wide, disabled: {'b'});
      expect(inHeader(find.text('서비스A')), findsOneWidget);
      expect(inHeader(find.text('서비스B')), findsNothing);

      container.read(featureFlagsProvider.notifier).enable('b');
      await tester.pumpAndSettle();
      expect(inHeader(find.text('서비스B')), findsOneWidget);

      container.read(featureFlagsProvider.notifier).disable('a');
      await tester.pumpAndSettle();
      expect(inHeader(find.text('서비스A')), findsNothing);
    });

    testWidgets('서비스가 아주 많아도 헤더가 넘치지 않는다', (tester) async {
      final many = [for (var i = 0; i < 30; i++) FakeFeature('s$i', title: '아주긴서비스이름$i')];
      await pumpApp(tester, repo, modules: many, size: const Size(800, 900));
      expect(tester.takeException(), isNull);
    });
  });

  group('좁은 화면 (모바일)', () {
    testWidgets('왼쪽 위에 ☰ 와 로고가 있고 메뉴는 헤더에 펼쳐지지 않는다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);

      expect(find.byTooltip('메뉴'), findsOneWidget);
      expect(inHeader(find.byType(AppLogo)), findsOneWidget);
      expect(menuButton('/b'), findsNothing);
      expect(tester.getTopLeft(find.byTooltip('메뉴')).dx, lessThan(tester.getTopLeft(find.byType(AppLogo).first).dx));
    });

    testWidgets('☰ 를 누르면 서랍이 왼쪽에서 열리고, 홈과 켜진 서비스가 나온다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);
      expect(find.byType(NavigationDrawer), findsNothing);

      await tester.tap(find.byTooltip('메뉴'));
      await tester.pumpAndSettle();

      final drawer = find.byType(NavigationDrawer);
      expect(drawer, findsOneWidget);
      expect(tester.getTopLeft(drawer).dx, 0, reason: '왼쪽 끝에서 열린다');
      expect(tester.getBottomRight(drawer).dx, lessThan(_narrow.width), reason: '화면 일부만 덮는다');
      for (final label in ['홈', '서비스A', '서비스B']) {
        expect(find.descendant(of: drawer, matching: find.text(label)), findsOneWidget);
      }
      expect(find.descendant(of: drawer, matching: find.byType(AppLogo)), findsOneWidget);
    });

    testWidgets('서랍에서 항목을 고르면 서랍이 닫히고 그 화면으로 이동한다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);

      await tester.tap(find.byTooltip('메뉴'));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(of: find.byType(NavigationDrawer), matching: find.text('서비스B')));
      await tester.pumpAndSettle();

      expect(find.byType(NavigationDrawer), findsNothing);
      expect(find.text('b 첫 화면'), findsOneWidget);

      // 다시 열면 지금 위치(서비스B)가 선택돼 있다.
      await tester.tap(find.byTooltip('메뉴'));
      await tester.pumpAndSettle();
      final drawer = tester.widget<NavigationDrawer>(find.byType(NavigationDrawer));
      expect(drawer.selectedIndex, 2);
    });

    testWidgets('서랍 바깥을 누르면 닫힌다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);
      await tester.tap(find.byTooltip('메뉴'));
      await tester.pumpAndSettle();

      await tester.tapAt(Offset(_narrow.width - 5, 400));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDrawer), findsNothing);
    });

    testWidgets('푸터는 두 줄로 쌓여 화면 아래에 붙는다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);

      expect(inFooter(find.text(AppFooter.disclaimer)), findsOneWidget);
      expect(inFooter(find.textContaining('© ')), findsOneWidget);
      expect(tester.getBottomLeft(find.byType(AppFooter)).dy, tester.view.physicalSize.height);
      expect(tester.takeException(), isNull);
    });

    testWidgets('화면 크기가 바뀌면 메뉴 방식도 바뀐다 (넓어지면 서랍이 사라지고 메뉴가 펼쳐진다)', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _narrow);
      await tester.tap(find.byTooltip('메뉴'));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDrawer), findsOneWidget);

      tester.view.physicalSize = _wide;
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDrawer), findsNothing);
      expect(menuButton('/b'), findsOneWidget);
    });
  });

  group('헤더·푸터가 없는 곳과 있는 곳', () {
    testWidgets('스플래시에는 헤더와 푸터가 없고, 시작 작업이 끝나면 생긴다', (tester) async {
      final gate = Completer<void>();
      await pumpApp(
        tester,
        repo,
        modules: _modules,
        settle: false,
        tasks: [BootstrapTask(name: 'gate', run: (ref) => gate.future)],
      );
      expect(find.byType(AppHeader), findsNothing);
      expect(find.byType(AppFooter), findsNothing);

      gate.complete();
      await tester.pumpAndSettle();
      expect(find.byType(AppHeader), findsOneWidget);
      expect(find.byType(AppFooter), findsOneWidget);
    });

    testWidgets('서비스 화면이 바뀌어도 헤더와 푸터는 그대로 하나만 있다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide);
      final header = tester.element(find.byType(AppHeader));

      await tester.tap(menuButton('/a'));
      await tester.pumpAndSettle();
      await tester.tap(menuButton('/b'));
      await tester.pumpAndSettle();

      expect(find.byType(AppHeader), findsOneWidget);
      expect(find.byType(AppFooter), findsOneWidget);
      expect(tester.element(find.byType(AppHeader)), same(header), reason: '화면이 바뀌어도 다시 만들지 않는다');
    });

    testWidgets('꺼진 서비스의 안내 화면에도 헤더와 푸터가 있다', (tester) async {
      await pumpApp(tester, repo, modules: _modules, size: _wide, location: '/b', disabled: {'b'});
      expect(find.text('서비스B 서비스는 지금 사용할 수 없습니다.'), findsOneWidget);
      expect(find.byType(AppHeader), findsOneWidget);
      expect(find.byType(AppFooter), findsOneWidget);
    });
  });

  testWidgets('임대주택 화면: 헤더 아래에 자기 앱바와 필터가 정상으로 나온다 (넓은/좁은 화면)', (tester) async {
    final repo = FakeHousingRepository();
    await pumpApp(tester, repo, location: '/housing', size: _wide);
    expect(tester.takeException(), isNull);
    expect(find.byType(AppHeader), findsOneWidget);

    await pumpApp(tester, repo, location: '/housing', size: _narrow);
    expect(tester.takeException(), isNull);
    expect(find.byTooltip('메뉴'), findsOneWidget);
    expect(find.byTooltip('필터'), findsOneWidget);
  });
}
