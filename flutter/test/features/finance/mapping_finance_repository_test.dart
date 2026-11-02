import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/features/finance/data/mapping_finance_repository.dart';
import 'package:everything_about_youth/features/finance/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/finance/domain/failures.dart';
import 'package:everything_about_youth/features/finance/domain/finance_filters.dart';
import 'package:everything_about_youth/features/finance/domain/finance_scheme.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/finance_fixtures.dart';

void main() {
  group('MappingFinanceRepository', () {
    test('404 는 FinanceSchemeNotFound', () async {
      final inner = FakeFinanceRepository();
      final repo = MappingFinanceRepository(inner);
      await expectLater(
        repo.getScheme('missing', profile: ApplicantProfile.empty),
        throwsA(isA<FinanceSchemeNotFound>()),
      );
    });

    test('schemeNotFound 코드도 FinanceSchemeNotFound', () async {
      final inner = FakeFinanceRepository(
        searchError: const ApiException('x', statusCode: 404, code: ApiErrorCode.schemeNotFound),
      );
      final repo = MappingFinanceRepository(inner);
      await expectLater(
        repo.searchSchemes(filters: FinanceFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<FinanceSchemeNotFound>()),
      );
    });

    test('기타 ApiException 은 FinanceUserMessage', () async {
      final inner = FakeFinanceRepository(searchError: const ApiException('한도', statusCode: 400));
      final repo = MappingFinanceRepository(inner);
      await expectLater(
        repo.searchSchemes(filters: FinanceFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<FinanceUserMessage>().having((e) => e.message, 'message', '한도')),
      );
    });

    test('saveScheme 실패도 FinanceUserMessage', () async {
      final inner = FakeFinanceRepository(saveError: const ApiException('저장 불가'));
      final repo = MappingFinanceRepository(inner);
      await expectLater(repo.saveScheme('n1'), throwsA(isA<FinanceUserMessage>()));
    });

    test('fetchMeta·mergeSaved·unsave·fetchSaved 실패도 FinanceUserMessage', () async {
      var inner = FakeFinanceRepository(fetchMetaError: const ApiException('meta fail'));
      var repo = MappingFinanceRepository(inner);
      await expectLater(repo.fetchMeta(), throwsA(isA<FinanceUserMessage>().having((e) => e.message, 'msg', 'meta fail')));

      inner = FakeFinanceRepository(mergeError: const ApiException('merge fail'));
      repo = MappingFinanceRepository(inner);
      await expectLater(repo.mergeSaved(['a']), throwsA(isA<FinanceUserMessage>()));

      inner = FakeFinanceRepository(unsaveError: const ApiException('unsave fail'));
      repo = MappingFinanceRepository(inner);
      await expectLater(repo.unsaveScheme('a'), throwsA(isA<FinanceUserMessage>()));

      inner = FakeFinanceRepository(fetchSavedError: const ApiException('saved list fail'));
      repo = MappingFinanceRepository(inner);
      await expectLater(
        repo.fetchSaved(profile: ApplicantProfile.empty),
        throwsA(isA<FinanceUserMessage>()),
      );
    });
  });
}
