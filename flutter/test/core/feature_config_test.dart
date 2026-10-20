import 'dart:convert';

import 'package:everything_about_youth/core/feature/feature_config.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('parseFeatureConfig', () {
    test('서버 응답을 id → 켜짐 맵으로 읽는다', () {
      final config = parseFeatureConfig({
        'features': [
          {'id': 'housing', 'enabled': false},
          {'id': 'jobs', 'enabled': true},
        ],
      });
      expect(config, {'housing': false, 'jobs': true});
    });

    test('형식이 맞지 않는 항목은 건너뛰고 나머지는 쓴다', () {
      final config = parseFeatureConfig({
        'features': [
          {'id': 'ok', 'enabled': true},
          {'id': 'no-enabled'},
          {'id': 1, 'enabled': true},
          {'id': 'string-bool', 'enabled': 'true'},
          'garbage',
        ],
      });
      expect(config, {'ok': true});
    });

    test('features 가 목록이 아니면 오류', () {
      expect(() => parseFeatureConfig({'features': 'x'}), throwsA(isA<ApiException>()));
      expect(() => parseFeatureConfig({}), throwsA(isA<ApiException>()));
    });
  });

  group('ApiFeatureConfigRemote', () {
    test('GET /api/v1/features 로 받아 온다', () async {
      Uri? requested;
      final client = MockClient((request) async {
        requested = request.url;
        return http.Response(
          jsonEncode({
            'features': [
              {'id': 'housing', 'enabled': false},
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });
      final remote = ApiFeatureConfigRemote(ApiClient(baseUrl: 'http://server.test', httpClient: client));

      expect(await remote.fetch(), {'housing': false});
      expect(requested?.path, '/api/v1/features');
    });

    test('서버 오류는 예외로 올라온다 (호출한 쪽이 기존 설정으로 계속한다)', () async {
      final client = MockClient((request) async => http.Response.bytes(utf8.encode('{"error":"장애"}'), 500));
      final remote = ApiFeatureConfigRemote(ApiClient(baseUrl: 'http://server.test', httpClient: client));

      await expectLater(remote.fetch(), throwsA(isA<ApiException>()));
    });
  });

  group('SharedPrefsFeatureConfigCache', () {
    Future<SharedPrefsFeatureConfigCache> cache([Map<String, Object> initial = const {}]) async {
      SharedPreferences.setMockInitialValues(initial);
      return SharedPrefsFeatureConfigCache(await SharedPreferences.getInstance());
    }

    test('저장하면 다시 읽을 수 있고, 처음에는 비어 있다', () async {
      final c = await cache();
      expect(c.read(), isEmpty);

      await c.write({'housing': false, 'jobs': true});
      expect(c.read(), {'housing': false, 'jobs': true});
    });

    test('깨졌거나 형식이 다른 저장값은 없는 것으로 본다', () async {
      expect((await cache({SharedPrefsFeatureConfigCache.key: '{깨짐'})).read(), isEmpty);
      expect((await cache({SharedPrefsFeatureConfigCache.key: '[1,2]'})).read(), isEmpty);
      expect((await cache({SharedPrefsFeatureConfigCache.key: '{"a":true,"b":"x"}'})).read(), {'a': true});
    });
  });
}
