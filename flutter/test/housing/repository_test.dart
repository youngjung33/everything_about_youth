import 'dart:convert';

import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/housing/data/api_housing_repository.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../support/fixtures.dart';

void main() {
  late List<Uri> requests;
  late ApiHousingRepository repo;

  setUp(() {
    requests = [];
    repo = ApiHousingRepository(
      ApiClient(
        baseUrl: 'http://localhost:3000',
        httpClient: MockClient((request) async {
          requests.add(request.url);
          final Object body = switch (request.url.path) {
            '/api/v1/housing/meta' => metaJson(),
            '/api/v1/housing/notices' => pageJson(items: [summaryJson()]),
            _ => detailJson(),
          };
          return http.Response.bytes(utf8.encode(jsonEncode(body)), 200);
        }),
      ),
    );
  });

  test('메타 조회', () async {
    final meta = await repo.fetchMeta();
    expect(requests.single.path, '/api/v1/housing/meta');
    expect(meta.sidos, contains('서울특별시'));
  });

  test('목록 조회: 필터, 내 조건, 페이지를 한 쿼리로 보낸다', () async {
    final filters = const HousingFilters().copyWith(
      sidos: {'서울특별시'},
      supplyTypes: {'happy'},
      maxDepositMan: () => 5000,
      verdicts: {'eligible'},
    );
    const profile = ApplicantProfile(age: 29, isHomeless: true);

    final page = await repo.searchNotices(filters: filters, profile: profile, page: 2);

    final q = requests.single.queryParametersAll;
    expect(requests.single.path, '/api/v1/housing/notices');
    expect(q['sido'], ['서울특별시']);
    expect(q['supply'], ['happy']);
    expect(q['status'], unorderedEquals(['open', 'upcoming']));
    expect(q['maxDeposit'], ['5000']);
    expect(q['v'], ['eligible']);
    expect(q['age'], ['29']);
    expect(q['home'], ['y']);
    expect(q['page'], ['2']);
    expect(q['pageSize'], ['20']);
    expect(q.containsKey('married'), isFalse);
    expect(page.items.single.id, 'n1');
  });

  test('상세 조회: id 를 경로에 인코딩하고 내 조건을 쿼리로 보낸다', () async {
    final detail = await repo.getNotice('lh:1 2', profile: const ApplicantProfile(age: 30));
    expect(requests.single.path, '/api/v1/housing/notices/lh%3A1%202');
    expect(requests.single.queryParameters['age'], '30');
    expect(detail.complexes, isNotEmpty);
    expect(detail.googleCalendarUrl, contains('calendar.google.com'));
  });

  test('관심 공고: 저장·합치기·목록·해제를 호출한다', () async {
    late http.BaseRequest sent;
    repo = ApiHousingRepository(
      ApiClient(
        baseUrl: 'http://localhost:3000',
        httpClient: MockClient((request) async {
          sent = request;
          requests.add(request.url);
          final Object body = switch (request.method) {
            'PUT' when request.url.path.endsWith('/saved') => {
              'ids': ['n1', 'n2'],
            },
            'GET' when request.url.path.endsWith('/saved/ids') => {
              'ids': ['n1'],
            },
            'GET' when request.url.path.endsWith('/saved') => {
              'items': [summaryJson()],
              'total': 1,
              'today': '2026-10-13',
            },
            _ => {'saved': true},
          };
          return http.Response.bytes(utf8.encode(jsonEncode(body)), 200);
        }),
      ),
    );

    expect(await repo.mergeSaved(['n1', 'n2']), ['n1', 'n2']);
    expect(sent.method, 'PUT');
    expect(requests.last.path, '/api/v1/housing/saved');

    expect(await repo.fetchSavedIds(), ['n1']);
    expect(requests.last.path, '/api/v1/housing/saved/ids');

    final list = await repo.fetchSaved(profile: const ApplicantProfile(age: 29));
    expect(list.total, 1);
    expect(requests.last.queryParameters['age'], '29');

    await repo.saveNotice('lh:1 2');
    expect(sent.method, 'PUT');
    expect(requests.last.path, '/api/v1/housing/saved/lh%3A1%202');

    await repo.unsaveNotice('lh:1 2');
    expect(sent.method, 'DELETE');
    expect(requests.last.path, '/api/v1/housing/saved/lh%3A1%202');
  });

  group('API 오류', () {
    test('404 는 ApiException isNotFound', () async {
      repo = ApiHousingRepository(
        ApiClient(
          baseUrl: 'http://localhost:3000',
          httpClient: MockClient((request) async => http.Response('{"error":{"code":"NOTICE_NOT_FOUND"}}', 404)),
        ),
      );
      await expectLater(
        repo.getNotice('nope', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>().having((e) => e.isNotFound, 'notFound', isTrue)),
      );
    });

    test('500 응답은 ApiException', () async {
      repo = ApiHousingRepository(
        ApiClient(
          baseUrl: 'http://localhost:3000',
          httpClient: MockClient((request) async => http.Response('{"error":{"message":"fail"}}', 500)),
        ),
      );
      await expectLater(repo.fetchMeta(), throwsA(isA<ApiException>()));
    });

    test('잘못된 JSON 은 badResponse', () async {
      repo = ApiHousingRepository(
        ApiClient(
          baseUrl: 'http://localhost:3000',
          httpClient: MockClient((request) async => http.Response('not json', 200)),
        ),
      );
      await expectLater(repo.fetchMeta(), throwsA(isA<ApiException>()));
    });
  });
}
