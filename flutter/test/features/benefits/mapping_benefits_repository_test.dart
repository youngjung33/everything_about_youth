import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/features/benefits/data/mapping_benefits_repository.dart';
import 'package:everything_about_youth/features/benefits/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/failures.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_filters.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_program.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/benefits_fixtures.dart';

void main() {
  group('MappingBenefitsRepository', () {
    test('404 는 BenefitsProgramNotFound', () async {
      final inner = FakeBenefitsRepository();
      final repo = MappingBenefitsRepository(inner);
      await expectLater(
        repo.getProgram('missing', profile: ApplicantProfile.empty),
        throwsA(isA<BenefitsProgramNotFound>()),
      );
    });

    test('programNotFound 코드도 BenefitsProgramNotFound', () async {
      final inner = FakeBenefitsRepository(
        searchError: const ApiException('x', statusCode: 404, code: ApiErrorCode.programNotFound),
      );
      final repo = MappingBenefitsRepository(inner);
      await expectLater(
        repo.searchPrograms(filters: BenefitFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<BenefitsProgramNotFound>()),
      );
    });

    test('기타 ApiException 은 BenefitsUserMessage', () async {
      final inner = FakeBenefitsRepository(searchError: const ApiException('한도', statusCode: 400));
      final repo = MappingBenefitsRepository(inner);
      await expectLater(
        repo.searchPrograms(filters: BenefitFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<BenefitsUserMessage>().having((e) => e.message, 'message', '한도')),
      );
    });

    test('saveProgram 실패도 BenefitsUserMessage', () async {
      final inner = FakeBenefitsRepository(saveError: const ApiException('저장 불가'));
      final repo = MappingBenefitsRepository(inner);
      await expectLater(repo.saveProgram('n1'), throwsA(isA<BenefitsUserMessage>()));
    });

    test('fetchMeta·mergeSaved·unsave·fetchSaved 실패도 BenefitsUserMessage', () async {
      var inner = FakeBenefitsRepository(fetchMetaError: const ApiException('meta fail'));
      var repo = MappingBenefitsRepository(inner);
      await expectLater(repo.fetchMeta(), throwsA(isA<BenefitsUserMessage>().having((e) => e.message, 'msg', 'meta fail')));

      inner = FakeBenefitsRepository(mergeError: const ApiException('merge fail'));
      repo = MappingBenefitsRepository(inner);
      await expectLater(repo.mergeSaved(['a']), throwsA(isA<BenefitsUserMessage>()));

      inner = FakeBenefitsRepository(unsaveError: const ApiException('unsave fail'));
      repo = MappingBenefitsRepository(inner);
      await expectLater(repo.unsaveProgram('a'), throwsA(isA<BenefitsUserMessage>()));

      inner = FakeBenefitsRepository(fetchSavedError: const ApiException('saved list fail'));
      repo = MappingBenefitsRepository(inner);
      await expectLater(
        repo.fetchSaved(profile: ApplicantProfile.empty),
        throwsA(isA<BenefitsUserMessage>()),
      );
    });
  });
}
