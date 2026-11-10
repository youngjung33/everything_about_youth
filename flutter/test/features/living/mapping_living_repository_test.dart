import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/features/living/data/mapping_living_repository.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/failures.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/living_fixtures.dart';

void main() {
  group('MappingLivingRepository', () {
    test('404 는 LivingGuideNotFound', () async {
      final inner = FakeLivingRepository();
      final repo = MappingLivingRepository(inner);
      await expectLater(
        repo.getGuide('missing', profile: ApplicantProfile.empty),
        throwsA(isA<LivingGuideNotFound>()),
      );
    });

    test('schemeNotFound 코드도 LivingGuideNotFound', () async {
      final inner = FakeLivingRepository(
        searchError: const ApiException('x', statusCode: 404, code: ApiErrorCode.schemeNotFound),
      );
      final repo = MappingLivingRepository(inner);
      await expectLater(
        repo.searchGuides(filters: LivingFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<LivingGuideNotFound>()),
      );
    });

    test('기타 ApiException 은 LivingUserMessage', () async {
      final inner = FakeLivingRepository(searchError: const ApiException('한도', statusCode: 400));
      final repo = MappingLivingRepository(inner);
      await expectLater(
        repo.searchGuides(filters: LivingFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<LivingUserMessage>().having((e) => e.message, 'message', '한도')),
      );
    });

    test('saveGuide 실패도 LivingUserMessage', () async {
      final inner = FakeLivingRepository(saveError: const ApiException('저장 불가'));
      final repo = MappingLivingRepository(inner);
      await expectLater(repo.saveGuide('n1'), throwsA(isA<LivingUserMessage>()));
    });

    test('fetchMeta·mergeSaved·unsave·fetchSaved 실패도 LivingUserMessage', () async {
      var inner = FakeLivingRepository(fetchMetaError: const ApiException('meta fail'));
      var repo = MappingLivingRepository(inner);
      await expectLater(repo.fetchMeta(), throwsA(isA<LivingUserMessage>().having((e) => e.message, 'msg', 'meta fail')));

      inner = FakeLivingRepository(mergeError: const ApiException('merge fail'));
      repo = MappingLivingRepository(inner);
      await expectLater(repo.mergeSaved(['a']), throwsA(isA<LivingUserMessage>()));

      inner = FakeLivingRepository(unsaveError: const ApiException('unsave fail'));
      repo = MappingLivingRepository(inner);
      await expectLater(repo.unsaveGuide('a'), throwsA(isA<LivingUserMessage>()));

      inner = FakeLivingRepository(fetchSavedError: const ApiException('saved list fail'));
      repo = MappingLivingRepository(inner);
      await expectLater(
        repo.fetchSaved(profile: ApplicantProfile.empty),
        throwsA(isA<LivingUserMessage>()),
      );
    });
  });
}
