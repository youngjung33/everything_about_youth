import 'dart:async';

import 'package:everything_about_youth/app/router.dart';
import 'package:everything_about_youth/app/shell/account_menu.dart';
import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/auth/sso.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/features/home/home_page.dart';
import 'package:everything_about_youth/features/login/login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fake_auth_server.dart';
import '../support/fake_feature.dart';
import '../support/fake_sso_launcher.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

const _modules = [FakeFeature('a', title: '서비스A')];

Finder button(SsoProvider p) => find.byKey(LoginPage.buttonKey(p));
Finder get guestButton => find.byKey(LoginPage.guestKey);
Finder get onLoginScreen => find.byType(LoginPage);
Finder get onHome => find.byType(HomePage);

bool pressable(WidgetTester tester, Finder finder) => tester.widget<FilledButton>(finder).onPressed != null;

/// 로그인 화면에서 업체 버튼을 눌러 끝까지 진행한다.
Future<void> signInWith(WidgetTester tester, SsoProvider provider) async {
  await tester.tap(button(provider));
  await tester.pumpAndSettle();
}

Future<void> openAccountMenu(WidgetTester tester) async {
  await tester.tap(find.byKey(AccountMenu.menuKey));
  await tester.pumpAndSettle();
}

void main() {
  final repo = FakeHousingRepository();

  group('authRedirect (로그인 가드)', () {
    Uri u(String s) => Uri.parse(s);

    test('아직 고르지 않았으면 어디로 오든 로그인 화면으로 보내고, 원래 주소를 들고 간다', () {
      expect(authRedirect(mode: AuthMode.none, uri: u('/')), '/login');
      expect(authRedirect(mode: AuthMode.none, uri: u('/housing/notices/n1')), '/login?from=%2Fhousing%2Fnotices%2Fn1');
      expect(
        authRedirect(mode: AuthMode.none, uri: u('/housing?region=seoul')),
        '/login?from=%2Fhousing%3Fregion%3Dseoul',
      );
    });

    test('로그인 화면에 있으면 그대로 둔다', () {
      expect(authRedirect(mode: AuthMode.none, uri: u('/login')), isNull);
      expect(authRedirect(mode: AuthMode.none, uri: u('/login?from=%2Fhousing')), isNull);
    });

    test('비회원은 어디든 갈 수 있고 로그인 화면도 열 수 있다 (회원이 되려는 경우)', () {
      expect(authRedirect(mode: AuthMode.guest, uri: u('/housing')), isNull);
      expect(authRedirect(mode: AuthMode.guest, uri: u('/login')), isNull);
    });

    test('회원이 로그인 화면에 있으면 원래 가려던 곳(없으면 홈)으로 보낸다', () {
      expect(authRedirect(mode: AuthMode.member, uri: u('/login')), '/');
      expect(authRedirect(mode: AuthMode.member, uri: u('/login?from=%2Fhousing')), '/housing');
      expect(authRedirect(mode: AuthMode.member, uri: u('/housing')), isNull);
    });

    test('from 이 앱 밖이거나 로그인/스플래시 자신이면 무시한다 (open redirect, 무한 이동 방지)', () {
      for (final bad in ['https://evil.com', '//evil.com', 'evil', '/login', '/login?from=%2Fx', '/splash']) {
        final uri = Uri(path: '/login', queryParameters: {'from': bad});
        expect(
          authRedirect(mode: AuthMode.member, uri: uri),
          '/',
          reason: bad,
        );
        expect(afterLoginPath(uri), '/', reason: bad);
      }
    });

    test('loginLocation: 홈이나 없음이면 from 을 붙이지 않는다', () {
      expect(loginLocation(), '/login');
      expect(loginLocation(from: '/'), '/login');
      expect(loginLocation(from: '/housing'), '/login?from=%2Fhousing');
    });
  });

  group('처음 실행', () {
    testWidgets('로그인 화면이 뜨고 앱 화면은 보이지 않는다. 네 업체와 비회원 시작이 모두 있다', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer());

      expect(onLoginScreen, findsOneWidget);
      expect(onHome, findsNothing);
      for (final p in SsoProvider.values) {
        expect(button(p), findsOneWidget, reason: p.id);
        expect(find.text('${p.label}로 계속하기'), findsOneWidget);
      }
      expect(guestButton, findsOneWidget);
      expect(find.text('비회원으로 시작하기'), findsOneWidget);
    });

    testWidgets('로그인 화면에는 헤더 메뉴가 없다 (로그인 전이므로)', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer(), modules: _modules);
      expect(find.byKey(const ValueKey('menu:/')), findsNothing);
      expect(find.byKey(AccountMenu.loginKey), findsNothing);
      expect(find.byKey(AccountMenu.menuKey), findsNothing);
    });

    testWidgets('서버에 설정이 있는 업체만 누를 수 있고, 나머지는 "준비 중"이다', (tester) async {
      final server = FakeAuthServer()..enabledProviders = {'google', 'kakao'};
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      expect(pressable(tester, button(SsoProvider.google)), isTrue);
      expect(pressable(tester, button(SsoProvider.kakao)), isTrue);
      expect(pressable(tester, button(SsoProvider.apple)), isFalse);
      expect(pressable(tester, button(SsoProvider.naver)), isFalse);
      expect(find.text('준비 중'), findsNWidgets(2));
      expect(find.descendant(of: button(SsoProvider.apple), matching: find.text('준비 중')), findsOneWidget);
      expect(find.descendant(of: button(SsoProvider.naver), matching: find.text('준비 중')), findsOneWidget);
      expect(find.descendant(of: button(SsoProvider.google), matching: find.text('준비 중')), findsNothing);
    });

    testWidgets('설정된 업체가 하나도 없어도 네 개가 모두 보이고(준비 중), 비회원 시작은 된다', (tester) async {
      final server = FakeAuthServer()..enabledProviders = {};
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      for (final p in SsoProvider.values) {
        expect(button(p), findsOneWidget);
        expect(pressable(tester, button(p)), isFalse, reason: p.id);
      }
      expect(find.text('준비 중'), findsNWidgets(4));
      expect(tester.widget<OutlinedButton>(guestButton).onPressed, isNotNull);
    });

    testWidgets('서버가 켠 업체를 누르면 그 업체의 로그인 주소가 열린다', (tester) async {
      final server = FakeAuthServer();
      final launcher = FakeSsoLauncher.succeeding();
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server, launcher: launcher);

      await signInWith(tester, SsoProvider.naver);

      expect(launcher.opened.single.toString(), 'https://login.test/naver?state=s');
      expect(server.lastStart!['provider'], 'naver');
      expect(server.lastStart!['redirectUri'], 'everythingaboutyouth://auth');
    });
  });

  group('비회원으로 시작하기', () {
    testWidgets('누르면 홈으로 가고, 헤더에 "로그인"이 보이고, 선택이 기기에 남는다', (tester) async {
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer());

      await tester.tap(guestButton);
      await tester.pumpAndSettle();

      expect(onHome, findsOneWidget);
      expect(onLoginScreen, findsNothing);
      expect(container.read(authModeProvider), AuthMode.guest);
      expect(find.byKey(AccountMenu.loginKey), findsOneWidget);
      expect(find.byKey(AccountMenu.menuKey), findsNothing);
      expect((await SharedPreferences.getInstance()).getString(AuthModeStore.key), 'guest');
    });

    testWidgets('서버에 요청하지 않는다 (세션은 첫 조회 때 서버가 만든다)', (tester) async {
      final server = FakeAuthServer();
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      server.requests.clear();

      await tester.tap(guestButton);
      await tester.pumpAndSettle();

      expect(server.requests, isEmpty);
    });

    testWidgets('원래 가려던 화면으로 돌아간다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer(),
        modules: _modules,
        location: '/a',
      );
      expect(onLoginScreen, findsOneWidget);

      await tester.tap(guestButton);
      await tester.pumpAndSettle();

      expect(find.text('a 첫 화면'), findsOneWidget);
    });

    testWidgets('앱을 다시 켜도 로그인 화면이 다시 뜨지 않는다', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.guest, authServer: FakeAuthServer());
      expect(onHome, findsOneWidget);
      expect(onLoginScreen, findsNothing);
    });

    testWidgets('비회원도 조회 화면에 들어갈 수 있다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.guest,
        authServer: FakeAuthServer(),
        modules: _modules,
        location: '/a',
      );
      expect(find.text('a 첫 화면'), findsOneWidget);
    });
  });

  group('소셜 로그인', () {
    testWidgets('성공하면 홈으로 가고 회원이 된다. 헤더에는 계정 메뉴가 보이고 "로그인"은 없다', (tester) async {
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer());

      await signInWith(tester, SsoProvider.google);

      expect(onHome, findsOneWidget);
      expect(container.read(authModeProvider), AuthMode.member);
      expect(find.byKey(AccountMenu.menuKey), findsOneWidget);
      expect(find.byKey(AccountMenu.loginKey), findsNothing);
      expect((await SharedPreferences.getInstance()).getString(AuthModeStore.key), 'member');
    });

    testWidgets('로그인한 뒤 조회 요청에는 회원 토큰이 붙는다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      await signInWith(tester, SsoProvider.kakao);
      final response = await tester.runAsync(() => container.read(apiClientProvider).getJson('/features'));

      expect(server.memberAccess.contains(response!['token']), isTrue);
    });

    testWidgets('원래 가려던 화면으로 돌아간다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer(),
        modules: _modules,
        location: '/a',
      );

      await signInWith(tester, SsoProvider.google);

      expect(find.text('a 첫 화면'), findsOneWidget);
    });

    testWidgets('앱을 다시 켜도 회원 상태가 유지된다', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.member, authServer: FakeAuthServer());
      expect(onHome, findsOneWidget);
      expect(find.byKey(AccountMenu.menuKey), findsOneWidget);
    });

    testWidgets('로그인 창을 닫으면 아무 안내 없이 로그인 화면에 남고, 다시 누를 수 있다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer(),
        launcher: FakeSsoLauncher.cancelling(),
      );

      await signInWith(tester, SsoProvider.google);

      expect(onLoginScreen, findsOneWidget);
      expect(find.byKey(const ValueKey('login:error')), findsNothing);
      expect(pressable(tester, button(SsoProvider.google)), isTrue);
    });

    testWidgets('업체 화면에서 취소해도 오류로 보이지 않는다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer(),
        launcher: FakeSsoLauncher.declined(),
      );
      await signInWith(tester, SsoProvider.google);
      expect(onLoginScreen, findsOneWidget);
      expect(find.byKey(const ValueKey('login:error')), findsNothing);
    });

    testWidgets('로그인에 실패하면 안내 문구가 보이고, 다시 시도할 수 있다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer(),
        launcher: FakeSsoLauncher.failing(),
      );

      await signInWith(tester, SsoProvider.google);

      expect(onLoginScreen, findsOneWidget);
      expect(find.byKey(const ValueKey('login:error')), findsOneWidget);
      expect(find.textContaining('로그인하지 못했습니다'), findsOneWidget);
      expect(pressable(tester, button(SsoProvider.google)), isTrue);
    });

    testWidgets('서버가 티켓을 거절하면 서버의 안내 문구를 보여준다', (tester) async {
      final launcher = FakeSsoLauncher.custom((_) async => Uri.parse('everythingaboutyouth://auth?ticket=forged'));
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer(), launcher: launcher);

      await signInWith(tester, SsoProvider.google);

      expect(find.text('로그인 시간이 지났습니다. 처음부터 다시 시도해 주세요.'), findsOneWidget);
    });

    testWidgets('다음 시도가 시작되면 이전 오류 문구가 사라진다', (tester) async {
      final results = [
        Uri.parse('everythingaboutyouth://auth?error=failed'),
        Uri.parse('everythingaboutyouth://auth?error=cancelled'),
      ];
      final launcher = FakeSsoLauncher.custom((_) async => results.removeAt(0));
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer(), launcher: launcher);

      await signInWith(tester, SsoProvider.google);
      expect(find.byKey(const ValueKey('login:error')), findsOneWidget);

      await signInWith(tester, SsoProvider.google);
      expect(find.byKey(const ValueKey('login:error')), findsNothing);
    });

    testWidgets('로그인 창이 열려 있는 동안 모든 버튼이 잠기고, 누른 버튼에는 진행 표시가 보인다', (tester) async {
      final gate = Completer<Uri>();
      final launcher = FakeSsoLauncher.custom((_) => gate.future);
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer(), launcher: launcher);

      await tester.tap(button(SsoProvider.google));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      for (final p in SsoProvider.values) {
        expect(pressable(tester, button(p)), isFalse, reason: p.id);
      }
      expect(tester.widget<OutlinedButton>(guestButton).onPressed, isNull);
      expect(
        find.descendant(of: button(SsoProvider.google), matching: find.byType(CircularProgressIndicator)),
        findsOneWidget,
      );
      expect(
        find.descendant(of: button(SsoProvider.kakao), matching: find.byType(CircularProgressIndicator)),
        findsNothing,
      );

      gate.complete(Uri.parse('everythingaboutyouth://auth?error=cancelled'));
      await tester.pumpAndSettle();
      expect(pressable(tester, button(SsoProvider.google)), isTrue);
    });

    testWidgets('같은 업체를 연달아 눌러도 로그인 창이 한 번만 열린다', (tester) async {
      final gate = Completer<Uri>();
      final launcher = FakeSsoLauncher.custom((_) => gate.future);
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: FakeAuthServer(), launcher: launcher);

      await tester.tap(button(SsoProvider.google));
      await tester.pump();
      await tester.tap(button(SsoProvider.google), warnIfMissed: false);
      await tester.pump();

      expect(launcher.opened, hasLength(1));
      gate.complete(Uri.parse('everythingaboutyouth://auth?error=cancelled'));
      await tester.pumpAndSettle();
    });
  });

  group('서버에서 로그인 방법을 받지 못할 때', () {
    testWidgets('버튼은 잠그되 "준비 중"이라고 하지 않고, 다시 시도 버튼과 비회원 시작이 있다', (tester) async {
      final server = FakeAuthServer()..failProvidersWith = 500;
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      expect(find.text('로그인 방법을 불러오지 못했습니다.'), findsOneWidget);
      expect(find.text('준비 중'), findsNothing);
      for (final p in SsoProvider.values) {
        expect(pressable(tester, button(p)), isFalse, reason: p.id);
      }
      expect(find.byKey(const ValueKey('login:retry')), findsOneWidget);
      expect(tester.widget<OutlinedButton>(guestButton).onPressed, isNotNull);
    });

    testWidgets('다시 시도해서 받으면 버튼이 열린다', (tester) async {
      final server = FakeAuthServer()
        ..failProvidersWith = 500
        ..enabledProviders = {'kakao'};
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      server.failProvidersWith = null;
      await tester.tap(find.byKey(const ValueKey('login:retry')));
      await tester.pumpAndSettle();

      expect(find.text('로그인 방법을 불러오지 못했습니다.'), findsNothing);
      expect(pressable(tester, button(SsoProvider.kakao)), isTrue);
      expect(pressable(tester, button(SsoProvider.google)), isFalse);
    });

    testWidgets('서버를 못 받아도 비회원으로는 시작할 수 있다', (tester) async {
      final server = FakeAuthServer()..failProvidersWith = 500;
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);

      await tester.tap(guestButton);
      await tester.pumpAndSettle();

      expect(onHome, findsOneWidget);
    });

    testWidgets('누르는 사이 서버 설정이 꺼지면 안내하고 목록을 다시 받아 버튼을 잠근다', (tester) async {
      final server = FakeAuthServer();
      await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server, launcher: FakeSsoLauncher.succeeding());
      expect(pressable(tester, button(SsoProvider.google)), isTrue);

      server.enabledProviders = {'kakao'}; // 그 사이 운영자가 google 설정을 뺐다
      await signInWith(tester, SsoProvider.google);

      expect(find.byKey(const ValueKey('login:error')), findsOneWidget);
      expect(pressable(tester, button(SsoProvider.google)), isFalse);
      expect(find.descendant(of: button(SsoProvider.google), matching: find.text('준비 중')), findsOneWidget);
    });
  });

  group('비회원이 로그인하기', () {
    testWidgets('헤더의 "로그인"으로 로그인 화면에 가고, 로그인하면 보던 화면으로 돌아온다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.guest,
        authServer: FakeAuthServer(),
        modules: _modules,
        location: '/a',
      );
      expect(find.text('a 첫 화면'), findsOneWidget);

      await tester.tap(find.byKey(AccountMenu.loginKey));
      await tester.pumpAndSettle();
      expect(onLoginScreen, findsOneWidget);

      await signInWith(tester, SsoProvider.google);

      expect(find.text('a 첫 화면'), findsOneWidget);
      expect(find.byKey(AccountMenu.menuKey), findsOneWidget);
    });

    testWidgets('로그인하지 않고 "비회원으로 시작하기"를 다시 눌러도 보던 화면으로 돌아온다', (tester) async {
      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.guest,
        authServer: FakeAuthServer(),
        modules: _modules,
        location: '/a',
      );
      await tester.tap(find.byKey(AccountMenu.loginKey));
      await tester.pumpAndSettle();

      await tester.tap(guestButton);
      await tester.pumpAndSettle();

      expect(find.text('a 첫 화면'), findsOneWidget);
    });
  });

  group('계정 메뉴 (회원)', () {
    testWidgets('로그아웃하면 로그인 화면으로 가고 서버에서도 세션이 폐기된다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);

      await openAccountMenu(tester);
      await tester.tap(find.byKey(AccountMenu.logoutKey));
      await tester.pumpAndSettle();

      expect(onLoginScreen, findsOneWidget);
      expect(container.read(authModeProvider), AuthMode.none);
      expect(server.count('POST /api/v1/auth/logout'), 1);
      expect(server.memberRefresh, isEmpty);
      expect((await SharedPreferences.getInstance()).containsKey(AuthModeStore.key), isFalse);
    });

    testWidgets('로그아웃한 뒤 비회원으로 시작해도 이전 회원 세션을 쓰지 않는다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);
      await openAccountMenu(tester);
      await tester.tap(find.byKey(AccountMenu.logoutKey));
      await tester.pumpAndSettle();

      await tester.tap(guestButton);
      await tester.pumpAndSettle();
      final response = await tester.runAsync(() => container.read(apiClientProvider).getJson('/features'));

      expect(server.memberAccess.contains(response!['token']), isFalse, reason: '비회원 토큰이어야 한다');
    });

    testWidgets('회원 탈퇴는 확인 창에서 취소하면 아무 일도 없다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);

      await openAccountMenu(tester);
      await tester.tap(find.byKey(AccountMenu.deleteKey));
      await tester.pumpAndSettle();
      expect(find.text('회원 탈퇴'), findsWidgets);
      expect(find.byType(AlertDialog), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('account:delete-cancel')));
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsNothing);
      expect(container.read(authModeProvider), AuthMode.member);
      expect(server.count('POST /api/v1/auth/account/delete'), 0);
    });

    testWidgets('회원 탈퇴를 확인하면 서버에서 지우고 로그인 화면으로 간다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);

      await openAccountMenu(tester);
      await tester.tap(find.byKey(AccountMenu.deleteKey));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('account:delete-confirm')));
      await tester.pumpAndSettle();

      expect(onLoginScreen, findsOneWidget);
      expect(container.read(authModeProvider), AuthMode.none);
      expect(server.count('POST /api/v1/auth/account/delete'), 1);
      expect(server.memberRefresh, isEmpty);
    });

    testWidgets('탈퇴에 실패하면 안내하고 로그인 상태를 유지한다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);
      server.failWith = 500;

      await openAccountMenu(tester);
      await tester.tap(find.byKey(AccountMenu.deleteKey));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('account:delete-confirm')));
      await tester.pumpAndSettle();

      expect(find.textContaining('탈퇴하지 못했습니다'), findsOneWidget);
      expect(onHome, findsOneWidget);
      expect(container.read(authModeProvider), AuthMode.member);
    });
  });

  group('회원 세션이 끝났을 때', () {
    testWidgets('서버가 회원 세션을 인정하지 않으면 비회원으로 바꾸지 않고 로그인 화면으로 보낸다', (tester) async {
      final server = FakeAuthServer();
      final container = await pumpApp(tester, repo, authMode: AuthMode.none, authServer: server);
      await signInWith(tester, SsoProvider.google);
      expect(onHome, findsOneWidget);

      server.forgetEveryone(); // 다른 기기에서 탈퇴, 또는 서버 DB 초기화
      await tester.runAsync(() => container.read(apiClientProvider).getJson('/features').then((_) {}, onError: (_) {}));
      await tester.pumpAndSettle();

      expect(onLoginScreen, findsOneWidget);
      expect(container.read(authModeProvider), AuthMode.none);
      expect(server.sessionCalls, 0);
    });
  });

  group('좁은 화면', () {
    const narrow = Size(400, 800);

    testWidgets('비회원은 헤더에 로그인 아이콘이 있고 누르면 로그인 화면이다', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.guest, authServer: FakeAuthServer(), size: narrow);

      expect(find.byTooltip('로그인'), findsOneWidget);
      await tester.tap(find.byTooltip('로그인'));
      await tester.pumpAndSettle();
      expect(onLoginScreen, findsOneWidget);
    });

    testWidgets('회원은 헤더에 계정 메뉴가 있다', (tester) async {
      await pumpApp(tester, repo, authMode: AuthMode.member, authServer: FakeAuthServer(), size: narrow);
      expect(find.byKey(AccountMenu.menuKey), findsOneWidget);
    });

    testWidgets('로그인 화면이 작은 폰과 최대 글꼴에서도 넘치지 않고, 모든 버튼에 닿을 수 있다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(
        tester,
        repo,
        authMode: AuthMode.none,
        authServer: FakeAuthServer()..enabledProviders = {'google'},
        size: const Size(320, 480),
      );
      expect(tester.takeException(), isNull);

      await tester.ensureVisible(guestButton);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(guestButton, findsOneWidget);
    });
  });
}
