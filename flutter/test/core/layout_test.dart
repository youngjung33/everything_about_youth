import 'package:everything_about_youth/app/shell/app_footer.dart';
import 'package:everything_about_youth/core/layout/app_bottom_sheet.dart';
import 'package:everything_about_youth/core/layout/app_scaffold.dart';
import 'package:everything_about_youth/core/layout/app_top_bar.dart';
import 'package:everything_about_youth/core/layout/centered_scroll_view.dart';
import 'package:everything_about_youth/core/layout/system_ui.dart';
import 'package:everything_about_youth/core/theme/app_theme.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fixtures.dart';
import '../support/pump_app.dart';

/// 기기마다 다른 시스템 영역(노치, 홈 인디케이터, 갤럭시 내비게이션바, 가로 모드 구멍, 키보드)을 흉내 내서
/// 내용이 가려지지 않는지 확인한다. 실제 기기 검증을 대신하지는 못하지만, 구조가 깨지면 여기서 잡힌다.

// 아이폰(노치+홈 인디케이터): 위 47, 아래 34
const _iphone = Size(390, 844);
const _iphoneInsets = EdgeInsets.only(top: 47, bottom: 34);

// 갤럭시(3버튼 내비게이션바): 위 36, 아래 48
const _galaxy = Size(412, 915);
const _galaxyInsets = EdgeInsets.only(top: 36, bottom: 48);

// 가로 모드 + 카메라 구멍: 왼쪽 48, 오른쪽 48
const _landscape = Size(844, 390);
const _landscapeInsets = EdgeInsets.only(left: 48, right: 48, bottom: 21);

NoticePage onePage(List<Map<String, dynamic>> items) => NoticePage.fromJson(pageJson(items: items));

Rect rectOf(WidgetTester tester, Finder f) => tester.getRect(f);

void main() {
  final repo = FakeHousingRepository(
    pages: [
      onePage([summaryJson()]),
    ],
    detail: NoticeDetail.fromJson(detailJson()),
  );

  group('AppTopBar', () {
    testWidgets('AppBar 를 상속하고, 안전 영역은 직접 더하지 않으며, 시스템 바 스타일을 고정한다', (tester) async {
      final bar = AppTopBar(title: const Text('제목'));

      expect(bar, isA<AppBar>());
      expect(bar.primary, isFalse); // 상태바 높이는 AppScaffold 의 SafeArea 가 더한다. 두 번 더하면 상단바가 두꺼워진다.
      expect(bar.systemOverlayStyle, AppSystemUi.style);
    });

    test('시스템 바는 투명하고 아이콘은 어둡고, 갤럭시 내비게이션바 반투명 막을 끈다', () {
      final style = AppSystemUi.style;
      expect(style.statusBarColor, const Color(0x00000000));
      expect(style.systemNavigationBarColor, const Color(0x00000000));
      expect(style.systemNavigationBarContrastEnforced, isFalse);
      expect(style.statusBarIconBrightness, Brightness.dark);
      expect(style.systemNavigationBarIconBrightness, Brightness.dark);
    });
  });

  group('앱 틀: 위·아래가 시스템 영역에 가려지지 않는다', () {
    Future<void> expectFits(WidgetTester tester, Size size, EdgeInsets insets) async {
      await pumpApp(tester, repo, location: '/', size: size, systemInsets: insets);

      // 위: 상단바 영역은 상태바 높이 + 상단바 높이. 헤더 내용(로고)은 상태바 아래에 있다.
      final top = rectOf(tester, find.byKey(AppScaffold.topAreaKey));
      expect(top.top, 0);
      expect(top.height, insets.top + kToolbarHeight);
      expect(rectOf(tester, find.byKey(const ValueKey('header-logo'))).top, greaterThanOrEqualTo(insets.top));

      // 아래: 푸터 배경은 화면 맨 아래까지, 글자는 홈 인디케이터/내비게이션바 위
      final bottom = rectOf(tester, find.byKey(AppScaffold.bottomAreaKey));
      expect(bottom.bottom, size.height);
      expect(rectOf(tester, find.text(AppFooter.disclaimer)).bottom, lessThanOrEqualTo(size.height - insets.bottom));

      // 좌우(가로 모드 구멍)
      expect(rectOf(tester, find.byKey(const ValueKey('header-logo'))).left, greaterThanOrEqualTo(insets.left));
      expect(rectOf(tester, find.text(AppFooter.disclaimer)).left, greaterThanOrEqualTo(insets.left));
      expect(rectOf(tester, find.text(AppFooter.disclaimer)).right, lessThanOrEqualTo(size.width - insets.right));

      expect(tester.takeException(), isNull);
    }

    testWidgets('아이폰: 홈 인디케이터', (tester) => expectFits(tester, _iphone, _iphoneInsets));
    testWidgets('갤럭시: 3버튼 내비게이션바', (tester) => expectFits(tester, _galaxy, _galaxyInsets));
    testWidgets('가로 모드: 카메라 구멍', (tester) => expectFits(tester, _landscape, _landscapeInsets));

    testWidgets('웹/여백 없음: 여백이 0 이다', (tester) async {
      await pumpApp(tester, repo, location: '/', size: _iphone);

      expect(rectOf(tester, find.byKey(AppScaffold.topAreaKey)).height, kToolbarHeight);
    });

    testWidgets('페이지가 상단바를 또 써도 여백이 두 번 더해지지 않는다', (tester) async {
      await pumpApp(tester, repo, location: '/housing', size: _iphone, systemInsets: _iphoneInsets);

      // byType 은 정확한 타입만 찾으므로, AppBar 를 상속한 상단바들은 is 로 찾는다.
      final bars = find.byWidgetPredicate((w) => w is AppBar);
      expect(bars, findsNWidgets(2)); // 공통 헤더 + 페이지 상단바
      expect(rectOf(tester, bars.at(0)).top, _iphoneInsets.top);
      // 페이지 상단바는 헤더 바로 아래. 상태바 높이가 또 더해져 있으면 이 값이 커진다.
      expect(rectOf(tester, bars.at(1)).top, _iphoneInsets.top + kToolbarHeight);
      expect(rectOf(tester, bars.at(1)).height, kToolbarHeight);
    });

    testWidgets('긴 화면의 마지막 내용이 푸터/내비게이션바에 가려지지 않는다', (tester) async {
      await pumpApp(tester, repo, location: '/housing/notices/n1', size: _galaxy, systemInsets: _galaxyInsets);

      final body = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
      await tester.scrollUntilVisible(find.text('원문 공고 보기'), 300, scrollable: body);
      await tester.pumpAndSettle();

      final footerTop = rectOf(tester, find.byKey(AppScaffold.bottomAreaKey)).top;
      expect(rectOf(tester, find.text('원문 공고 보기')).bottom, lessThanOrEqualTo(footerTop));
      expect(footerTop, lessThan(_galaxy.height - _galaxyInsets.bottom)); // 푸터 내용은 내비게이션바 위
    });
  });

  group('키보드', () {
    testWidgets('올라오면 푸터를 숨기고, 내리면 다시 보인다', (tester) async {
      await pumpApp(
        tester,
        repo,
        location: '/housing/profile',
        size: _iphone,
        systemInsets: _iphoneInsets,
        keyboard: 300,
      );

      expect(find.text(AppFooter.disclaimer), findsNothing);
      expect(tester.takeException(), isNull);

      setSystemInsets(tester, _iphoneInsets);
      await tester.pumpAndSettle();
      expect(find.text(AppFooter.disclaimer), findsOneWidget);
    });

    testWidgets('키보드가 열려도 본문이 키보드 위에 있다 (키보드 높이가 두 번 빠지지 않는다)', (tester) async {
      await pumpApp(
        tester,
        repo,
        location: '/housing/profile',
        size: _iphone,
        systemInsets: _iphoneInsets,
        keyboard: 300,
      );

      final body = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
      final rect = rectOf(tester, body);
      expect(rect.bottom, _iphone.height - 300); // 키보드 바로 위까지 쓴다. 더 짧으면 키보드 높이가 중복 차감된 것
    });
  });

  group('CenteredScrollView', () {
    Future<void> pump(WidgetTester tester, {required double height, required double contentHeight}) {
      return tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300,
                height: height,
                child: CenteredScrollView(
                  child: SizedBox(key: const ValueKey('c'), height: contentHeight, width: 100),
                ),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('내용이 짧으면 가운데에 있다', (tester) async {
      await pump(tester, height: 400, contentHeight: 100);

      final area = rectOf(tester, find.byType(CenteredScrollView));
      final content = rectOf(tester, find.byKey(const ValueKey('c')));
      expect(content.center.dy, closeTo(area.center.dy, 0.5));
    });

    testWidgets('내용이 길면 오버플로 없이 스크롤해서 끝까지 볼 수 있다', (tester) async {
      await pump(tester, height: 200, contentHeight: 600);

      expect(tester.takeException(), isNull);
      final area = rectOf(tester, find.byType(CenteredScrollView));

      await tester.drag(find.byType(CenteredScrollView), const Offset(0, -1000));
      await tester.pumpAndSettle();

      expect(rectOf(tester, find.byKey(const ValueKey('c'))).bottom, lessThanOrEqualTo(area.bottom));
    });

    testWidgets('높이가 정해지지 않은 곳(목록 안)에서도 깨지지 않는다', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListView(children: const [CenteredScrollView(child: Text('안내'))]),
          ),
        ),
      );

      expect(find.text('안내'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('showAppBottomSheet', () {
    Future<void> open(WidgetTester tester, {required EdgeInsets insets, double keyboard = 0}) async {
      tester.view.physicalSize = _iphone;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPadding);
      addTearDown(tester.view.resetViewPadding);
      addTearDown(tester.view.resetViewInsets);
      setSystemInsets(tester, insets, keyboard: keyboard);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => showAppBottomSheet<void>(
                  context: context,
                  builder: (_) => const SizedBox(key: ValueKey('sheet-content'), height: 80, width: double.infinity),
                ),
                child: const Text('열기'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('열기'));
      await tester.pumpAndSettle();
    }

    testWidgets('맨 아래 내용이 홈 인디케이터/내비게이션바 위에 있다', (tester) async {
      await open(tester, insets: _iphoneInsets);

      expect(
        rectOf(tester, find.byKey(const ValueKey('sheet-content'))).bottom,
        lessThanOrEqualTo(_iphone.height - 34),
      );
    });

    testWidgets('키보드가 올라오면 키보드 위로 올라온다', (tester) async {
      await open(tester, insets: _iphoneInsets, keyboard: 300);

      expect(
        rectOf(tester, find.byKey(const ValueKey('sheet-content'))).bottom,
        lessThanOrEqualTo(_iphone.height - 300),
      );
    });
  });

  group('ErrorView', () {
    testWidgets('아주 낮은 영역에서도 오버플로 없이 다시 시도 버튼에 닿는다', (tester) async {
      var retried = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              height: 90,
              child: ErrorView(message: '실패', onRetry: () => retried = true),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);

      await tester.ensureVisible(find.text('다시 시도'));
      await tester.tap(find.text('다시 시도'));
      expect(retried, isTrue);
    });
  });
}
