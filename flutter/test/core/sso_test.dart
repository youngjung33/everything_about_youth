import 'dart:convert';

import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/auth/auth_providers.dart';
import 'package:everything_about_youth/core/auth/auth_session.dart';
import 'package:everything_about_youth/core/auth/auth_tokens.dart';
import 'package:everything_about_youth/core/auth/pkce.dart';
import 'package:everything_about_youth/core/auth/sso.dart';
import 'package:everything_about_youth/core/auth/token_store.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fake_auth_server.dart';
import '../support/fake_sso_launcher.dart';

const _base = 'http://server.test';
const _redirect = 'everythingaboutyouth://auth';

/// 로그인 한 번에 필요한 것들을 가짜 서버와 함께 묶는다.
class _Env {
  _Env({FakeSsoLauncher? launcher, AuthMode mode = AuthMode.none})
    : launcher = launcher ?? FakeSsoLauncher.succeeding() {
    modes = [mode];
    session = AuthSession(
      plainApi: ApiClient(baseUrl: _base, httpClient: server.client),
      store: store,
      isMember: () => modes.last.isMember,
      onMemberLost: () => modes.add(AuthMode.none),
    );
    final plain = ApiClient(baseUrl: _base, httpClient: server.client);
    api = ApiClient(baseUrl: _base, httpClient: server.client, auth: session);
    client = SsoClient(plain);
    actions = AuthActions(
      flow: SsoSignInFlow(client: client, launcher: this.launcher, redirectUri: _redirect),
      session: session,
      api: api,
      setMode: (m) async => modes.add(m),
    );
  }

  final server = FakeAuthServer();
  final store = MemoryTokenStore();
  final FakeSsoLauncher launcher;
  late final List<AuthMode> modes;
  late final AuthSession session;
  late final ApiClient api;
  late final SsoClient client;
  late final AuthActions actions;

  AuthMode get mode => modes.last;
}

void main() {
  group('PKCE', () {
    test('RFC 7636 부록 B 의 예시와 같은 challenge 를 만든다', () async {
      expect(
        await Pkce.challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      );
    });

    test('verifier 는 서버가 받는 길이와 문자만 쓰고, challenge 는 그 해시다 (패딩 없음)', () async {
      final pkce = await Pkce.generate();
      expect(pkce.verifier.length, inInclusiveRange(43, 128));
      expect(RegExp(r'^[A-Za-z0-9\-._~]+$').hasMatch(pkce.verifier), isTrue);
      expect(RegExp(r'^[A-Za-z0-9_-]{43}$').hasMatch(pkce.challenge), isTrue);
      expect(pkce.challenge, await Pkce.challengeOf(pkce.verifier));
    });

    test('매번 다른 값이 나온다', () async {
      final verifiers = {for (var i = 0; i < 20; i++) (await Pkce.generate()).verifier};
      expect(verifiers.length, 20);
    });
  });

  group('AuthModeStore', () {
    test('저장한 값을 읽고, 없거나 모르는 값은 none', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final store = AuthModeStore(prefs);

      expect(store.read(), AuthMode.none);
      await store.write(AuthMode.guest);
      expect(store.read(), AuthMode.guest);
      await store.write(AuthMode.member);
      expect(store.read(), AuthMode.member);

      await prefs.setString(AuthModeStore.key, 'admin');
      expect(store.read(), AuthMode.none);
    });

    test('none 으로 돌리면 값을 지운다', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final store = AuthModeStore(prefs);
      await store.write(AuthMode.member);
      await store.write(AuthMode.none);
      expect(prefs.containsKey(AuthModeStore.key), isFalse);
    });

    test('canEnter 와 isMember', () {
      expect(AuthMode.none.canEnter, isFalse);
      expect(AuthMode.guest.canEnter, isTrue);
      expect(AuthMode.member.canEnter, isTrue);
      expect(AuthMode.member.isMember, isTrue);
      expect(AuthMode.guest.isMember, isFalse);
    });
  });

  group('AuthTokens 의 회원 여부', () {
    final now = DateTime.utc(2026, 10, 21);
    final json = {'accessToken': 'a', 'accessExpiresIn': 900, 'refreshToken': 'r', 'refreshExpiresIn': 3600};

    test('서버 응답의 member 를 읽고 저장했다가 그대로 읽는다', () {
      final member = AuthTokens.fromSessionJson({...json, 'member': true}, now: now);
      expect(member.member, isTrue);
      expect(AuthTokens.decode(member.encode())!.member, isTrue);

      final guest = AuthTokens.fromSessionJson({...json, 'member': false}, now: now);
      expect(guest.member, isFalse);
      expect(AuthTokens.decode(guest.encode())!.member, isFalse);
    });

    test('member 가 없는 응답과, 로그인이 생기기 전에 저장된 값은 비회원이다', () {
      expect(AuthTokens.fromSessionJson(json, now: now).member, isFalse);
      final legacy = jsonEncode({'a': 'a', 'ax': 1, 'r': 'r', 'rx': 2});
      expect(AuthTokens.decode(legacy)!.member, isFalse);
    });
  });

  group('SsoClient', () {
    test('쓸 수 있는 로그인 방법의 id 만 돌려준다', () async {
      final env = _Env();
      env.server.enabledProviders = {'kakao', 'google'};
      expect(await env.client.enabledProviders(), {'google', 'kakao'});
    });

    test('모두 꺼져 있으면 빈 집합', () async {
      final env = _Env();
      env.server.enabledProviders = {};
      expect(await env.client.enabledProviders(), isEmpty);
    });

    test('토큰 없이 부른다 (로그인 전에도 목록을 봐야 한다)', () async {
      final env = _Env();
      await env.client.enabledProviders();
      expect(env.server.requestHeaders.single.containsKey('authorization'), isFalse);
    });

    test('응답 형식이 이상하면 BAD_RESPONSE', () async {
      final bad = http.Response('{"providers":"x"}', 200, headers: {'content-type': 'application/json'});
      final client = SsoClient(ApiClient(baseUrl: _base, httpClient: MockClient((_) async => bad)));
      await expectLater(
        client.enabledProviders(),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.badResponse)),
      );
    });

    test('시작하면 서버가 준 https 주소를 돌려주고, 서버에 provider/돌아올 주소/challenge 를 보낸다', () async {
      final env = _Env();
      final url = await env.client.start(provider: SsoProvider.kakao, redirectUri: _redirect, codeChallenge: 'c' * 43);
      expect(url.scheme, 'https');
      expect(url.host, 'login.test');
      expect(env.server.lastStart, {'provider': 'kakao', 'redirectUri': _redirect, 'codeChallenge': 'c' * 43});
    });

    test('서버가 준 주소가 https 가 아니면 열지 않는다', () async {
      for (final bad in ['http://login.test/x', 'javascript:alert(1)', 'everythingaboutyouth://x', '', null]) {
        final response = http.Response(
          jsonEncode({'authorizationUrl': bad}),
          200,
          headers: {'content-type': 'application/json'},
        );
        final client = SsoClient(ApiClient(baseUrl: _base, httpClient: MockClient((_) async => response)));
        await expectLater(
          client.start(provider: SsoProvider.google, redirectUri: _redirect, codeChallenge: 'c' * 43),
          throwsA(isA<ApiException>()),
          reason: '$bad',
        );
      }
    });

    test('서버에 설정이 없는 업체로 시작하면 SSO_PROVIDER_UNAVAILABLE', () async {
      final env = _Env();
      env.server.enabledProviders = {'google'};
      await expectLater(
        env.client.start(provider: SsoProvider.apple, redirectUri: _redirect, codeChallenge: 'c' * 43),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.ssoProviderUnavailable)),
      );
    });
  });

  group('SsoSignInFlow', () {
    test('티켓을 회원 세션으로 바꿔 돌려준다. 로그인 창에는 서버가 준 주소를 연다', () async {
      final env = _Env();
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);

      final json = await flow.run(SsoProvider.google);

      expect(json['member'], isTrue);
      expect(env.launcher.opened.single.toString(), 'https://login.test/google?state=s');
    });

    test('verifier 는 서버로 start 때가 아니라 exchange 때만 간다 (start 에는 해시만)', () async {
      final env = _Env();
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);
      await flow.run(SsoProvider.naver);

      final startBody = env.server.lastStart!;
      expect(startBody['codeChallenge'], hasLength(43));
      expect(startBody.containsKey('verifier'), isFalse);
    });

    test('로그인 창을 닫으면 SsoCancelledException', () async {
      final env = _Env(launcher: FakeSsoLauncher.cancelling());
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);
      await expectLater(flow.run(SsoProvider.google), throwsA(isA<SsoCancelledException>()));
      expect(env.server.count('POST /api/v1/auth/sso/exchange'), 0);
    });

    test('업체 화면에서 취소하면(?error=cancelled) SsoCancelledException', () async {
      final env = _Env(launcher: FakeSsoLauncher.declined());
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);
      await expectLater(flow.run(SsoProvider.google), throwsA(isA<SsoCancelledException>()));
    });

    test('실패해서 돌아오면(?error=failed) SsoFailedException 이고 교환을 시도하지 않는다', () async {
      final env = _Env(launcher: FakeSsoLauncher.failing());
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);
      await expectLater(flow.run(SsoProvider.google), throwsA(isA<SsoFailedException>()));
      expect(env.server.count('POST /api/v1/auth/sso/exchange'), 0);
    });

    test('다른 티켓이 오면 서버가 거절한다 (SSO_TICKET_INVALID)', () async {
      final env = _Env(launcher: FakeSsoLauncher.custom((_) async => Uri.parse('$_redirect?ticket=forged')));
      final flow = SsoSignInFlow(client: env.client, launcher: env.launcher, redirectUri: _redirect);
      await expectLater(
        flow.run(SsoProvider.google),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.ssoTicketInvalid)),
      );
    });

    test('티켓은 로그인을 시작한 verifier 로만 교환된다 (다른 앱이 티켓을 가로채도 쓸 수 없다)', () async {
      final env = _Env();
      await env.client.start(
        provider: SsoProvider.google,
        redirectUri: _redirect,
        codeChallenge: await Pkce.challengeOf('a' * 50),
      );

      await expectLater(
        env.client.exchange(ticket: FakeAuthServer.ticket, verifier: 'b' * 50),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.ssoTicketInvalid)),
      );
    });

    test('ticketFromCallback: 티켓이 있으면 꺼내고, 없으면 취소/실패로 구분한다', () {
      expect(SsoSignInFlow.ticketFromCallback(Uri.parse('$_redirect?ticket=t1')), 't1');
      expect(
        () => SsoSignInFlow.ticketFromCallback(Uri.parse('$_redirect?error=cancelled')),
        throwsA(isA<SsoCancelledException>()),
      );
      for (final bad in [_redirect, '$_redirect?ticket=', '$_redirect?error=failed', '$_redirect?error=x']) {
        expect(() => SsoSignInFlow.ticketFromCallback(Uri.parse(bad)), throwsA(isA<SsoFailedException>()), reason: bad);
      }
    });
  });

  group('AuthActions', () {
    test('비회원으로 시작하기는 서버를 부르지 않고 모드만 바꾼다', () async {
      final env = _Env();
      await env.actions.continueAsGuest();
      expect(env.mode, AuthMode.guest);
      expect(env.server.requests, isEmpty);
    });

    test('로그인하면 회원 세션을 저장하고 회원이 된다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.kakao);

      expect(env.mode, AuthMode.member);
      expect((await env.store.read())!.member, isTrue);
      // 이후 요청에는 회원 토큰이 붙는다
      final response = await env.api.getJson('/features');
      expect(env.server.memberAccess.contains(response['token']), isTrue);
    });

    test('로그인을 취소하면 아무것도 바뀌지 않는다', () async {
      final env = _Env(launcher: FakeSsoLauncher.cancelling());
      await expectLater(env.actions.signIn(SsoProvider.google), throwsA(isA<SsoCancelledException>()));
      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
    });

    test('로그인에 실패하면 모드도 세션도 바뀌지 않는다', () async {
      final env = _Env(launcher: FakeSsoLauncher.failing());
      await expectLater(env.actions.signIn(SsoProvider.google), throwsA(isA<SsoFailedException>()));
      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
    });

    test('비회원이던 사람이 로그인하면 비회원 세션이 회원 세션으로 바뀐다', () async {
      final env = _Env(mode: AuthMode.guest);
      await env.api.getJson('/features'); // 비회원 세션 시작
      expect((await env.store.read())!.member, isFalse);

      await env.actions.signIn(SsoProvider.google);
      expect((await env.store.read())!.member, isTrue);
    });

    test('로그아웃하면 서버에서 세션을 폐기하고 기기의 토큰을 지우고 none 이 된다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);
      final refresh = (await env.store.read())!.refreshToken;

      await env.actions.signOut();

      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
      expect(env.server.validRefresh.contains(refresh), isFalse, reason: '서버에서도 폐기');
    });

    test('서버에 알리지 못해도(서버 장애) 이 기기에서는 로그아웃된다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);
      env.server.failWith = 503;

      await env.actions.signOut();

      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
    });

    test('회원 탈퇴하면 서버에서 지워지고 none 이 된다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);

      await env.actions.deleteAccount();

      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
      expect(env.server.memberRefresh, isEmpty);
      expect(env.server.count('POST /api/v1/auth/account/delete'), 1);
    });

    test('탈퇴에 실패하면 로그인 상태를 유지하고 오류를 알린다 (지워진 줄 알고 떠나면 안 된다)', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);
      env.server.failWith = 500;

      await expectLater(env.actions.deleteAccount(), throwsA(isA<ApiException>()));

      expect(env.mode, AuthMode.member);
      expect(await env.store.read(), isNotNull);
    });

    test('비회원은 탈퇴할 수 없다 (LOGIN_REQUIRED)', () async {
      final env = _Env(mode: AuthMode.guest);
      await expectLater(
        env.actions.deleteAccount(),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.loginRequired)),
      );
      expect(env.mode, AuthMode.guest);
    });
  });

  group('회원 세션 유지와 만료', () {
    test('회원의 액세스 토큰이 만료되면 갱신해도 회원으로 남는다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);
      env.server.expireAccessTokens();

      final response = await env.api.getJson('/features');

      expect(env.server.memberAccess.contains(response['token']), isTrue);
      expect((await env.store.read())!.member, isTrue);
      expect(env.mode, AuthMode.member);
    });

    test('회원의 세션을 서버가 인정하지 않으면 비회원으로 바꾸지 않고 none 으로 돌려보낸다', () async {
      final env = _Env();
      await env.actions.signIn(SsoProvider.google);
      env.server.forgetEveryone(); // 다른 기기에서 탈퇴했거나 서버 DB 가 초기화됨

      await expectLater(
        env.api.getJson('/features'),
        throwsA(isA<ApiException>().having((e) => e.isUnauthorized, 'unauthorized', isTrue)),
      );

      expect(env.mode, AuthMode.none);
      expect(await env.store.read(), isNull);
      expect(env.server.sessionCalls, 0, reason: '조용히 새 비회원 세션을 만들지 않는다');
    });

    test('회원인데 기기에 저장된 토큰이 사라졌어도 비회원 세션을 새로 만들지 않는다', () async {
      final env = _Env(mode: AuthMode.member);

      await expectLater(env.api.getJson('/features'), throwsA(isA<ApiException>()));

      expect(env.mode, AuthMode.none);
      expect(env.server.sessionCalls, 0);
    });

    test('비회원은 세션을 잃으면 예전처럼 조용히 새 비회원 세션을 받는다', () async {
      final env = _Env(mode: AuthMode.guest);
      await env.api.getJson('/features');
      env.server.forgetEveryone();

      await env.api.getJson('/features');

      expect(env.server.sessionCalls, 2);
      expect(env.mode, AuthMode.guest);
    });
  });
}
