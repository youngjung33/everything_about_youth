import 'dart:async';
import 'dart:convert';

import 'package:everything_about_youth/core/config/app_config.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

ApiClient clientFor(MockClient mock, {Duration? timeout}) =>
    ApiClient(baseUrl: 'http://localhost:3000', httpClient: mock, timeout: timeout ?? const Duration(seconds: 5));

http.Response jsonResponse(Object body, [int status = 200]) => http.Response.bytes(
  utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  test('집합 값은 같은 키를 반복하고, 빈 값은 보내지 않는다', () async {
    late Uri requested;
    final client = clientFor(
      MockClient((request) async {
        requested = request.url;
        return jsonResponse({'ok': true});
      }),
    );

    await client.getJson(
      '/housing/notices',
      query: {
        'sido': ['서울특별시', '경기도'],
        'q': '',
        'sigungu': null,
        'status': <String>[],
        'maxDeposit': 5000,
        'page': 2,
      },
    );

    expect(requested.path, '/api/v1/housing/notices', reason: '경로 앞에 API 버전 접두사가 붙는다');
    expect(requested.queryParametersAll['sido'], ['서울특별시', '경기도']);
    expect(requested.queryParameters['maxDeposit'], '5000');
    expect(requested.queryParameters['page'], '2');
    expect(requested.queryParameters.containsKey('q'), isFalse);
    expect(requested.queryParameters.containsKey('sigungu'), isFalse);
    expect(requested.queryParameters.containsKey('status'), isFalse);
  });

  test('한글 응답을 UTF-8 로 해석한다', () async {
    final client = clientFor(MockClient((_) async => jsonResponse({'title': '청년 행복주택'})));
    final json = await client.getJson('/x');
    expect(json['title'], '청년 행복주택');
  });

  test('기본 헤더(앱 버전 등)가 모든 요청에 붙는다', () async {
    late http.BaseRequest sent;
    final client = ApiClient(
      baseUrl: 'http://localhost:3000',
      httpClient: MockClient((request) async {
        sent = request;
        return jsonResponse({'ok': true});
      }),
      defaultHeaders: const {'X-App-Version': '1.2.3', 'X-App-Platform': 'android'},
    );
    await client.getJson('/x');
    expect(sent.headers['X-App-Version'], '1.2.3');
    expect(sent.headers['X-App-Platform'], 'android');
    expect(sent.headers['Accept'], 'application/json');
  });

  test('baseUrl 에 경로가 있어도 그 뒤에 버전 접두사와 경로가 붙는다', () async {
    late Uri requested;
    final client = ApiClient(
      baseUrl: 'https://example.com/proxy',
      httpClient: MockClient((request) async {
        requested = request.url;
        return jsonResponse({});
      }),
    );
    await client.getJson('/features');
    expect(requested.path, '/proxy/api/v1/features');
  });

  group('오류 템플릿', () {
    test('통합 템플릿의 code, message, requestId, details 를 읽는다', () async {
      final client = clientFor(
        MockClient(
          (_) async => jsonResponse({
            'error': {
              'code': 'NOTICE_NOT_FOUND',
              'message': '공고를 찾을 수 없습니다.',
              'requestId': 'req-1',
              'details': {'id': 'n1'},
            },
          }, 404),
        ),
      );
      await expectLater(
        client.getJson('/x'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.message, 'message', '공고를 찾을 수 없습니다.')
              .having((e) => e.code, 'code', ApiErrorCode.noticeNotFound)
              .having((e) => e.requestId, 'requestId', 'req-1')
              .having((e) => e.details['id'], 'details.id', 'n1')
              .having((e) => e.isNotFound, 'isNotFound', isTrue),
        ),
      );
    });

    test('예전 형식 { error: "문장" } 도 받아 준다', () async {
      final client = clientFor(MockClient((_) async => jsonResponse({'error': '공고를 찾을 수 없습니다.'}, 404)));
      await expectLater(
        client.getJson('/x'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.message, 'message', '공고를 찾을 수 없습니다.')
              .having((e) => e.code, 'code', ApiErrorCode.unknown),
        ),
      );
    });

    test('모양이 이상한 error 는 안내 문구로 대신하고 죽지 않는다', () {
      for (final bad in <Object?>[
        {'error': <String, Object?>{}},
        {'error': 5},
        {
          'error': {'code': 7, 'message': '', 'details': 'x'},
        },
        [1, 2],
        null,
      ]) {
        final e = ApiClient.parseError(bad, 500);
        expect(e.message, contains('HTTP 500'), reason: '$bad');
        expect(e.code, ApiErrorCode.unknown);
      }
    });

    test('429 는 Retry-After 헤더나 details.retryAfterSeconds 로 기다릴 시간을 안다', () async {
      final fromHeader = ApiClient.parseError(
        {
          'error': {'code': 'RATE_LIMITED', 'message': '잠시 후 다시'},
        },
        429,
        retryAfterHeader: '12',
      );
      expect(fromHeader.isRateLimited, isTrue);
      expect(fromHeader.retryAfter, const Duration(seconds: 12));

      final fromDetails = ApiClient.parseError({
        'error': {
          'code': 'RATE_LIMITED',
          'message': '잠시 후 다시',
          'details': {'retryAfterSeconds': 30},
        },
      }, 429);
      expect(fromDetails.retryAfter, const Duration(seconds: 30));
    });

    test('서버까지 못 간 실패에는 앱이 코드를 붙인다', () async {
      final offline = clientFor(MockClient((_) async => throw http.ClientException('refused')));
      await expectLater(
        offline.getJson('/x'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.networkError)),
      );

      final html = clientFor(MockClient((_) async => http.Response('<html>', 502)));
      await expectLater(
        html.getJson('/x'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', ApiErrorCode.badResponse)),
      );
    });
  });

  group('업데이트 필요 응답', () {
    final required = {
      'error': {
        'code': 'APP_UPDATE_REQUIRED',
        'message': '업데이트가 필요합니다.',
        'details': {'storeUrl': 'https://play.google.com/store/apps/details?id=x', 'minVersion': '2.0.0'},
      },
    };

    test('426 이면 콜백을 부르고 예외도 던진다', () async {
      final seen = <ApiException>[];
      final client = ApiClient(
        baseUrl: 'http://localhost:3000',
        httpClient: MockClient((_) async => jsonResponse(required, 426)),
        onUpdateRequired: seen.add,
      );
      await expectLater(
        client.getJson('/x'),
        throwsA(isA<ApiException>().having((e) => e.isUpdateRequired, 'isUpdateRequired', isTrue)),
      );
      expect(seen, hasLength(1));
      expect(seen.single.details['storeUrl'], contains('play.google.com'));
    });

    test('서버가 이 API 버전을 닫은 410 도 업데이트 필요로 본다', () async {
      final seen = <ApiException>[];
      final client = ApiClient(
        baseUrl: 'http://localhost:3000',
        httpClient: MockClient(
          (_) async => jsonResponse({
            'error': {'code': 'API_VERSION_UNSUPPORTED', 'message': '지원이 종료되었습니다.'},
          }, 410),
        ),
        onUpdateRequired: seen.add,
      );
      await expectLater(client.getJson('/x'), throwsA(isA<ApiException>()));
      expect(seen, hasLength(1));
    });

    test('다른 오류에는 콜백을 부르지 않는다', () async {
      final seen = <ApiException>[];
      final client = ApiClient(
        baseUrl: 'http://localhost:3000',
        httpClient: MockClient((_) async => jsonResponse({'error': '서버 오류'}, 500)),
        onUpdateRequired: seen.add,
      );
      await expectLater(client.getJson('/x'), throwsA(isA<ApiException>()));
      expect(seen, isEmpty);
    });
  });

  test('error 가 없는 오류 응답은 상태 코드를 안내한다', () async {
    final client = clientFor(MockClient((_) async => jsonResponse({'x': 1}, 500)));
    await expectLater(
      client.getJson('/x'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', contains('HTTP 500'))),
    );
  });

  test('JSON 이 아닌 응답은 해석 불가 오류', () async {
    final client = clientFor(MockClient((_) async => http.Response('<html>', 502)));
    await expectLater(
      client.getJson('/x'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 502)),
    );
  });

  test('연결 실패는 서버 주소를 포함한 안내로 바뀐다', () async {
    final client = clientFor(MockClient((_) async => throw http.ClientException('refused')));
    await expectLater(
      client.getJson('/x'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', contains('http://localhost:3000'))),
    );
  });

  test('시간 초과는 안내 문구로 바뀐다', () async {
    final client = clientFor(
      MockClient((_) => Completer<http.Response>().future),
      timeout: const Duration(milliseconds: 20),
    );
    await expectLater(
      client.getJson('/x'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', contains('너무 늦습니다'))),
    );
  });

  test('AppConfig.normalizeBaseUrl 은 끝의 / 를 제거한다', () {
    expect(AppConfig.normalizeBaseUrl('https://api.example.com///'), 'https://api.example.com');
    expect(AppConfig.normalizeBaseUrl(' http://localhost:3000 '), 'http://localhost:3000');
  });
}
