import 'dart:convert';

import 'package:everything_about_youth/core/auth/auth_session.dart';
import 'package:everything_about_youth/core/auth/auth_tokens.dart';
import 'package:everything_about_youth/core/auth/token_store.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fake_auth_server.dart';

const _base = 'http://server.test';

/// 시계를 직접 움직일 수 있는 환경
class _Env {
  _Env({FakeAuthServer? server, TokenStore? store})
    : server = server ?? FakeAuthServer(),
      store = store ?? MemoryTokenStore() {
    session = AuthSession(
      plainApi: ApiClient(baseUrl: _base, httpClient: this.server.client),
      store: this.store,
      clock: () => now,
    );
    api = ApiClient(baseUrl: _base, httpClient: this.server.client, auth: session);
  }

  final FakeAuthServer server;
  final TokenStore store;
  DateTime now = DateTime.utc(2026, 10, 18);
  late final AuthSession session;
  late final ApiClient api;

  void advance(int seconds) => now = now.add(Duration(seconds: seconds));
}

void main() {
  group('AuthTokens', () {
    final now = DateTime.utc(2026, 10, 18);
    Map<String, dynamic> json() => {
      'accessToken': 'a',
      'accessExpiresIn': 900,
      'refreshToken': 'r',
      'refreshExpiresIn': 3600,
    };

    test('남은 초를 받은 시각 기준의 만료 시각으로 바꾼다', () {
      final t = AuthTokens.fromSessionJson(json(), now: now);
      expect(t.accessExpiresAt, now.add(const Duration(seconds: 900)));
      expect(t.refreshExpiresAt, now.add(const Duration(seconds: 3600)));
    });

    test('만료 30초 전부터는 쓸 수 없는 것으로 본다', () {
      final t = AuthTokens.fromSessionJson(json(), now: now);
      expect(t.accessUsable(now.add(const Duration(seconds: 869))), isTrue);
      expect(t.accessUsable(now.add(const Duration(seconds: 871))), isFalse);
    });

    test('필드가 빠지거나 형식이 틀린 응답은 거절한다', () {
      for (final bad in [
        {...json()}..remove('accessToken'),
        {...json(), 'accessToken': ''},
        {...json(), 'refreshExpiresIn': '3600'},
        <String, dynamic>{},
      ]) {
        expect(() => AuthTokens.fromSessionJson(bad, now: now), throwsA(isA<ApiException>()));
      }
    });

    test('저장했다가 그대로 읽고, 깨진 저장값은 null', () {
      final t = AuthTokens.fromSessionJson(json(), now: now);
      final back = AuthTokens.decode(t.encode())!;
      expect(back.accessToken, 'a');
      expect(back.refreshToken, 'r');
      expect(back.accessExpiresAt.millisecondsSinceEpoch, t.accessExpiresAt.millisecondsSinceEpoch);

      for (final bad in [null, '', 'not json', '[]', '{"a":"x"}', '{"a":1,"r":2,"ax":3,"rx":4}']) {
        expect(AuthTokens.decode(bad), isNull, reason: '$bad');
      }
    });
  });

  group('AuthSession', () {
    test('처음 요청하면 세션을 받고, 이후에는 서버를 부르지 않고 같은 토큰을 쓴다', () async {
      final env = _Env();
      expect(await env.session.accessToken(), 'access-1');
      expect(await env.session.accessToken(), 'access-1');
      expect(env.server.sessionCalls, 1);
      expect(env.server.refreshCalls, 0);
    });

    test('동시에 여러 번 요청해도 서버 호출은 한 번', () async {
      final env = _Env();
      final tokens = await Future.wait(List.generate(10, (_) => env.session.accessToken()));
      expect(tokens.toSet(), {'access-1'});
      expect(env.server.sessionCalls, 1);
    });

    test('기기에 저장된 토큰이 있으면 네트워크 없이 바로 쓴다', () async {
      final first = _Env();
      await first.session.accessToken();

      // 앱을 다시 켠 상황: 같은 저장소, 새 AuthSession
      final second = _Env(server: first.server, store: first.store)..now = first.now;
      expect(await second.session.accessToken(), 'access-1');
      expect(first.server.sessionCalls, 1);
    });

    test('액세스 토큰이 만료되면 리프레시 토큰으로 갱신한다', () async {
      final env = _Env();
      await env.session.accessToken();
      env.advance(900);

      expect(await env.session.accessToken(), 'access-2');
      expect(env.server.refreshCalls, 1);
      expect(env.server.sessionCalls, 1);
    });

    test('리프레시도 만료됐으면 새 세션을 시작한다', () async {
      final env = _Env();
      await env.session.accessToken();
      env.advance(3600);

      expect(await env.session.accessToken(), 'access-2');
      expect(env.server.refreshCalls, 0);
      expect(env.server.sessionCalls, 2);
    });

    test('서버가 리프레시를 거절(폐기/DB 초기화)하면 새 세션을 시작한다', () async {
      final env = _Env();
      await env.session.accessToken();
      env.advance(900);
      env.server.forgetEveryone();

      expect(await env.session.accessToken(), 'access-2');
      expect(env.server.refreshCalls, 1);
      expect(env.server.sessionCalls, 2);
    });

    test('서버 장애(5xx)나 네트워크 오류는 새 세션을 만들지 않고 그대로 알린다', () async {
      final env = _Env();
      await env.session.accessToken();
      env.advance(900);
      env.server.failWith = 503;

      await expectLater(env.session.accessToken(), throwsA(isA<ApiException>()));
      expect(env.server.sessionCalls, 1, reason: '장애 중에 세션을 마구 만들면 안 된다');

      // 복구되면 다음 요청이 정상적으로 갱신한다
      env.server.failWith = null;
      expect(await env.session.accessToken(), 'access-2');
    });

    test('서버가 거절한 토큰(rejected)이면 아직 안 만료됐어도 갱신한다', () async {
      final env = _Env();
      final token = await env.session.accessToken();
      expect(await env.session.accessToken(rejected: token), 'access-2');
    });

    test('이미 다른 요청이 갱신해 둔 뒤라면 rejected 가 옛 토큰이어도 서버를 다시 부르지 않는다', () async {
      final env = _Env();
      final old = await env.session.accessToken();
      await env.session.accessToken(rejected: old); // access-2 로 갱신
      final calls = env.server.requests.length;

      expect(await env.session.accessToken(rejected: old), 'access-2');
      expect(env.server.requests.length, calls);
    });

    test('세션 응답 형식이 이상하면 저장하지 않고 오류', () async {
      final store = MemoryTokenStore();
      final session = AuthSession(
        plainApi: ApiClient(
          baseUrl: _base,
          httpClient: MockClient((_) async => http.Response('{"accessToken":"x"}', 200)),
        ),
        store: store,
      );
      await expectLater(session.accessToken(), throwsA(isA<ApiException>()));
      expect(await store.read(), isNull);
    });

    test('clear 는 저장소도 비운다', () async {
      final env = _Env();
      await env.session.accessToken();
      expect(await env.store.read(), isNotNull);
      await env.session.clear();
      expect(await env.store.read(), isNull);
    });
  });

  group('ApiClient + JWT', () {
    test('모든 요청에 Bearer 토큰이 붙고, 세션 호출에는 붙지 않는다', () async {
      final env = _Env();
      await env.api.getJson('/features');
      await env.api.getJson('/housing/meta');

      expect(env.server.dataAuthHeaders, ['Bearer access-1', 'Bearer access-1']);
      expect(env.server.sessionCalls, 1);
    });

    test('토큰이 만료돼 401 이 오면 갱신하고 한 번만 다시 보낸다', () async {
      final env = _Env();
      await env.api.getJson('/features');
      env.server.expireAccessTokens(); // 서버만 만료 (앱 시계는 그대로라 앱은 아직 유효하다고 믿음)

      final json = await env.api.getJson('/features');
      expect(json['token'], 'access-2');
      expect(env.server.dataAuthHeaders, ['Bearer access-1', 'Bearer access-1', 'Bearer access-2']);
      expect(env.server.refreshCalls, 1);
    });

    test('서버가 세션을 통째로 잊어도(DB 초기화) 새 세션으로 이어서 성공한다', () async {
      final env = _Env();
      await env.api.getJson('/features');
      env.server.forgetEveryone();

      final json = await env.api.getJson('/features');
      expect(json['ok'], true);
      expect(env.server.sessionCalls, 2);
    });

    test('재시도해도 401 이면 무한 반복하지 않고 오류를 낸다', () async {
      // 세션은 잘 발급해 주지만 데이터 요청은 늘 401 로 거절하는 서버
      var dataCalls = 0;
      final mock = MockClient((request) async {
        if (request.url.path.startsWith('/api/v1/auth/')) {
          return http.Response.bytes(
            utf8.encode(
              jsonEncode({
                'tokenType': 'Bearer',
                'accessToken': 'tok-$dataCalls',
                'accessExpiresIn': 900,
                'refreshToken': 'r',
                'refreshExpiresIn': 3600,
              }),
            ),
            200,
          );
        }
        dataCalls++;
        return http.Response.bytes(
          utf8.encode(
            jsonEncode({
              'error': {'code': 'AUTH_REQUIRED', 'message': '인증이 필요합니다.'},
            }),
          ),
          401,
        );
      });
      final api = ApiClient(
        baseUrl: _base,
        httpClient: mock,
        auth: AuthSession(
          plainApi: ApiClient(baseUrl: _base, httpClient: mock),
          store: MemoryTokenStore(),
        ),
      );

      await expectLater(
        api.getJson('/features'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 401)),
      );
      expect(dataCalls, 2, reason: '처음 한 번 + 갱신 후 재시도 한 번뿐');
    });

    test('동시에 여러 요청이 401 을 받아도 갱신은 한 번', () async {
      final env = _Env();
      await env.api.getJson('/features');
      env.server.expireAccessTokens();

      final results = await Future.wait(List.generate(5, (_) => env.api.getJson('/features')));
      expect(results.every((r) => r['ok'] == true), isTrue);
      expect(env.server.refreshCalls, 1);
    });

    test('토큰 없는 클라이언트(auth: null)는 Authorization 을 보내지 않는다', () async {
      final server = FakeAuthServer();
      final plain = ApiClient(baseUrl: _base, httpClient: server.client);
      await expectLater(plain.getJson('/features'), throwsA(isA<ApiException>()));
      expect(server.dataAuthHeaders, [null]);
    });

    test('postJson 은 JSON 본문을 보낸다', () async {
      final server = FakeAuthServer();
      final plain = ApiClient(baseUrl: _base, httpClient: server.client);
      await plain.postJson('/auth/session');
      expect(server.sessionCalls, 1);
    });
  });

  group('SecureTokenStore', () {
    setUp(() => FlutterSecureStorage.setMockInitialValues({}));

    test('저장하고 읽고 지운다', () async {
      final store = SecureTokenStore();
      expect(await store.read(), isNull);

      final tokens = AuthTokens.fromSessionJson({
        'accessToken': 'a',
        'accessExpiresIn': 900,
        'refreshToken': 'r',
        'refreshExpiresIn': 3600,
      }, now: DateTime.utc(2026, 10, 18));
      await store.write(tokens);
      expect((await store.read())!.refreshToken, 'r');

      await store.clear();
      expect(await store.read(), isNull);
    });

    test('저장된 값이 깨져 있으면 없는 것으로 본다', () async {
      FlutterSecureStorage.setMockInitialValues({SecureTokenStore.key: '{깨진 값'});
      expect(await SecureTokenStore().read(), isNull);
    });
  });
}
