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
  });
}
